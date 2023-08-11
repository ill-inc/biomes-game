import { Replica } from "@/server/shared/replica/table";
import type { WorldApi } from "@/server/shared/world/api";
import {
  CollideableSelector,
  NpcSelector,
  PlayerSelector,
  ProtectionByTeamIdSelector,
  RobotsByCreatorIdSelector,
  RobotsByLandmarkNameSelector,
  TerrainShardSelector,
} from "@/shared/ecs/gen/selectors";
import { keyFromComponent } from "@/shared/ecs/key_index";
import type { Table } from "@/shared/ecs/table";
import { getMuckerWardIndexConfig } from "@/shared/npc/environment";
import type { RegistryLoader } from "@/shared/registry";

function getIndexConfig() {
  return {
    ...CollideableSelector.createIndexFor.spatial(),
    ...NpcSelector.createIndexFor.spatial(),
    ...PlayerSelector.createIndexFor.spatial(),
    ...RobotsByCreatorIdSelector.createIndexFor.key(
      keyFromComponent("created_by", (c) => [c.id])
    ),
    ...RobotsByLandmarkNameSelector.createIndexFor.key(
      keyFromComponent("landmark", (c) =>
        c.override_name ? [c.override_name] : []
      )
    ),
    ...ProtectionByTeamIdSelector.createIndexFor.key(
      keyFromComponent("acl_component", (c) =>
        c.acl.creatorTeam?.[0] ? [c.acl.creatorTeam[0]] : []
      )
    ),
    ...TerrainShardSelector.createIndexFor.spatial(),
    ...getMuckerWardIndexConfig(),
  };
}

export type AnimaMetaIndex = ReturnType<typeof getIndexConfig>;
export type AnimaTable = Table<AnimaMetaIndex>;
export type AnimaReplica = Replica<AnimaMetaIndex>;

export async function registerAnimaReplica<C extends { worldApi: WorldApi }>(
  loader: RegistryLoader<C>
) {
  return new Replica("anima", await loader.get("worldApi"), {
    metaIndex: getIndexConfig(),
    // Anima server doesn't care about iced entities, and in fact performs
    // better without knowing about them.
    filter: { noneOf: ["iced"] },
  });
}
