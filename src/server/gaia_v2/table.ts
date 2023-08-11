import { Replica } from "@/server/shared/replica/table";
import type { WorldApi } from "@/server/shared/world/api";
import type { ReadonlyEntityWith } from "@/shared/ecs/gen/entities";
import {
  FarmingPlantSelector,
  LightSourceSelector,
  TerrainShardSelector,
  UnmuckSourceSelector,
} from "@/shared/ecs/gen/selectors";
import { keyFromComponent } from "@/shared/ecs/key_index";
import { voxelShard } from "@/shared/game/shard";
import type { RegistryLoader } from "@/shared/registry";

export type GaiaReplica = Replica<ReturnType<typeof getIndexConfig>>;

function getIndexConfig() {
  return {
    ...TerrainShardSelector.createIndexFor.spatial(),
    ...UnmuckSourceSelector.createIndexFor.spatial(),
    ...LightSourceSelector.createIndexFor.spatial(),
    ...FarmingPlantSelector.createIndexFor.key(
      keyFromComponent("position", (c) => [voxelShard(...c.v)])
    ),
  };
}

export type TerrainShard = ReadonlyEntityWith<
  "box" | "shard_seed" | "shard_diff"
>;

export async function registerGaiaReplica<C extends { worldApi: WorldApi }>(
  loader: RegistryLoader<C>
) {
  const replica = new Replica("gaia", await loader.get("worldApi"), {
    metaIndex: getIndexConfig(),
    filter: {
      anyOf: [
        "shard_seed",
        "unmuck",
        "irradiance",
        "farming_plant_component",
        "world_metadata",
      ],
      noneOf: ["iced"],
    },
  });
  await replica.start();
  return replica;
}
