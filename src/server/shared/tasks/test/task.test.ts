import { InMemoryFirehose } from "@/server/shared/firehose/memory";
import { DbIdGenerator } from "@/server/shared/ids/generator";
import type { BDB, ServerTasksSchema } from "@/server/shared/storage";
import type { CollectionReference } from "@/server/shared/storage/schema";
import {
  TaskAlreadyCompleteError,
  TaskPermanentFailure,
  UnregisteredTaskError,
} from "@/server/shared/tasks/errors";
import { evaluateRetryPolicy } from "@/server/shared/tasks/processor";
import type {
  DoneTaskIndicator,
  GraphTaskNode,
} from "@/server/shared/tasks/types";
import { DONE_TASK, JSONTaskNode } from "@/server/shared/tasks/types";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { InMemoryWorld } from "@/server/shared/world/shim/in_memory_world";
import {
  TestLogicApi,
  newTaskProcessor,
  newTestDB,
} from "@/server/test/test_helpers";
import { scanAvailableTasks } from "@/server/web/db/tasks";
import { attemptTaskThroughSerialization } from "@/server/web/test/test_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert from "assert";

export class PermafailTask extends JSONTaskNode<{}> {
  static stableName = "bbq";
  async run(): Promise<TestTaskNode | { __specialMarker: string }> {
    throw new TaskPermanentFailure();
  }
}

export class FailsUntilAttempt2 extends JSONTaskNode<{}> {
  static stableName = "fail_attempt_2";
  async run(): Promise<DoneTaskIndicator> {
    if (this.context.attemptNumber < 2) {
      throw new Error("Some transient failure");
    }
    return DONE_TASK;
  }
}

export class TwoStageBegin extends JSONTaskNode<{
  shouldSucceed: boolean;
}> {
  static stableName = "two_stage_begin";
  async run(): Promise<TestTaskNode> {
    return new TwoStageSuccessFinish(this.context, this.state);
  }
}

export class TwoStageSuccessFinish extends JSONTaskNode<{
  shouldSucceed: boolean;
}> {
  static stableName = "two_stage_finish";
  async run(): Promise<DoneTaskIndicator> {
    if (this.state.shouldSucceed) {
      return DONE_TASK;
    } else {
      throw new TaskPermanentFailure();
    }
  }
}

export const testTaskGraph = [
  PermafailTask,
  FailsUntilAttempt2,
  TwoStageBegin,
  TwoStageSuccessFinish,
] as const;
export type TestTaskNode = GraphTaskNode<typeof testTaskGraph>;

async function prepareTestTaskProcessor(voxeloo: VoxelooModule) {
  const db = await newTestDB();
  const world = new InMemoryWorld();
  const logicApi = new TestLogicApi(voxeloo, world);
  const firehose = new InMemoryFirehose();
  const taskProcessor = await newTaskProcessor(
    db,
    new DbIdGenerator(db),
    firehose,
    logicApi,
    testTaskGraph
  );

  return taskProcessor;
}

async function clearDBTasks(db: BDB) {
  const allTasks = await db.collection("server-tasks-dev").get();
  for (const task of allTasks.docs) {
    await task.ref.delete();
  }
}

