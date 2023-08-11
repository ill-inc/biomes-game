import type { MapPipeline } from "@/server/map/pipeline";
import type { MapPreload } from "@/server/map/preload";
import type { MapResources } from "@/server/map/resources";
import type { MapServer } from "@/server/map/server";
import type { MapStore } from "@/server/map/storage";
import type { MapReplica } from "@/server/map/table";
import type { WorldHelper } from "@/server/map/world";
import type { Cleanup } from "@/server/shared/cleanup";
import type { SharedServerContext } from "@/server/shared/context";
import type { WorldApi } from "@/server/shared/world/api";
import type { VoxelooModule } from "@/shared/wasm/types";

export interface MapContext extends SharedServerContext {
  cleanup: Cleanup;
  pipeline: MapPipeline;
  replica: MapReplica;
  resources: MapResources;
  server: MapServer;
  store: MapStore;
  preload: MapPreload;
  worldApi: WorldApi;
  worldHelper: WorldHelper;
  voxeloo: VoxelooModule;
}
