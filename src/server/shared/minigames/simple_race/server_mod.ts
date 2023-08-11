import { GameEvent } from "@/server/shared/api/game_event";
import { simpleRaceHandlers } from "@/server/shared/minigames/simple_race/handlers";
import { zSimpleRaceSettings } from "@/server/shared/minigames/simple_race/types";
import { simpleRaceNotReadyReason } from "@/server/shared/minigames/simple_race/util";
import { mutMinigameComponentOfMetadataKind } from "@/server/shared/minigames/type_utils";
import type { ModLogicHooks, ServerMod } from "@/server/shared/minigames/types";
import {
  closeMinigameInstance,
  defaultMinigameItemAttributes,
  sampleElementPositionForObserver,
  sampleElementPositionForSpawn,
} from "@/server/shared/minigames/util";
import { BikkieIds } from "@/shared/bikkie/ids";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { BuffsComponent, MinigameComponent } from "@/shared/ecs/gen/components";
import { StartSimpleRaceMinigameEvent } from "@/shared/ecs/gen/events";
import { anItem } from "@/shared/game/item";
import { countOf, createBag } from "@/shared/game/items";
import {
  dist,
  normalizev2,
  scale,
  sub,
  viewDir,
  xzProject,
} from "@/shared/math/linear";
import type { OptionallyOrientedPoint } from "@/shared/math/types";
import { mapMap } from "@/shared/util/collections";
import { ok } from "assert";
import { maxBy } from "lodash";

const logicHooks: ModLogicHooks = {
  onMinigamePlayerAdded({ player }, _context) {
    player.setBuffsComponent(BuffsComponent.create());
  },

  onMinigamePlayerRemoved({ minigameEntity, minigameInstanceEntity, context }) {
    const minigameMetadata = minigameEntity.minigameComponent().metadata;
    const minigameInstanceState =
      minigameInstanceEntity.mutableMinigameInstance().state;

    ok(minigameMetadata.kind === "simple_race");
    ok(minigameMetadata.kind === minigameInstanceState.kind);
    minigameEntity.mutableMinigameComponent().stats_changed_at =
      secondsSinceEpoch();
    minigameInstanceState.finished_at = secondsSinceEpoch();
    closeMinigameInstance(minigameEntity, minigameInstanceEntity, context);
  },

  onMinigameElementAssociated({ element, minigame }) {
    const placeable = element.placeableComponent();
    if (!placeable) {
      return;
    }

    const comp = mutMinigameComponentOfMetadataKind(minigame, "simple_race");
    if (anItem(placeable.item_id).isCheckpoint) {
      comp.metadata.checkpoint_ids.add(element.id);
    }

    if (placeable.item_id === BikkieIds.simpleRaceStart) {
      comp.metadata.start_ids.add(element.id);
    }

    if (placeable.item_id === BikkieIds.simpleRaceFinish) {
      comp.metadata.end_ids.add(element.id);
    }

    comp.ready = !Boolean(simpleRaceNotReadyReason(comp));
  },

  onMinigameElementDisassociated({ element, minigame }) {
    const placeable = element.placeableComponent();
    if (!placeable) {
      return;
    }

    const comp = mutMinigameComponentOfMetadataKind(minigame, "simple_race");
    const md = comp.metadata;
    md.checkpoint_ids.delete(element.id);
    md.start_ids.delete(element.id);
    md.end_ids.delete(element.id);
    comp.ready = !Boolean(simpleRaceNotReadyReason(comp));
  },

  onWarpHome({ activeMinigameInstance, reason }) {
    if (reason !== "respawn") {
      return;
    }

    const mutInstance = activeMinigameInstance.mutableMinigameInstance();
    if (mutInstance.state.kind === "simple_race") {
      if (mutInstance.state.reached_checkpoints.size === 0) {
        mutInstance.state.started_at = secondsSinceEpoch();
      }
      mutInstance.state.deaths += 1;
    }
  },
};

export const simpleRaceServerMod: ServerMod<"simple_race"> = {
  kind: "simple_race",
  settingsType: zSimpleRaceSettings,
  playerRestoredComponents: ["buffs_component"],
  kitSpec: (minigameId) => {
    const minigameAttributes = defaultMinigameItemAttributes(minigameId);
    return [
      MinigameComponent.create({
        metadata: {
          kind: "simple_race",
          checkpoint_ids: new Set(),
          end_ids: new Set(),
          start_ids: new Set(),
        },
      }),
      createBag(
        countOf(BikkieIds.simpleRaceStart, minigameAttributes, 1n),
        countOf(BikkieIds.simpleRaceFinish, minigameAttributes, 1n),
        countOf(BikkieIds.simpleRaceCheckpoint, minigameAttributes, 99n),
        countOf(BikkieIds.minigameLeaderboard, minigameAttributes, 1n)
      ),
    ];
  },

  handleCreateOrJoinWebRequest: async (deps, minigame) => {
    await deps.logicApi.publish(
      new GameEvent(
        deps.userId,
        new StartSimpleRaceMinigameEvent({
          id: deps.userId,
          minigame_id: minigame.id,
        })
      )
    );
  },

  observerPosition({ minigameElements }) {
    const startRaceElement = minigameElements.find(
      (e) => e.placeableComponent()?.item_id === BikkieIds.simpleRaceStart
    );
    if (startRaceElement) {
      return sampleElementPositionForObserver([startRaceElement]);
    }
  },

  spawnPosition({
    kind,
    player,
    minigame,
    minigameInstance,
    minigameElements,
  }): OptionallyOrientedPoint | undefined {
    const NO_WARP_DISTANCE = 5;

    const md = minigame.minigameComponent().metadata;
    const mis = minigameInstance?.minigameInstance().state;
    let validElements: typeof minigameElements = [];
    ok(md.kind === "simple_race");

    const startRaceElement = minigameElements.find(
      (e) => e.placeableComponent()?.item_id === BikkieIds.simpleRaceStart
    );

    // Don't warp you to the start position on initial start if you are close to the race start placeable
    if (
      kind === "initial" &&
      startRaceElement?.position() &&
      player.position() &&
      (!mis ||
        (mis.kind === "simple_race" && mis.player_state === "waiting")) &&
      dist(startRaceElement.position()!.v, player.position()!.v) <
        NO_WARP_DISTANCE
    ) {
      return undefined;
    }

    if (kind === "respawn" && mis) {
      ok(md.kind == mis.kind);
      if (mis.reached_checkpoints.size > 0) {
        const [lastCheckpointId] = maxBy(
          mapMap(mis.reached_checkpoints, (v, key) => [key, v.time]),
          (e) => e[1]
        )!;

        validElements = minigameElements.filter(
          (e) => e.id === lastCheckpointId
        );
      }
    }

    if (validElements.length === 0) {
      validElements = minigameElements.filter(
        (e) => e.placeableComponent()?.item_id === BikkieIds.simpleRaceStart
      );
    }

    const ret = sampleElementPositionForSpawn(validElements);

    // If warping to the start position, walk slightly back
    if (
      startRaceElement &&
      ret &&
      ret[1] &&
      dist(ret[0], startRaceElement?.position()!.v) < 0.05
    ) {
      const vd = normalizev2(xzProject(viewDir(ret[1])));
      const newPos = sub(ret[0], scale(2, [vd[0], 0, vd[1]]));
      return [newPos, ret[1]];
    }

    return ret;
  },

  eventHandlers: simpleRaceHandlers,
  logicHooks,
};
