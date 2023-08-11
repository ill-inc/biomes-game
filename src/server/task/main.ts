import { registerAskApi } from "@/server/ask/api";
import { registerLogicApi } from "@/server/shared/api/logic";
import { sharedServerContext } from "@/server/shared/context";
import { registerFirehose } from "@/server/shared/firehose/register";
import { registerIdGenerator } from "@/server/shared/ids/generator";
import { runServer } from "@/server/shared/main";
import { registerServerTaskProcessor } from "@/server/shared/tasks/server_tasks/server_task_processor";
import { registerWorldApi } from "@/server/shared/world/register";
import type { TaskServerContext } from "@/server/task/context";
import { installTaskModule } from "@/server/task/module";
import { registerCacheClient } from "@/server/web/server_cache";
import { RegistryBuilder } from "@/shared/registry";

void runServer(
  "task",
  (signal) =>
    new RegistryBuilder<TaskServerContext>()
      .install(sharedServerContext)
      .bind("serverCache", registerCacheClient)
      .bind("serverTaskProcessor", registerServerTaskProcessor)
      .bind("logicApi", registerLogicApi)
      .bind("worldApi", registerWorldApi({ signal }))
      .bind("askApi", registerAskApi)
      .bind("idGenerator", registerIdGenerator)
      .bind("firehose", registerFirehose)
      .install(installTaskModule)
      .build(),
  async (context) => {
    await context.taskServer.start();
  }
);
