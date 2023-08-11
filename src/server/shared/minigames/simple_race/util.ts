import { addToast } from "@/client/components/toast/helpers";
import type { ClientContextSubset } from "@/client/game/context";
import type {
  ClientResourceDeps,
  ClientResources,
} from "@/client/game/resources/types";
import type { QueriedEntityWith } from "@/server/logic/events/query";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type {
  ReadonlyMinigameComponent,
  ReadonlyMinigameInstance,
} from "@/shared/ecs/gen/components";
import {
  FinishSimpleRaceMinigameEvent,
  ReachCheckpointSimpleRaceMinigameEvent,
  ReachStartSimpleRaceMinigameEvent,
} from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { ok } from "assert";

export function simpleRaceNotReadyReason(
  component: ReadonlyMinigameComponent
): string | undefined {
  const md = component.metadata;
  if (md.kind !== "simple_race") {
    return "Invalid minigame";
  }

  if (md.start_ids.size === 0) {
    return "Missing start line";
  }

  if (md.end_ids.size === 0) {
    return "Missing finish line";
  }
}

export function handleSimpleRaceReachCheckpoint(
  minigameInstance: QueriedEntityWith<"minigame_instance" | "id">,
  minigameElement: QueriedEntityWith<"id">
) {
  const md = minigameInstance.mutableMinigameInstance();
  ok(md.state.kind === "simple_race");
  if (
    md.state.player_state === "waiting" ||
    md.state.reached_checkpoints.has(minigameElement.id)
  ) {
    return;
  }

  md.state.reached_checkpoints.set(minigameElement.id, {
    time: secondsSinceEpoch(),
  });
}

export async function finishRace(
  deps: ClientContextSubset<
    "events" | "gardenHose" | "userId" | "audioManager"
  >,
  minigameId: BiomesId,
  minigameInstanceId: BiomesId,
  minigameElementId: BiomesId
) {
  deps.audioManager.playSound("checkpoint_reached");
  await deps.events.publish(
    new FinishSimpleRaceMinigameEvent({
      id: deps.userId,
      minigame_id: minigameId,
      minigame_instance_id: minigameInstanceId,
      minigame_element_id: minigameElementId,
    })
  );

  deps.gardenHose.publish({
    kind: "minigame_simple_race_finish",
    minigameId,
    minigameInstanceId,
  });
}

export async function reachRaceStart(
  deps: ClientContextSubset<
    "events" | "gardenHose" | "userId" | "audioManager"
  >,
  minigameId: BiomesId,
  minigameInstanceId: BiomesId,
  minigameElementId: BiomesId
) {
  deps.audioManager.playSound("checkpoint_reached");
  await deps.events.publish(
    new ReachStartSimpleRaceMinigameEvent({
      id: deps.userId,
      minigame_id: minigameId,
      minigame_instance_id: minigameInstanceId,
      minigame_element_id: minigameElementId,
    })
  );
}

export function reachCheckpointEagerly(
  deps: ClientContextSubset<
    "resources" | "events" | "table" | "userId" | "audioManager"
  >,
  minigameId: BiomesId,
  minigameInstanceId: BiomesId,
  checkpointId: BiomesId
) {
  const currentMinigame = deps.table.get(minigameId)?.minigame_component;
  const currentInstance = deps.table.get(minigameInstanceId)?.minigame_instance;
  if (currentInstance && currentInstance.state.kind === "simple_race") {
    deps.table.layers.eagerApply({
      kind: "update",
      entity: {
        id: minigameInstanceId,
        minigame_instance: {
          ...currentInstance,
          state: {
            ...currentInstance.state,
            reached_checkpoints: new Map([
              ...currentInstance.state.reached_checkpoints.entries(),
              [checkpointId, { time: secondsSinceEpoch() }],
            ]),
          },
        },
      },
    });

    if (!currentInstance.state.reached_checkpoints.has(checkpointId)) {
      const totalCount =
        currentMinigame?.metadata.kind === "simple_race"
          ? currentMinigame?.metadata.checkpoint_ids.size ?? 0
          : 0;
      const amt = currentInstance.state.reached_checkpoints.size + 1;
      addToast(deps.resources, {
        id: checkpointId,
        kind: "basic",
        message: `Checkpoint Cleared (${amt}/${totalCount})`,
      });
      deps.audioManager.playSound("checkpoint_reached");
    }
  }

  deps.resources.invalidate("/scene/placeable/mesh", checkpointId);

  fireAndForget(
    deps.events.publish(
      new ReachCheckpointSimpleRaceMinigameEvent({
        id: deps.userId,
        minigame_id: minigameId,
        minigame_element_id: checkpointId,
        minigame_instance_id: minigameInstanceId,
      })
    )
  );
}

// Returns false if not in minigame
export function checkpointHasBeenReached(
  deps: ClientContextSubset<"userId">,
  checkpointId: BiomesId,
  resources: ClientResourceDeps | ClientResources
) {
  const activeMinigame = resources.get("/ecs/c/playing_minigame", deps.userId);
  if (!activeMinigame) {
    return false;
  }

  const activeInstance = resources.get(
    "/ecs/c/minigame_instance",
    activeMinigame.minigame_instance_id
  );

  const state = activeInstance?.state;
  return (
    state?.kind === "simple_race" && state.reached_checkpoints.has(checkpointId)
  );
}

export function reachedAllCheckpoints(
  minigame: ReadonlyMinigameComponent,
  minigameInstance: ReadonlyMinigameInstance
) {
  return (
    minigame.metadata.kind === "simple_race" &&
    minigameInstance.state.kind === "simple_race" &&
    minigameInstance.state.reached_checkpoints.size ===
      minigame.metadata.checkpoint_ids.size
  );
}
