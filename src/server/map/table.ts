import type { MapContext } from "@/server/map/context";
import { Replica } from "@/server/shared/replica/table";
import {
  TerrainShardSelector,
  WaterShardSelector,
} from "@/shared/ecs/gen/selectors";
import type { RegistryLoader } from "@/shared/registry";

export type MapReplica = Replica<ReturnType<typeof getIndexConfig>>;

function getIndexConfig() {
  return {
    ...TerrainShardSelector.createIndexFor.spatial(),
    ...WaterShardSelector.createIndexFor.spatial(),
  };
}

export async function registerReplica<C extends MapContext>(
  loader: RegistryLoader<C>
) {
  const worldApi = await loader.get("worldApi");
  return new Replica("map", worldApi, {
    metaIndex: getIndexConfig(),
    filter: {
      anyOf: ["world_metadata", "shard_seed"],
    },
  });
}
