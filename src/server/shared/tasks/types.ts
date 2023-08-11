import type { LogicApi } from "@/server/shared/api/logic";
import type { Firehose } from "@/server/shared/firehose/api";
import type { IdGenerator } from "@/server/shared/ids/generator";
import type { BDB } from "@/server/shared/storage";
import type { RecursiveJSONable } from "@/shared/util/type_helpers";

export interface TaskProcessorDeps {
  db: BDB;
  firehose: Firehose;
  idGenerator: IdGenerator;
  logicApi: LogicApi;
}
export interface TaskProcessorContext {
  taskId: string;
  deps: TaskProcessorDeps;
  attemptNumber: number;
}

export const DONE_TASK = { __specialMarker: "imdone" };
export type DoneTaskIndicator = typeof DONE_TASK;

export function isDone(
  t: Awaited<ReturnType<TaskNode["run"]>>
): t is DoneTaskIndicator {
  return (t as DoneTaskIndicator).__specialMarker == DONE_TASK.__specialMarker;
}

export interface TaskRetryPolicy {
  maxAttempts?: number;
  baseMs?: number;
  maxMs?: number;
  timeoutMs?: number;
  exponent?: number;
}

export interface TaskNode {
  serialize(): string;
  run(): Promise<TaskNode | DoneTaskIndicator>;
  retryPolicy?: () => TaskRetryPolicy | undefined;
}

export abstract class JSONTaskNode<S extends RecursiveJSONable<S>>
  implements TaskNode
{
  constructor(public context: TaskProcessorContext, public state: S) {}
  static deserialize(serializedState: string) {
    return JSON.parse(serializedState);
  }
  serialize() {
    return JSON.stringify(this.state);
  }
  retryPolicy(): TaskRetryPolicy | undefined {
    return undefined;
  }

  abstract run(): Promise<TaskNode | DoneTaskIndicator>;
}

export interface TaskClassRef {
  new (context: TaskProcessorContext, state: any): TaskNode;
  stableName: string;
  deserialize(serializedState: string): any;
}

export type GraphTaskNode<T extends GraphTaskList> = InstanceType<T[number]>;
export type GraphTaskList = readonly TaskClassRef[];
