import {
  TaskAlreadyCompleteError,
  TaskBeingProcessedError,
} from "@/server/shared/tasks/errors";
import type { ServerTaskProcessor } from "@/server/shared/tasks/server_tasks/server_task_processor";
import type { TaskServerContext } from "@/server/task/context";
import { scanAvailableTasks } from "@/server/web/db/tasks";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { autoId } from "@/shared/util/auto_id";

export class TaskServer {
  private readonly id = autoId();
  private timeout?: NodeJS.Timeout;
  private stopped = true;

  constructor(private readonly serverTaskProcessor: ServerTaskProcessor) {}

  async start() {
    if (this.timeout) {
      return;
    }
    this.stopped = false;
    // We don't use setInterval as this permits dynamic tick interval configuration.
    this.timeout = setTimeout(
      () => this.tick(),
      CONFIG.taskServerTickIntervalMs
    );
    log.info("Starting task server...");
  }

  private tick() {
    if (!this.timeout) {
      return;
    }

    void this.scheduleEligibleTasks();

    this.timeout = setTimeout(
      () => this.tick(),
      CONFIG.taskServerTickIntervalMs
    );
  }

  private async scheduleEligibleTasks() {
    // Do stuff
    const eligibleTaskIds = await scanAvailableTasks(
      this.serverTaskProcessor.taskTable
    );
    for (const taskId of eligibleTaskIds) {
      void this.attemptTask(taskId);
    }
  }

  private async attemptTask(taskId: string) {
    try {
      await this.serverTaskProcessor.attemptTask(taskId, () => !this.stopped);
    } catch (error: any) {
      if (error instanceof TaskAlreadyCompleteError) {
        // Ignore
        return;
      } else if (error instanceof TaskBeingProcessedError) {
        log.info(
          `Attempted task ${taskId} but failed to get exclusive lock (probably a race condition)...`
        );
        return;
      }

      log.error(`Error while processing ${taskId}`, {
        error,
      });
    }
  }

  async stop() {
    this.stopped = true;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }
}

export async function registerTaskServer<C extends TaskServerContext>(
  loader: RegistryLoader<C>
) {
  const [taskProcessor] = await Promise.all([
    loader.get("serverTaskProcessor"),
  ]);
  return new TaskServer(taskProcessor);
}
