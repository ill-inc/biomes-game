import type { EventContext } from "@/server/logic/events/core";
import {
  forcePlayerWarp,
  newPlayerInventory,
} from "@/server/logic/utils/players";
import { zSpleefSettings } from "@/server/shared/minigames/spleef/types";
import {
  instanceOfStateKind,
  mutInstanceOfStateKind,
  parseMinigameSettings,
} from "@/server/shared/minigames/type_utils";
import type {
  CreateMinigameSpaceClipboardSpec,
  NextTick,
  OnTickInfo,
} from "@/server/shared/minigames/types";
import type { AddPlayerToMinigameInstanceInfo } from "@/server/shared/minigames/util";
import {
  addPlayerToMinigameInstance,
  createMinigameInstance,
  resetMinigameInstanceSpace,
  scheduleMinigameTick,
} from "@/server/shared/minigames/util";
import { BikkieIds } from "@/shared/bikkie/ids";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { ReadonlyMinigameComponent } from "@/shared/ecs/gen/components";
import { MinigameInstance } from "@/shared/ecs/gen/components";
import type { DeltaWith } from "@/shared/ecs/gen/delta";
import { countOf } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { onlySetValue } from "@/shared/util/collections";
import { ok } from "assert";
import { sample } from "lodash";

export function spleefNotReadyReason(
  component: ReadonlyMinigameComponent
): string | undefined {
  const md = component.metadata;
  if (md.kind !== "spleef") {
    return "Invalid minigame";
  }

  if (md.start_ids.size === 0) {
    return "Missing spawn points";
  }

  if (md.arena_marker_ids.size < 2) {
    return "Missing arena markers";
  }
}

export function handleSpleefTick(
  {
    minigameEntity,
    minigameInstanceEntity,
    minigameElements,
    activePlayers,
    spaceClipboard,
  }: OnTickInfo,
  context: EventContext<{}>,
  _dt: number
): NextTick {
  const currentInstance = instanceOfStateKind(minigameInstanceEntity, "spleef");
  const instanceState = currentInstance.state.instance_state;
  const settings = parseMinigameSettings(
    minigameEntity.minigameComponent().minigame_settings,
    zSpleefSettings
  );
  if (currentInstance.active_players.size <= settings.minPlayers) {
    mutInstanceOfStateKind(
      minigameInstanceEntity,
      "spleef"
    ).state.instance_state = {
      kind: "waiting_for_players",
    };
    return CONFIG.minigames.tick_rate;
  }

  switch (instanceState.kind) {
    case "waiting_for_players":
      if (currentInstance.active_players.size > settings.minPlayers) {
        mutInstanceOfStateKind(
          minigameInstanceEntity,
          "spleef"
        ).state.instance_state = {
          kind: "round_countdown",
          round_start: secondsSinceEpoch() + 10,
          last_winner_id: undefined,
        };
      }
      break;
    case "round_countdown":
      if (secondsSinceEpoch() > instanceState.round_start) {
        // Start round
        mutInstanceOfStateKind(
          minigameInstanceEntity,
          "spleef"
        ).state.instance_state = {
          kind: "playing_round",
          round_expires: secondsSinceEpoch() + settings.roundLengthSeconds,
          alive_round_players: new Set([
            ...currentInstance.active_players.keys(),
          ]),
          tag_round_state:
            settings.gameMode === "tag"
              ? {
                  it_player: sample([
                    ...currentInstance.active_players.keys(),
                  ])!,
                }
              : undefined,
        };

        let spawnPoints: DeltaWith<"id">[] = [];

        if (spaceClipboard) {
          const newEntities = resetMinigameInstanceSpace(
            minigameInstanceEntity,
            spaceClipboard,
            context
          );
          spawnPoints = newEntities.filter(
            (e) => e.placeableComponent()?.item_id === BikkieIds.spleefSpawn
          );
        }

        if (spawnPoints.length === 0) {
          spawnPoints = [...minigameElements];
        }

        for (const [playerId, playerInfo] of currentInstance.active_players) {
          const player = activePlayers.find((e) => e.id === playerId);
          ok(player, "Bad state");
          const pos =
            sample(spawnPoints)?.position()?.v ??
            playerInfo.entry_warped_to ??
            playerInfo.entry_position;

          const desiredLoadout = newPlayerInventory();

          for (let i = 0; i < settings.loadOut.length; i += 1) {
            const [id, count] = settings.loadOut[i];
            desiredLoadout.hotbar[i] = countOf(id, BigInt(Math.floor(count)));
          }
          player.setInventory(desiredLoadout);
          forcePlayerWarp(player, pos);
        }
      }
      break;
    case "playing_round":
      if (
        secondsSinceEpoch() > instanceState.round_expires ||
        instanceState.alive_round_players.size <= 1
      ) {
        const mut = mutInstanceOfStateKind(minigameInstanceEntity, "spleef");

        let winnerId: BiomesId | undefined;
        if (instanceState.alive_round_players.size === 1) {
          winnerId = onlySetValue(instanceState.alive_round_players);
          const old = mut.state.player_stats.get(winnerId);
          ok(old);
          old.rounds_won += 1;
        }

        mut.state.instance_state = {
          kind: "round_countdown",
          round_start: secondsSinceEpoch() + settings.roundDelaySeconds,
          last_winner_id: winnerId,
        };
      }
      break;
  }

  return CONFIG.minigames.tick_rate;
}

export function handleSpleefCreateNew(
  createInfo: Omit<AddPlayerToMinigameInstanceInfo, "minigameInstance"> & {
    newInstanceId: BiomesId;
  },
  spaceStowage: CreateMinigameSpaceClipboardSpec,
  context: EventContext<{}>
) {
  const { minigame, player, newInstanceId } = createInfo;
  const newInstance = createMinigameInstance(
    minigame,
    newInstanceId,
    MinigameInstance.create({
      minigame_id: minigame.id,
      state: {
        kind: "spleef",
        round_number: 0,
        instance_state: {
          kind: "waiting_for_players",
        },
        player_stats: new Map([
          [
            player.id,
            {
              playerId: player.id,
              rounds_won: 0,
            },
          ],
        ]),
        observer_spawn_points: [],
      },
    }),
    context,
    { spaceStowage }
  );

  addPlayerToMinigameInstance(
    {
      ...createInfo,
      minigameInstance: newInstance,
    },
    context
  );
  scheduleMinigameTick(newInstance, CONFIG.minigames.tick_rate);
}
