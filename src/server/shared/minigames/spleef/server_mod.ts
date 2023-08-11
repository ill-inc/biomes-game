import {
  forcePlayerWarp,
  newPlayerInventory,
} from "@/server/logic/utils/players";
import { GameEvent } from "@/server/shared/api/game_event";
import { spleefHandlers } from "@/server/shared/minigames/spleef/handlers";
import { zSpleefSettings } from "@/server/shared/minigames/spleef/types";
import {
  handleSpleefTick,
  spleefNotReadyReason,
} from "@/server/shared/minigames/spleef/util";
import {
  instanceOfStateKind,
  mutInstanceOfStateKind,
  mutMinigameComponentOfMetadataKind,
} from "@/server/shared/minigames/type_utils";
import type { ModLogicHooks, ServerMod } from "@/server/shared/minigames/types";
import {
  closeMinigameInstance,
  defaultMinigameItemAttributes,
  determineArenaBoundary,
  sampleElementPositionForObserver,
  sampleElementPositionForSpawn,
} from "@/server/shared/minigames/util";
import { apiErrorBoundary } from "@/server/web/errors";
import { BikkieIds } from "@/shared/bikkie/ids";
import { BuffsComponent, MinigameComponent } from "@/shared/ecs/gen/components";
import { CreateOrJoinSpleefEvent } from "@/shared/ecs/gen/events";
import { aabbToBox, boxToAabb } from "@/shared/game/group";
import { countOf, createBag } from "@/shared/game/items";
import { getAabbForPlaceableEntity } from "@/shared/game/placeables";
import type { BiomesId } from "@/shared/ids";
import {
  cornersAABB,
  inclusiveContainsAABB,
  randomInAABB,
} from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { all } from "@/shared/util/helpers";
import { ok } from "assert";
import { first, sample } from "lodash";

const logicHooks: ModLogicHooks = {
  onCreated(info) {
    const mutInstance = info.minigameInstanceEntity.mutableMinigameInstance();
    ok(mutInstance.state.kind === "spleef");
    ok(info.clipboard);

    const spawnPoints = info.clipboard.relevantEntities.filter(
      (e) =>
        e.position() &&
        e.placeableComponent()?.item_id === BikkieIds.spleefSpawn
    );

    if (spawnPoints.length > 0) {
      mutInstance.state.observer_spawn_points = spawnPoints.map((e) => [
        ...e.position()!.v,
      ]);
    } else {
      mutInstance.state.observer_spawn_points = [
        randomInAABB(info.clipboard.aabb),
      ];
    }
  },

  onMinigamePlayerRemoved({
    player,
    minigameEntity,
    minigameInstanceEntity,
    context,
  }) {
    const minigameMetadata = minigameEntity.minigameComponent().metadata;
    const minigameInstanceState =
      minigameInstanceEntity.mutableMinigameInstance().state;

    ok(minigameMetadata.kind === "spleef");
    ok(minigameMetadata.kind === minigameInstanceState.kind);

    minigameInstanceState.player_stats.delete(player.id);
    const numPlayers =
      minigameInstanceEntity.minigameInstance().active_players.size;
    if (numPlayers === 0) {
      closeMinigameInstance(minigameEntity, minigameInstanceEntity, context);
    } else if (
      numPlayers === 1 &&
      minigameInstanceState.instance_state.kind !== "waiting_for_players"
    ) {
      minigameInstanceState.instance_state = {
        kind: "waiting_for_players",
      };
    } else if (minigameInstanceState.instance_state.kind === "playing_round") {
      minigameInstanceState.instance_state.alive_round_players.delete(
        player.id
      );
    }
  },

  onMinigamePlayerAdded({ player, minigameInstanceEntity }, _context) {
    player.setInventory(newPlayerInventory());
    player.setBuffsComponent(BuffsComponent.create());
    const instanceState = mutInstanceOfStateKind(
      minigameInstanceEntity,
      "spleef"
    );

    instanceState.state.player_stats.set(player.id, {
      rounds_won: 0,
      playerId: player.id,
    });
  },

  onPlayerDeath({ player, activeMinigameInstance }) {
    const mutInstance = mutInstanceOfStateKind(
      activeMinigameInstance,
      "spleef"
    );
    const instanceState = mutInstance.state.instance_state;

    if (instanceState.kind === "playing_round") {
      instanceState.alive_round_players.delete(player.id);
      if (
        instanceState.tag_round_state?.it_player === player.id &&
        instanceState.alive_round_players.size > 0
      ) {
        instanceState.tag_round_state.it_player = sample([
          ...instanceState.alive_round_players.values(),
        ])!;
      }
    }

    if (mutInstance.state.observer_spawn_points.length > 0) {
      forcePlayerWarp(player, sample(mutInstance.state.observer_spawn_points)!);
    }
  },

  onMinigameElementAssociated({ element, minigame }) {
    const placeable = element.placeableComponent();
    if (!placeable) {
      return;
    }

    const comp = mutMinigameComponentOfMetadataKind(minigame, "spleef");
    if (placeable.item_id === BikkieIds.spleefStart) {
      comp.metadata.start_ids.add(element.id);
    } else if (placeable.item_id === BikkieIds.bboxMarker) {
      comp.metadata.arena_marker_ids.add(element.id);
    }

    comp.ready = !Boolean(spleefNotReadyReason(comp));
  },

  onMinigameElementDisassociated({ element, minigame }) {
    const placeable = element.placeableComponent();
    if (!placeable) {
      return;
    }

    const comp = mutMinigameComponentOfMetadataKind(minigame, "spleef");
    const md = comp.metadata;
    md.start_ids.delete(element.id);
    md.arena_marker_ids.delete(element.id);
    comp.ready = !Boolean(spleefNotReadyReason(comp));
  },

  onTick(tickEntities, context, dt) {
    return handleSpleefTick(tickEntities, context, dt);
  },
};

