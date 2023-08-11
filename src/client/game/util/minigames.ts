import type { ClientContextSubset } from "@/client/game/context";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { QuitMinigameEvent } from "@/shared/ecs/gen/events";
import type { MinigameType } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { capitalize } from "lodash";

export async function handleQuitMinigame(
  deps: ClientContextSubset<"events" | "userId" | "gardenHose" | "resources">,
  minigameId: BiomesId,
  minigameInstanceId: BiomesId
) {
  const player = deps.resources.get("/scene/local_player");
  // Don't allow fall damage until the player lands on the ground.
  // Prevents dying after ending "Spleef in the Sky", for instance.
  player.fallAllowsDamage = false;
  await deps.events.publish(
    new QuitMinigameEvent({
      id: deps.userId,
      minigame_id: minigameId,
      minigame_instance_id: minigameInstanceId,
    })
  );
  deps.gardenHose.publish({
    kind: "minigame_quit",
    minigameId,
    minigameInstanceId,
  });
}

export function minigameName(minigame?: ReadonlyEntity) {
  if (!minigame) {
    return;
  }
  return (
    minigame?.label?.text ??
    defaultMinigameName(minigame.minigame_component?.metadata.kind)
  );
}

export function defaultMinigameName(type?: MinigameType) {
  switch (type) {
    case "simple_race":
      return "Race";
    default:
      return capitalize(type);
  }
}
