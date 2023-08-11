import { Replica } from "@/server/shared/replica/table";
import type { WorldApi } from "@/server/shared/world/api";
import {
  CollideableSelector,
  PlayerSelector,
  TerrainShardSelector,
} from "@/shared/ecs/gen/selectors";
import { createComponentSelector } from "@/shared/ecs/selectors/helper";
import { PLAYER_NEEDED_COMPONENTS } from "@/shared/game/players";
import type { RegistryLoader } from "@/shared/registry";

export const LooseItemSelector = createComponentSelector(
  "loose_item_selector",
  "loose_item",
  "position"
);

function getIndexConfig() {
  return {
    ...CollideableSelector.createIndexFor.spatial(),
    ...LooseItemSelector.createIndexFor.all(),
    ...TerrainShardSelector.createIndexFor.spatial(),
    ...PlayerSelector.createIndexFor.spatial(),
  };
}

export type NewtonReplica = Replica<ReturnType<typeof getIndexConfig>>;

export async function registerNewtonReplica<C extends { worldApi: WorldApi }>(
  loader: RegistryLoader<C>
) {
  return new Replica("newton", await loader.get("worldApi"), {
    metaIndex: getIndexConfig(),
    filter: {
      anyOf: [
        "shard_seed",
        "loose_item",
        "world_metadata",
        ...PLAYER_NEEDED_COMPONENTS,
      ],
    },
  });
}
