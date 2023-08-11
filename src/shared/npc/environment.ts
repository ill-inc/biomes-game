import { BikkieIds } from "@/shared/bikkie/ids";
import { type ReadonlyWorldMetadata } from "@/shared/ecs/gen/components";
import {
  CollideableSelector,
  NpcSelector,
  PlayerSelector,
} from "@/shared/ecs/gen/selectors";
import { SpatialIndex } from "@/shared/ecs/spatial/spatial_index";
import type { Table } from "@/shared/ecs/table";
import type { IndexedEcsResourcePaths } from "@/shared/game/ecs_indexed_resources";
import type { EcsResourcePaths } from "@/shared/game/ecs_resources";
import type { PhysicsResourcePaths } from "@/shared/game/resources/physics";
import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import type { WaterResourcePaths } from "@/shared/game/resources/water";
import type { TypedResources } from "@/shared/resources/types";
import type { VoxelooModule } from "@/shared/wasm/types";

export type NpcTickResourcePaths = TerrainResourcePaths &
  PhysicsResourcePaths &
  EcsResourcePaths &
  WaterResourcePaths &
  IndexedEcsResourcePaths;

export function getMuckerWardIndexConfig() {
  return {
    mucker_ward_selector: new SpatialIndex(
      (e) => e?.placeable_component?.item_id === BikkieIds.muckerWard
    ),
    quest_giver_selector: new SpatialIndex((e) => !!e.quest_giver),
  };
}

export type MuckerWardIndexConfig = ReturnType<typeof getMuckerWardIndexConfig>;

function getNpcTickContextIndexConfig() {
  return {
    ...CollideableSelector.createIndexFor.spatial(),
    ...PlayerSelector.createIndexFor.spatial(),
    ...NpcSelector.createIndexFor.spatial(),
    ...getMuckerWardIndexConfig(),
  };
}
export type NpcTickContextMetaIndex = ReturnType<
  typeof getNpcTickContextIndexConfig
>;

export interface Environment {
  table: NpcTickerTable;
  resources: TypedResources<NpcTickResourcePaths>;
  ecsMetaIndex: NpcTickContextMetaIndex;
  worldMetadata: ReadonlyWorldMetadata;
  voxeloo: VoxelooModule;
}

type NpcTickerMetaIndex = NpcTickContextMetaIndex;
export type NpcTickerTable = Table<NpcTickerMetaIndex>;