describe("Task Processing", () => {
  let voxeloo!: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  let taskProcessor: Awaited<ReturnType<typeof prepareTestTaskProcessor>>;
  let db: BDB;
  beforeEach(async () => {
    taskProcessor = await prepareTestTaskProcessor(voxeloo);
    db = taskProcessor.deps.db;
  });
  afterEach(async () => {
    await clearDBTasks(db);
  });

  describe("enqueue", () => {
    it("should reject unknown tasks", async () => {
      await assert.rejects(
        async () =>
          taskProcessor.enqueue(
            "bbq",
            "Testeeee" as unknown as any,
            "bbq" as unknown as any
          ),
        UnregisteredTaskError
      );
    });

    it("should reject double enqueues", async () => {
      const sameId = "123";
      await taskProcessor.enqueue(sameId, PermafailTask, {});
      await assert.rejects(async () => {
        await taskProcessor.enqueue(sameId, PermafailTask, {});
      });
    });

    it("should enqueue a task in the DB", async () => {
      const sameId = "neato-burrito";
      await taskProcessor.enqueue(sameId, PermafailTask, {});
      const doc = await db.collection("server-tasks-dev").doc(sameId).get();
      assert.ok(doc.exists);
      const docData = doc.data()!;
      assert.strictEqual(docData.finished, false);
      assert.strictEqual(docData.processorId, undefined);
      assert.strictEqual(docData.processorExpiry, 0);
      assert.strictEqual(docData.finishReason, "none");
      assert.strictEqual(docData.taskNodeName, PermafailTask.stableName);
      assert.strictEqual(docData.taskNodeFailureCount, 0);
      assert.strictEqual(docData.taskNodeAvailableStartTime, 0);
    });

    it("should be scanned by our scanner task", async () => {
      const sameId = "neato-burrito";
      await taskProcessor.enqueue(sameId, PermafailTask, {});
      const tasks = await scanAvailableTasks(
        db.collection(
          "server-tasks-dev"
        ) as CollectionReference<ServerTasksSchema>
      );
      assert.strictEqual(tasks.length, 1);
    });
  });

  describe("Retry logic", () => {
    it("should respect permanent failures", async () => {
      await taskProcessor.enqueue("id", PermafailTask, {});
      await assert.rejects(
        taskProcessor.attemptTask("id", () => true),
        TaskPermanentFailure
      );
    });

    it("should not process something that's already finished", async () => {
      await taskProcessor.enqueue("id", PermafailTask, {});
      try {
        await taskProcessor.attemptTask("id", () => true);
      } catch (error) {}

      await assert.rejects(
        taskProcessor.attemptTask("id", () => true),
        TaskAlreadyCompleteError
      );
    });

    it("should retry transient failures and record backoff", async () => {
      const tid = "fail2";
      await taskProcessor.enqueue(tid, FailsUntilAttempt2, {});
      await assert.rejects(taskProcessor.attemptTask(tid, () => true));

      const doc = await db.collection("server-tasks-dev").doc(tid).get();
      const firstAvailableStart = doc.data()!.taskNodeAvailableStartTime;
      assert.ok(firstAvailableStart > Date.now());

      await assert.rejects(taskProcessor.attemptTask(tid, () => true));

      const ret = await taskProcessor.attemptTask(tid, () => true);
      assert.strictEqual(ret.isDone, true);
    });
  });

  describe("retry policy", () => {
    it("should have exponential behavior", async () => {
      const retry = evaluateRetryPolicy(
        {
          baseMs: 100,
          exponent: 2,
        },
        2,
        0
      );
      assert.deepEqual(retry, [true, 400]);
    });

    it("should hit max attempts", async () => {
      const retry = evaluateRetryPolicy(
        {
          baseMs: 100,
          exponent: 2,
          maxAttempts: 30,
        },
        40,
        0
      );
      assert.deepEqual(retry, [false, 0]);
    });

    it("should hit max timeout", async () => {
      const retry = evaluateRetryPolicy(
        {
          baseMs: 100,
          exponent: 2,
          timeoutMs: 1000,
        },
        40,
        0
      );
      assert.deepEqual(retry, [false, 0]);
    });
  });

  describe("Execution", () => {
    it("should be able to execute a complex graph while restoring from DB", async () => {
      await taskProcessor.enqueue("id", TwoStageBegin, {
        shouldSucceed: true,
      });

      const ret = await taskProcessor.attemptTask("id", () => true);
      assert.ok(ret.isDone);
    });
    it("should be able to execute a complex graph while in memory", async () => {
      await taskProcessor.enqueue("id", TwoStageBegin, {
        shouldSucceed: true,
      });
      const ret = await attemptTaskThroughSerialization(taskProcessor, "id");
      assert.ok(ret.isDone);
    });
    it("should be able to execute a complex graph ending in failure", async () => {
      await taskProcessor.enqueue("id", TwoStageBegin, {
        shouldSucceed: false,
      });

      await assert.rejects(
        taskProcessor.attemptTask("id", () => true),
        TaskPermanentFailure
      );
    });
  });
});