export const spleefServerMod: ServerMod<"spleef"> = {
  kind: "spleef",
  settingsType: zSpleefSettings,
  playerRestoredComponents: ["inventory", "buffs_component"],
  kitSpec: (minigameId: BiomesId) => {
    return [
      MinigameComponent.create({
        metadata: {
          kind: "spleef",
          arena_marker_ids: new Set(),
          start_ids: new Set(),
        },
      }),
      createBag(
        countOf(
          BikkieIds.spleefStart,
          defaultMinigameItemAttributes(minigameId),
          1n
        ),

        countOf(
          BikkieIds.spleefSpawn,
          defaultMinigameItemAttributes(minigameId),
          10n
        ),

        countOf(
          BikkieIds.bboxMarker,
          defaultMinigameItemAttributes(minigameId),
          10n
        )
      ),
    ];
  },

  handleCreateOrJoinWebRequest: async (
    deps,
    minigame,
    activeInstances,
    minigameElements
  ) => {
    const aabb = apiErrorBoundary("invalid_request", () =>
      determineArenaBoundary(minigameElements)
    );

    await deps.logicApi.publish(
      new GameEvent(
        deps.userId,
        new CreateOrJoinSpleefEvent({
          id: deps.userId,
          minigame_id: minigame.id,
          minigame_instance_id: first(activeInstances.map((e) => e.id)),
          box: aabbToBox(aabb),
        })
      )
    );
  },

  observerPosition({ minigameElements }) {
    return sampleElementPositionForObserver(
      minigameElements.filter(
        (e) => e.placeableComponent()?.item_id === BikkieIds.spleefStart
      )
    );
  },

  spawnPosition({ minigameInstance, minigameElements }) {
    if (minigameInstance) {
      const spawnPoints = instanceOfStateKind(minigameInstance, "spleef").state
        .observer_spawn_points;
      if (spawnPoints.length > 0) {
        return [sample(spawnPoints)!];
      }
    }
    return sampleElementPositionForSpawn(
      minigameElements.filter(
        (e) => e.placeableComponent()?.item_id === BikkieIds.spleefStart
      )
    );
  },
  buildServerRuleset(base, player, minigame, minigameInstance) {
    const isInBounds = (worldPos: ReadonlyVec3) => {
      const space = minigameInstance.minigameInstance()?.space_clipboard;
      if (!space) {
        return false;
      }

      const aabb = boxToAabb(space.region.box);
      if (inclusiveContainsAABB(aabb, worldPos)) {
        return true;
      }

      return false;
    };

    const isAlive = (playerId: BiomesId) => {
      const state = instanceOfStateKind(minigameInstance, "spleef").state;
      if (state.instance_state.kind === "playing_round") {
        return state.instance_state.alive_round_players.has(playerId);
      }
      return false;
    };

    return {
      ...base,
      overrideAcl(action, options) {
        const baseCan = base.overrideAcl(action, options);
        if (baseCan) {
          return baseCan;
        }

        if (
          (action === "destroy" ||
            action === "place" ||
            action === "placeEphemeral" ||
            action === "shape") &&
          isAlive(player.id)
        ) {
          if (options?.atPoints) {
            return all(options.atPoints, isInBounds);
          } else if (options?.entity) {
            const aabb = getAabbForPlaceableEntity(
              options.entity.asReadonlyEntity()
            );
            if (aabb) {
              return all(cornersAABB(aabb), isInBounds);
            }
          }
        }

        return baseCan;
      },
      canDropAt(terrain, worldPos) {
        const baseCan = base.canDropAt(terrain, worldPos);
        if (!baseCan) {
          return baseCan;
        }

        if (isInBounds(worldPos)) {
          return false;
        }

        return baseCan;
      },
    };
  },

  eventHandlers: spleefHandlers,
  logicHooks,
};
