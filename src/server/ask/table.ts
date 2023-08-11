import { Replica } from "@/server/shared/replica/table";
import type { WorldApi } from "@/server/shared/world/api";
import { CheckIndex } from "@/shared/ecs/check_index";
import {
  ActivePlayersSelector,
  GremlinSelector,
  MinigameElementByMinigameIdSelector,
  MinigameInstancesByMinigameIdSelector,
  MinigamesByCreatorIdSelector,
  NamedQuestGiverSelector,
  NpcSelector,
  PlaceablesByItemIdSelector,
  PresetByLabelSelector,
  ReadyMinigameSelector,
  RobotSelector,
  RobotsByCreatorIdSelector,
  TerrainShardSelector,
} from "@/shared/ecs/gen/selectors";
import { keyFromComponent } from "@/shared/ecs/key_index";
import { createComponentSelector } from "@/shared/ecs/selectors/helper";
import { isPlayer } from "@/shared/game/players";
import type { RegistryLoader } from "@/shared/registry";

export const NamedNpcSelector = createComponentSelector(
  "namedNpcs",
  "label",
  "npc_metadata"
);

export const LandmarkSelector = createComponentSelector(
  "allLandmarks",
  "landmark"
);

export function createAskIndexConfig() {
  return {
    ...PresetByLabelSelector.createIndexFor.key(
      keyFromComponent("label", (c) => [c.text])
    ),
    ...NpcSelector.createIndexFor.key(
      keyFromComponent("npc_metadata", (c) => [c.type_id])
    ),
    ...GremlinSelector.createIndexFor.all(),
    ...TerrainShardSelector.createIndexFor.spatial(),
    ...ReadyMinigameSelector.createIndexFor.subset((e) =>
      Boolean(e?.minigame_component?.ready)
    ),
    ...MinigameElementByMinigameIdSelector.createIndexFor.key(
      keyFromComponent("minigame_element", (c) => [c.minigame_id])
    ),
    ...MinigameInstancesByMinigameIdSelector.createIndexFor.key(
      keyFromComponent("minigame_instance", (c) => [c.minigame_id])
    ),
    ...RobotsByCreatorIdSelector.createIndexFor.key(
      keyFromComponent("created_by", (c) => [c.id])
    ),
    ...RobotSelector.createIndexFor.all(),
    ...MinigamesByCreatorIdSelector.createIndexFor.key(
      keyFromComponent("created_by", (c) => [c.id])
    ),
    ...NamedQuestGiverSelector.createIndexFor.all(),
    ...NamedNpcSelector.createIndexFor.subset(
      (e) => e !== undefined && !e.npc_metadata?.spawn_event_id
    ),
    ...LandmarkSelector.createIndexFor.all(),
    ...ActivePlayersSelector.createIndexFor.subset(
      (e) => !e?.iced && !e?.gremlin && isPlayer(e)
    ),
    ...PlaceablesByItemIdSelector.createIndexFor.key(
      keyFromComponent("placeable_component", (c) => [c.item_id])
    ),
    // Extra index just for stats reporting.
    realActivePlayers: new CheckIndex(
      (e) => !e.iced && !e.gremlin && isPlayer(e)
    ),
    activeGremlins: new CheckIndex((e) => !e.iced && !!e.gremlin),
  };
}

export type AskMetaIndex = ReturnType<typeof createAskIndexConfig>;
export type AskReplica = Replica<AskMetaIndex>;

export async function registerAskReplica<
  C extends {
    worldApi: WorldApi;
  }
>(loader: RegistryLoader<C>): Promise<AskReplica> {
  return new Replica("replica", await loader.get("worldApi"), {
    metaIndex: createAskIndexConfig(),
  });
}
