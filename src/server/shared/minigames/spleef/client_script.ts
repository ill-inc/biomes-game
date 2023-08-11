import type { GardenHoseEventOfKind } from "@/client/events/api";
import type { ClientContextSubset } from "@/client/game/context";
import type { Script } from "@/client/game/scripts/script_controller";
import { cleanEmitterCallback } from "@/client/util/helpers";
import { isReadonlyMinigameInstanceOfStateKind } from "@/server/shared/minigames/type_utils";
import { TagMinigameHitPlayerEvent } from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { ok } from "assert";

export class SpleefClientScript implements Script {
  readonly name = "spleefClient";

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
        start_collide_entity: (ev) => {
          this.onStartCollideEntity(ev);
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

  private onStartCollideEntity(
    ev: GardenHoseEventOfKind<"start_collide_entity">
  ) {
    if (ev.entityId === this.deps.userId) {
      return;
    }
    if (this.minigameInstance.state.instance_state.kind !== "playing_round") {
      return;
    }

    if (
      !this.minigameInstance.state.instance_state.alive_round_players.has(
        ev.entityId
      )
    ) {
      return;
    }

    if (
      this.minigameInstance.state.instance_state.tag_round_state?.it_player !==
      this.deps.userId
    ) {
      return;
    }

    this.taggedHitPlayer(ev.entityId);
  }

  private taggedHitPlayer(entityId: BiomesId) {
    fireAndForget(
      this.deps.events.publish(
        new TagMinigameHitPlayerEvent({
          id: this.deps.userId,
          minigame_id: this.minigameId,
          minigame_instance_id: this.minigameInstanceId,
          hit_player_id: entityId,
        })
      )
    );
  }

  private get minigameInstance() {
    const ret = this.deps.resources.get(
      "/ecs/c/minigame_instance",
      this.minigameInstanceId
    );
    ok(isReadonlyMinigameInstanceOfStateKind(ret, "spleef"));
    return ret;
  }
}
