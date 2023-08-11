import type { ClientContext } from "@/client/game/context";
import { ParticleSystem } from "@/client/game/resources/particles";
import {
  clearParticleSystems,
  setParticleSystems,
} from "@/client/game/resources/placeables/helpers";
import type {
  AnimatedPlaceableMesh,
  SimpleRaceInfo,
} from "@/client/game/resources/placeables/types";
import type { ClientResourceDeps } from "@/client/game/resources/types";
import {
  checkpointActiveParticleMaterials,
  checkpointCompleteParticleMaterials,
} from "@/client/game/util/particles_systems";
import { checkpointHasBeenReached } from "@/server/shared/minigames/simple_race/util";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { Item } from "@/shared/game/item";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";

function getSimpleRaceState(
  context: ClientContext,
  deps: ClientResourceDeps,
  mesh: AnimatedPlaceableMesh,
  item: Item,
  elementMinigameId: BiomesId | undefined
): SimpleRaceInfo["particleSystemState"] {
  const playingMinigame = deps.get("/ecs/c/playing_minigame", context.userId);
  if (playingMinigame?.minigame_id !== elementMinigameId) {
    return "none";
  }

  if (!playingMinigame) {
    if (
      mesh.simpleRaceInfo?.particleSystemState === "active" ||
      mesh.simpleRaceInfo?.particleSystemState === "complete"
    ) {
      return "complete";
    }
    return "none";
  }

  const minigameInstance = deps.get(
    "/ecs/c/minigame_instance",
    playingMinigame.minigame_instance_id
  );
  if (!minigameInstance || minigameInstance.state.kind !== "simple_race") {
    return "none";
  }

  if (item.id === BikkieIds.simpleRaceFinish) {
    if (minigameInstance.state.player_state !== "racing") {
      return "none";
    }
    return "active";
  } else if (item.id === BikkieIds.simpleRaceStart) {
    return minigameInstance.state.player_state === "racing"
      ? "complete"
      : "active";
  } else {
    if (minigameInstance.state.player_state !== "racing") {
      return "none";
    }
    return checkpointHasBeenReached(context, mesh.placeableId, deps)
      ? "complete"
      : "active";
  }
}

export async function updateSimpleRaceInfo(
  context: ClientContext,
  deps: ClientResourceDeps,
  mesh: AnimatedPlaceableMesh
) {
  const placeableComponent = deps.get(
    "/ecs/c/placeable_component",
    mesh.placeableId
  );
  if (!placeableComponent) {
    return;
  }

  const placeableItem = anItem(placeableComponent.item_id);

  if (
    !placeableItem.isCheckpoint &&
    placeableItem.id !== BikkieIds.simpleRaceFinish &&
    placeableItem.id !== BikkieIds.simpleRaceStart
  ) {
    return;
  }

  const minigameElement = deps.get("/ecs/c/minigame_element", mesh.placeableId);

  const newState = getSimpleRaceState(
    context,
    deps,
    mesh,
    placeableItem,
    minigameElement?.minigame_id
  );

  if (
    !mesh.simpleRaceInfo ||
    mesh.simpleRaceInfo.particleSystemState !== newState
  ) {
    mesh.simpleRaceInfo = { particleSystemState: newState };
    clearParticleSystems(mesh);

    if (newState !== "none") {
      const clock = deps.get("/clock");
      const boxSize = anItem(placeableComponent.item_id).boxSize;
      const material =
        newState === "complete"
          ? await checkpointCompleteParticleMaterials(boxSize)
          : await checkpointActiveParticleMaterials(boxSize);
      const particles = new ParticleSystem(material, clock.time);
      setParticleSystems(mesh, particles);
    }
  }
}
