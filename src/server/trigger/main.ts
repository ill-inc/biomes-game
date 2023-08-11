import type { LogicApi } from "@/server/shared/api/logic";
import { registerLogicApi } from "@/server/shared/api/logic";
import { parseArgs } from "@/server/shared/args";
import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import type { Firehose } from "@/server/shared/firehose/api";
import { registerFirehose } from "@/server/shared/firehose/register";
import { runServer } from "@/server/shared/main";
import type { LazyReplica } from "@/server/shared/replica/lazy_table";
import type { BaseServerConfig } from "@/server/shared/server_config";
import { baseServerArgumentConfig } from "@/server/shared/server_config";
import type { TriggerEngine } from "@/server/shared/triggers/engine";
import { registerTriggerEngine } from "@/server/shared/triggers/engine";
import type { WorldApi } from "@/server/shared/world/api";
import { registerWorldApi } from "@/server/shared/world/register";
import type { ExpiryProcessor } from "@/server/trigger/expiry";
import { registerExpiryProcessor } from "@/server/trigger/expiry";
import type { TriggerServer } from "@/server/trigger/server";
import { registerTriggerServer } from "@/server/trigger/server";
import { registerTriggerReplica } from "@/server/trigger/table";
import { RegistryBuilder } from "@/shared/registry";

export async function registerTriggerServerConfig(): Promise<BaseServerConfig> {
  return parseArgs<BaseServerConfig>({
    ...baseServerArgumentConfig,
  });
}

export interface TriggerServerContext extends SharedServerContext {
  expiryProcessor: ExpiryProcessor;
  firehose: Firehose;
  logicApi: LogicApi;
  triggerEngine: TriggerEngine;
  triggerReplica: LazyReplica;
  triggerServer: TriggerServer;
  worldApi: WorldApi;
}

void runServer(
  "trigger",
  (signal) =>
    new RegistryBuilder<TriggerServerContext>()
      .install(sharedServerContext)
      .bind("expiryProcessor", registerExpiryProcessor)
      .bind("firehose", registerFirehose)
      .bind("logicApi", registerLogicApi)
      .bind("triggerEngine", registerTriggerEngine)
      .bind("triggerReplica", registerTriggerReplica)
      .bind("triggerServer", registerTriggerServer)
      .bind("worldApi", registerWorldApi({ signal }))
      .build(),
  async (context) => {
    await context.triggerServer.start();
  }
);
