import type { AnimaServer } from "@/server/anima/server";
import type { LogicApi } from "@/server/shared/api/logic";
import type { SharedServerContext } from "@/server/shared/context";
import type { IdGenerator } from "@/server/shared/ids/generator";
import type { AnimaReplica } from "@/server/shared/npc/table";
import type { WorldApi } from "@/server/shared/world/api";
import type { VoxelooModule } from "@/shared/wasm/types";

export interface AnimaServerContext extends SharedServerContext {
  replica: AnimaReplica;
  server: AnimaServer;
  idGenerator: IdGenerator;
  logicApi: LogicApi;
  worldApi: WorldApi;
  voxeloo: VoxelooModule;
}
