import { log } from "@/shared/logging";
import { sleep } from "@/shared/util/async";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { EventEmitter } from "events";
import type TypedEventEmitter from "typed-emitter";

export type TaskStatusEvents = {
  onProgressChange: (status: string) => void;
  onFailure: (error: any) => void;
  onSuccess: () => void;
  onStatusChange: () => void;
};

export type TaskInitStatus = {
  kind: "init";
};

export type TaskProgressStatus = {
  kind: "progress";
  statusText: string;
};

export type TaskSuccessStatus = {
  kind: "success";
};

export type TaskErrorStatus = {
  kind: "error";
  error: any;
};

export type TaskStatus =
  | TaskInitStatus
  | TaskProgressStatus
  | TaskSuccessStatus
  | TaskErrorStatus;

export type AsyncTaskViewMetadata = {
  title?: string;
};

export interface AsyncTask {
  emitter: TypedEventEmitter<TaskStatusEvents>;
  viewMetadata: AsyncTaskViewMetadata;
  status: TaskStatus;
  attempt: () => Promise<void>;
}

export abstract class StateMachineTask implements AsyncTask {
  emitter = new EventEmitter() as TypedEventEmitter<TaskStatusEvents>;
  status: TaskStatus = { kind: "init" };
  viewMetadata: AsyncTaskViewMetadata = {};

  protected attemptPromise?: Promise<void>;

  async attempt(): Promise<void> {
    if (this.attemptPromise) {
      return this.attemptPromise;
    } else if (this.status.kind === "success") {
      return;
    } else {
      this.attemptPromise = (async () => {
        this.setStatus({
          kind: "progress",
          statusText: "Starting",
        });
        try {
          while (!this.done()) {
            await this.step();
          }
        } catch (error: any) {
          this.attemptPromise = undefined;
          throw error;
        }
      })()
        .catch((error: any) => {
          this.setStatus({
            kind: "error",
            error,
          });
          log.error("Error in background task", {
            error,
          });
        })
        .then(() => {
          this.setStatus({
            kind: "success",
          });
        });
      return this.attemptPromise;
    }
  }

  abstract step(): Promise<void>;
  abstract done(): boolean;

  setStatus(newStatus: TaskStatus) {
    this.status = newStatus;
    this.emitter.emit("onStatusChange");
    switch (this.status.kind) {
      case "success":
        this.emitter.emit("onSuccess");
        break;
      case "progress":
        this.emitter.emit("onProgressChange", this.status.statusText);
        break;
      case "error":
        this.emitter.emit("onFailure", this.status.error);
        break;
      case "init":
        break;
      default:
        assertNever(this.status);
    }
  }

  setProgress(status: string) {
    ok(
      this.status.kind === "progress",
      "Tried to set progress when not already in progress"
    );
    this.setStatus({
      kind: "progress",
      statusText: status,
    });
  }
}

export class TestTask extends StateMachineTask {
  finished = false;
  constructor(private timeout: number, private endWithError?: any) {
    super();
  }
  async step() {
    this.setStatus({
      kind: "progress",
      statusText: "Starting stuff",
    });
    await sleep(this.timeout);
    if (this.endWithError !== undefined) {
      throw this.endWithError;
    }
    this.finished = true;
  }
  done() {
    return this.finished;
  }
}

export async function delegateTaskAttempt(
  baseTask: StateMachineTask,
  delegatedTask: StateMachineTask
) {
  const wrapStatusUpdate = (status: string) => baseTask.setProgress(status);
  delegatedTask.emitter.on("onProgressChange", wrapStatusUpdate);
  try {
    await delegatedTask.attempt();
  } finally {
    delegatedTask.emitter.removeListener("onProgressChange", wrapStatusUpdate);
  }
}
