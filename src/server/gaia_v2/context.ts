import type { Pipeline } from "@/server/gaia_v2/pipeline";
import type { GaiaServer } from "@/server/gaia_v2/server";
import type { Sharder } from "@/server/gaia_v2/sharder";
import type {
  Simulation,
  SimulationName,
} from "@/server/gaia_v2/simulations/api";
import type { GaiaReplica } from "@/server/gaia_v2/table";
import type { TerrainEmitter } from "@/server/gaia_v2/terrain/emitter";
import type { TerrainSync } from "@/server/gaia_v2/terrain/sync";
import type { Clock } from "@/server/gaia_v2/util/clock";
import type { GaiaPubSub } from "@/server/gaia_v2/util/pubsub";
import type { Cleanup } from "@/server/shared/cleanup";
import type { SharedServerContext } from "@/server/shared/context";
import type { BaseServerConfig } from "@/server/shared/server_config";
import type { WorldApi } from "@/server/shared/world/api";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { GaiaTerrainMapV2 } from "@/shared/wasm/types/gaia";
import type { IdGenerator } from "@/server/shared/ids/generator";

export interface GaiaConfig extends BaseServerConfig {
  simulations: SimulationName[];
}
export interface GaiaServerContext extends SharedServerContext {
  cleanup: Cleanup;
  clock: Clock;
  config: GaiaConfig;
  idGenerator: IdGenerator;
  pipeline: Pipeline;
  pubsub: GaiaPubSub;
  replica: GaiaReplica;
  server: GaiaServer;
  sharder: Sharder;
  simulations: Simulation[];
  terrainEmitter: TerrainEmitter;
  terrainMap: GaiaTerrainMapV2;
  terrainSync: TerrainSync;
  worldApi: WorldApi;
  voxeloo: VoxelooModule;
}
