import type { EventContext } from "@/server/logic/events/core";
import type { NextTick, OnTickInfo } from "@/server/shared/minigames/types";
import type { AddPlayerToMinigameInstanceInfo } from "@/server/shared/minigames/util";
import {
  addPlayerToMinigameInstance,
  createMinigameInstance,
} from "@/server/shared/minigames/util";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { ReadonlyMinigameComponent } from "@/shared/ecs/gen/components";
import { MinigameInstance } from "@/shared/ecs/gen/components";

import type { BiomesId } from "@/shared/ids";
import { mutUpdateMap } from "@/shared/util/collections";
import { ok } from "assert";

export const ROUND_TIME_S = 60 * 2;
export const PLAYER_WAIT_TIME_S = 10;

export function deathmatchNotReadyReason(
  component: ReadonlyMinigameComponent
): string | undefined {
  const md = component.metadata;
  ok(md.kind === "deathmatch");

  if (md.start_ids.size === 0) {
    return "Missing start flag";
  }
}

export function handleDeathmatchTick(
  { minigameInstanceEntity }: OnTickInfo,
  _context: EventContext<{}>,
  _dt: number
): NextTick {
  const currentState = minigameInstanceEntity.minigameInstance().state;
  ok(currentState.kind === "deathmatch");

  if (currentState.instance_state?.kind === "play_countdown") {
    const mutInstance = minigameInstanceEntity.mutableMinigameInstance();
    const mutState = mutInstance.state;
    ok(mutState.kind === currentState.kind);
    mutState.instance_state = {
      kind: "playing",
      round_end: secondsSinceEpoch() + ROUND_TIME_S,
    };

    // Start the round
    mutUpdateMap(mutState.player_states, (_, playerId) => {
      return {
        deaths: 0,
        kills: 0,
        last_death: undefined,
        last_kill: undefined,
        playerId,
      };
    });

    return ROUND_TIME_S;
  } else if (currentState.instance_state?.kind === "playing") {
    const mutInstance = minigameInstanceEntity.mutableMinigameInstance();
    ok(mutInstance.state.kind === currentState.kind);
    mutInstance.state.instance_state = {
      kind: "finished",
      timestamp: secondsSinceEpoch(),
    };
    return "stop_tick";
  }

  return "stop_tick";
}

export function handleDeathmatchCreateNew(
  createInfo: Omit<AddPlayerToMinigameInstanceInfo, "minigameInstance"> & {
    newInstanceId: BiomesId;
  },
  context: EventContext<{}>
) {
  const { minigame, player, newInstanceId } = createInfo;
  const newInstance = createMinigameInstance(
    minigame,
    newInstanceId,
    MinigameInstance.create({
      minigame_id: minigame.id,
      state: {
        kind: "deathmatch",
        instance_state: {
          kind: "waiting_for_players",
        },
        player_states: new Map([
          [
            player.id,
            {
              deaths: 0,
              kills: 0,
              last_death: undefined,
              last_kill: undefined,
              playerId: player.id,
            },
          ],
        ]),
      },
    }),
    context
  );

  addPlayerToMinigameInstance(
    {
      ...createInfo,
      minigameInstance: newInstance,
    },
    context
  );
}
