import { addToast } from "@/client/components/toast/helpers";
import type { GardenHoseEventOfKind } from "@/client/events/api";
import type { ClientContextSubset } from "@/client/game/context";
import type { Script } from "@/client/game/scripts/script_controller";
import { cleanEmitterCallback } from "@/client/util/helpers";
import {
  checkpointHasBeenReached,
  finishRace,
  reachCheckpointEagerly,
  reachedAllCheckpoints,
  reachRaceStart,
} from "@/server/shared/minigames/simple_race/util";
import {
  isReadonlyMinigameComponentOfMetadataKind,
  isReadonlyMinigameInstanceOfStateKind,
} from "@/server/shared/minigames/type_utils";
import { BikkieIds } from "@/shared/bikkie/ids";
import { anItem } from "@/shared/game/item";

import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { ok } from "assert";

export class SimpleRaceClientScript implements Script {
  readonly name = "simpleRaceClient";

  private cleanUps: Array<() => unknown> = [];

  constructor(
    private deps: ClientContextSubset<
      | "userId"
      | "gardenHose"
      | "resources"
      | "audioManager"
      | "table"
      | "events"
    >,
    private minigameId: BiomesId,
    private minigameInstanceId: BiomesId
  ) {
    this.cleanUps.push(
      cleanEmitterCallback(deps.gardenHose, {
        start_ground_collide_entity: (ev) => {
          this.onStartGroundCollideEntity(ev);
        },
      })
    );
  }

  clear() {
    for (const cleanup of this.cleanUps) {
      cleanup();
    }
    this.cleanUps = [];
  }

  tick(_dt: number) {}

  private onStartGroundCollideEntity(
    ev: GardenHoseEventOfKind<"start_ground_collide_entity">
  ) {
    const placeable = this.deps.resources.get(
      "/ecs/c/placeable_component",
      ev.entityId
    );

    const minigameElement = this.deps.resources.get(
      "/ecs/c/minigame_element",
      ev.entityId
    );

    if (placeable && minigameElement?.minigame_id === this.minigameId) {
      if (anItem(placeable.item_id).isCheckpoint) {
        this.hitCheckpoint(ev.entityId);
      } else if (placeable.item_id === BikkieIds.simpleRaceFinish) {
        this.hitFinish(ev.entityId);
      } else if (placeable.item_id === BikkieIds.simpleRaceStart) {
        this.hitStart(ev.entityId);
      }
    }
  }

  private hitFinish(placeableId: BiomesId) {
    if (
      this.minigameInstance.state.player_state !== "racing" ||
      !reachedAllCheckpoints(this.minigameComponent, this.minigameInstance)
    ) {
      return;
    }

    fireAndForget(
      finishRace(
        this.deps,
        this.minigameId,
        this.minigameInstanceId,
        placeableId
      )
    );
  }

  private hitCheckpoint(placeableId: BiomesId) {
    if (
      this.minigameInstance.state.player_state !== "racing" ||
      checkpointHasBeenReached(
        this.deps,
        this.minigameInstanceId,
        this.deps.resources
      )
    ) {
      return;
    }

    reachCheckpointEagerly(
      this.deps,
      this.minigameId,
      this.minigameInstanceId,
      placeableId
    );
  }

  private hitStart(placeableId: BiomesId) {
    if (this.minigameInstance.state.player_state !== "waiting") {
      return;
    }

    if (this.minigameInstance.state.player_state === "waiting") {
      fireAndForget(
        reachRaceStart(
          this.deps,
          this.minigameId,
          this.minigameInstanceId,
          placeableId
        )
      );
    }

    fireAndForget(
      reachRaceStart(
        this.deps,
        this.minigameId,
        this.minigameInstanceId,
        placeableId
      )
    );
    const currentInstance = this.minigameInstance;
    this.deps.table.layers.eagerApply({
      kind: "update",
      entity: {
        id: this.minigameInstanceId,
        minigame_instance: {
          ...currentInstance,
          state: {
            ...currentInstance.state,
            player_state: "racing",
          },
        },
      },
    });
    addToast(this.deps.resources, {
      id: this.minigameInstanceId,
      kind: "basic",
      message: "Race Started!",
    });
  }

  private get minigameComponent() {
    const ret = this.deps.resources.get(
      "/ecs/c/minigame_component",
      this.minigameId
    );
    ok(isReadonlyMinigameComponentOfMetadataKind(ret, "simple_race"));
    return ret;
  }

  private get minigameInstance() {
    const ret = this.deps.resources.get(
      "/ecs/c/minigame_instance",
      this.minigameInstanceId
    );
    ok(isReadonlyMinigameInstanceOfStateKind(ret, "simple_race"));
    return ret;
  }
}
