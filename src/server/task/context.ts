import type { AskApi } from "@/server/ask/api";
import type { LogicApi } from "@/server/shared/api/logic";
import type { SharedServerContext } from "@/server/shared/context";
import type { ServerTaskProcessor } from "@/server/shared/tasks/server_tasks/server_task_processor";
import type { TaskProcessorDeps } from "@/server/shared/tasks/types";
import type { WorldApi } from "@/server/shared/world/api";
import type { TaskServer } from "@/server/task/server";
import type { ServerCache } from "@/server/web/server_cache";

export type TaskServerContext = TaskProcessorDeps &
  SharedServerContext & {
    logicApi: LogicApi;
    serverCache: ServerCache;
    serverTaskProcessor: ServerTaskProcessor;
    taskServer: TaskServer;
    worldApi: WorldApi;
    askApi: AskApi;
  };
