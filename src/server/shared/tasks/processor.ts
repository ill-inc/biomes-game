import type { ServerTasksSchema } from "@/server/shared/storage";
import type { CollectionReference } from "@/server/shared/storage/schema";
import {
  TaskAlreadyCompleteError,
  TaskBeingProcessedError,
  TaskLostLockError,
  TaskNoExistError,
  TaskPermanentFailure,
  UnregisteredTaskError,
} from "@/server/shared/tasks/errors";
import type {
  DoneTaskIndicator,
  GraphTaskList,
  TaskNode,
  TaskProcessorContext,
  TaskProcessorDeps,
  TaskRetryPolicy,
} from "@/server/shared/tasks/types";
import { isDone } from "@/server/shared/tasks/types";
import type {
  FirestoreServerTask,
  FirestoreServerTaskLogItem,
} from "@/server/web/db/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { autoId } from "@/shared/util/auto_id";
import { messageFromError } from "@/shared/util/helpers";
import { ok } from "assert";
import { v4 } from "uuid";

export function evaluateRetryPolicy(
  retryPolicy: TaskRetryPolicy,
  attemptNumber: number,
  startTime: number
): [canRetry: boolean, delay: number] {
  if (retryPolicy.maxAttempts && attemptNumber >= retryPolicy.maxAttempts) {
    return [false, 0];
  } else if (
    retryPolicy.timeoutMs &&
    Date.now() - startTime > retryPolicy.timeoutMs
  ) {
    return [false, 0];
  }

  return [
    true,
    Math.min(
      retryPolicy.maxMs ?? 1000 * 60 * 60,
      (retryPolicy.baseMs ?? 500) *
        (retryPolicy.exponent ?? 1.5) ** attemptNumber
    ),
  ];
}

export class TaskProcessor<Graph extends GraphTaskList> {
  taskNodeTypeToClass: Map<string, Graph[number]>;
  taskClassToNodeType: Map<Graph[number], string>;
  defaultRetryPolicy: TaskRetryPolicy = {
    baseMs: 500,
    exponent: 2,
  };

  constructor(
    public deps: TaskProcessorDeps,
    graph: Graph,
    public taskTable: CollectionReference<ServerTasksSchema>
  ) {
    this.taskNodeTypeToClass = new Map(graph.map((e) => [e.stableName, e]));
    this.taskClassToNodeType = new Map(graph.map((e) => [e, e.stableName]));
  }

  private taskProcessorContext(
    taskId: string,
    attemptNumber: number
  ): TaskProcessorContext {
    return {
      taskId,
      deps: this.deps,
      attemptNumber,
    };
  }

  private async releaseLockAndWriteMetadata(
    taskId: string,
    processorId: string,
    transactionDocUpdates?: (
      transactionDocData: FirestoreServerTask
    ) => Partial<FirestoreServerTask>
  ) {
    const taskDocRef = this.docRefForTaskId(taskId);
    await this.deps.db.runTransaction(async (t) => {
      const taskDoc = await t.get(taskDocRef);
      const stillHoldTheLock =
        taskDoc.data()!.processorId === processorId ||
        taskDoc.data()!.processorExpiry > Date.now();

      if (stillHoldTheLock) {
        const taskUpdates: Partial<FirestoreServerTask> = {
          processorId: undefined,
          processorExpiry: 0,
          ...transactionDocUpdates?.(taskDoc.data()!),
        };

        t.update(taskDocRef, taskUpdates);
      }
    });
  }

  private docRefForTaskId(taskId: string) {
    return this.taskTable.doc(taskId);
  }

  private stableNameForTaskNode(taskNode: TaskNode | DoneTaskIndicator) {
    if (isDone(taskNode)) {
      return "__DONE";
    }

    const newTaskNodeName = this.taskClassToNodeType.get(
      taskNode.constructor as any // this is bit dangerous but I can't find a way of enforcing these classes have a static name property
    );

    if (!newTaskNodeName) {
      throw new UnregisteredTaskError(
        `New task type is unregistered in graph ${taskNode.constructor.name}`
      );
    }

    return newTaskNodeName;
  }

  async addToEventLog(
    taskId: string,
    logRecord: Omit<FirestoreServerTaskLogItem, "timestamp">
  ) {
    const taskDocRef = this.docRefForTaskId(taskId);
    await taskDocRef
      .collection("server-task-events")
      .doc(autoId())
      .set({
        ...logRecord,
        timestamp: Date.now(),
      });
  }

  async enqueue<T extends Graph[number]>(
    id: string,
    classType: T,
    startState: ConstructorParameters<T>[1],
    metadata: {
      originUserId?: BiomesId;
    } = {}
  ) {
    // Throws if already exists
    const taskClass = this.taskNodeTypeToClass.get(classType.stableName);
    if (!taskClass) {
      throw new UnregisteredTaskError(`Unknown task type ${taskClass}`);
    }

    const task = new taskClass(this.taskProcessorContext(id, 0), startState);
    const docRef = this.docRefForTaskId(id);
    await docRef.create({
      id: id,
      originUserId: metadata.originUserId,
      taskNodeName: classType.stableName,
      taskNodeFailureCount: 0,
      createdAt: Date.now(),
      taskNodeStartTime: Date.now(),
      finished: false,
      taskNodeSerializedState: task.serialize(),
      processorExpiry: 0,
      taskNodeAvailableStartTime: 0,
      finishReason: "none",
    });
  }

