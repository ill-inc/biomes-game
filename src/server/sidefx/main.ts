import type { LogicApi } from "@/server/shared/api/logic";
import { registerLogicApi } from "@/server/shared/api/logic";
import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import type { IdGenerator } from "@/server/shared/ids/generator";
import { registerIdGenerator } from "@/server/shared/ids/generator";
import { runServer } from "@/server/shared/main";
import { registerServerMods } from "@/server/shared/minigames/server_bootstrap";
import type { ServerMods } from "@/server/shared/minigames/server_mods";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { WorldApi } from "@/server/shared/world/api";
import { registerWorldApi } from "@/server/shared/world/register";
import type { SideFxServer } from "@/server/sidefx/server";
import { registerSideFxServer } from "@/server/sidefx/server";
import type { SideEffect } from "@/server/sidefx/side_effect_types";
import { registerSideEffects } from "@/server/sidefx/side_effects";
import type { SideFxReplica } from "@/server/sidefx/table";
import { registerSideFxReplica } from "@/server/sidefx/table";
import { RegistryBuilder } from "@/shared/registry";
import type { VoxelooModule } from "@/shared/wasm/types";

export interface SideFxServerContext extends SharedServerContext {
  sideFxReplica: SideFxReplica;
  sideFxServer: SideFxServer;
  sideEffects: SideEffect[];
  idGenerator: IdGenerator;
  worldApi: WorldApi;
  logicApi: LogicApi;
  serverMods: ServerMods;
  voxeloo: VoxelooModule;
}

void runServer(
  "sidefx",
  (signal) =>
    new RegistryBuilder<SideFxServerContext>()
      .install(sharedServerContext)
      .bind("sideEffects", registerSideEffects)
      .bind("sideFxReplica", registerSideFxReplica)
      .bind("sideFxServer", registerSideFxServer)
      .bind("logicApi", registerLogicApi)
      .bind("worldApi", registerWorldApi({ signal }))
      .bind("idGenerator", registerIdGenerator)
      .bind("serverMods", registerServerMods)
      .bind("voxeloo", loadVoxeloo)
      .build(),
  async (context) => {
    await context.sideFxServer.start();
  }
);
