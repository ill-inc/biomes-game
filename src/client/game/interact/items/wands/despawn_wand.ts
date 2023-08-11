import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import { DespawnWandEvent } from "@/shared/ecs/gen/events";
import { dist } from "@/shared/math/linear";
import { fireAndForget } from "@/shared/util/async";

const DESPAWN_WAND_HIT_DISTANCE = 15;

export class DespawnWantItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly ctx: InteractContext<
      "resources" | "events" | "userId" | "authManager"
    >
  ) {}

  onPrimaryDown(_itemInfo: ClickableItemInfo) {
    return false;
  }

  onSecondaryDown(itemInfo: ClickableItemInfo) {
    const { authManager, resources, userId } = this.ctx;
    const { hit } = resources.get("/scene/cursor");
    const player = resources.get("/scene/local_player").player;
    const isAllowed = authManager.currentUser.hasSpecialRole("admin");
    if (!isAllowed) {
      return false;
    }

    if (hit?.kind !== "entity") {
      return false;
    }
    const entity = hit.entity;

    if (entity.npc_metadata === undefined) {
      return false;
    }

    if (dist(hit?.pos, player.position) > DESPAWN_WAND_HIT_DISTANCE) {
      return false;
    }

    fireAndForget(
      this.ctx.events.publish(
        new DespawnWandEvent({
          id: userId,
          item_ref: itemInfo.itemRef,
          entityId: entity.id,
        })
      )
    );

    this.ctx.actionThrottler.use("despawnWand");
    return false;
  }
}