  async attemptTask(taskId: string, shouldContinue: () => boolean) {
    const taskDocRef = this.docRefForTaskId(taskId);
    const processorId = v4();
    const now = Date.now();
    const expiryTTLMs = 1000 * 60 * 10;

    const dbTask = await this.deps.db.runTransaction(async (t) => {
      const taskDoc = await t.get(taskDocRef);
      if (!taskDoc.exists) {
        throw new TaskNoExistError();
      }
      if (taskDoc.data()!.finished) {
        throw new TaskAlreadyCompleteError();
      }

      if (taskDoc.data()!.processorExpiry >= now) {
        throw new TaskBeingProcessedError();
      }

      const updatedData: Partial<FirestoreServerTask> = {
        processorExpiry: now + expiryTTLMs,
        processorId,
      };

      t.update(taskDocRef, updatedData);
      return {
        ...taskDoc.data()!,
        ...updatedData,
      };
    });

    const taskRegistryItem = this.taskNodeTypeToClass.get(dbTask.taskNodeName);
    if (!taskRegistryItem) {
      throw new UnregisteredTaskError(
        `Task in database is unregistered in graph '${dbTask.taskNodeName}'`
      );
    }
    const context = this.taskProcessorContext(
      taskId,
      dbTask.taskNodeFailureCount
    );
    const state = taskRegistryItem.deserialize(dbTask.taskNodeSerializedState);
    let taskNode: TaskNode | DoneTaskIndicator = new taskRegistryItem(
      context,
      state
    );

    while (taskNode && !isDone(taskNode) && shouldContinue()) {
      try {
        void this.addToEventLog(taskId, {
          kind: "attempt_start",
          taskNodeName: this.stableNameForTaskNode(taskNode),
          processorId,
          taskSerializedState: taskNode.serialize(),
          attemptNumber: dbTask.taskNodeFailureCount,
        });
        taskNode = await taskNode.run();
        context.attemptNumber = 0;
      } catch (error: any) {
        // If we have an error, we should release the lock
        void this.releaseLockAndWriteMetadata(taskId, processorId, (data) => {
          const failureCount = data.taskNodeFailureCount + 1;
          ok(!isDone(taskNode), "Can't reach this state");
          const [canRetry, delay] = evaluateRetryPolicy(
            taskNode.retryPolicy?.() ?? this.defaultRetryPolicy,
            failureCount - 1,
            data.taskNodeStartTime
          );

          if (error instanceof TaskPermanentFailure) {
            log.error(
              "Received a permanent failure during task run, eagerly marking task failed in DB"
            );
            void this.addToEventLog(taskId, {
              kind: "attempt_error",
              taskNodeName: this.stableNameForTaskNode(taskNode),
              taskSerializedState: taskNode.serialize(),
              memo: "Permanent failure from task",
              attemptNumber: failureCount - 1,
            });
            return {
              finished: true,
              finishReason: "fail_permanent",
              taskNodeFailureCount: failureCount,
            };
          } else if (!canRetry) {
            void this.addToEventLog(taskId, {
              kind: "attempt_error",
              taskNodeName: this.stableNameForTaskNode(taskNode),
              taskSerializedState: taskNode.serialize(),
              memo: "Hit retry limit for task",
              attemptNumber: failureCount - 1,
            });
            return {
              finished: true,
              finishReason: "fail_too_many_retries",
              taskNodeFailureCount: failureCount,
            };
          } else {
            void this.addToEventLog(taskId, {
              kind: "attempt_error",
              taskNodeName: this.stableNameForTaskNode(taskNode),
              taskSerializedState: taskNode.serialize(),
              memo: messageFromError(error),
              attemptNumber: failureCount - 1,
            });
            return {
              taskNodeFailureCount: failureCount,
              taskNodeAvailableStartTime: Date.now() + delay,
            };
          }
        });

        throw error;
      }

      const newTaskNodeName = this.stableNameForTaskNode(taskNode);
      // Otherwise write the state and extend the lease
      await this.deps.db.runTransaction(async (t) => {
        const taskDoc = await t.get(taskDocRef);
        if (taskDoc.data()!.processorId !== processorId) {
          throw new TaskLostLockError();
        }

        if (isDone(taskNode)) {
          t.update(taskDocRef, {
            taskNodeStartTime: Date.now(),
            processorExpiry: Date.now(),
            finished: true,
            finishReason: "success",
          });
        } else {
          t.update(taskDocRef, {
            // Need to update the task node name
            taskNodeName: newTaskNodeName,
            taskNodeSerializedState: taskNode.serialize(),
            taskNodeStartTime: Date.now(),
            processorExpiry: Date.now() + expiryTTLMs,
            taskNodeAvailableStartTime: 0,
          });
        }
      });
    }

    // Release the lock if we are midway through
    if (!shouldContinue() && !isDone(taskNode)) {
      void this.releaseLockAndWriteMetadata(taskId, processorId);
    } else if (isDone(taskNode)) {
      void this.addToEventLog(taskId, {
        kind: "finished",
        taskNodeName: this.stableNameForTaskNode(taskNode),
      });
    }

    return {
      isDone: isDone(taskNode),
    };
  }
}
