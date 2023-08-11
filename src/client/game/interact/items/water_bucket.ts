import { AttackDestroyInteractionError } from "@/client/game/interact/errors";
import {
  changeRadius,
  dumpWater,
  scoopWater,
} from "@/client/game/interact/helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import { hitExistingTerrain } from "@/shared/game/spatial";

export class WaterBucketItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly deps: InteractContext<
      | "resources"
      | "permissionsManager"
      | "events"
      | "gardenHose"
      | "userId"
      | "table"
      | "voxeloo"
    >
  ) {}

  onPrimaryDown(itemInfo: ClickableItemInfo) {
    if (!itemInfo.item) {
      return false;
    }

    const { hit } = this.deps.resources.get("/scene/cursor");

    if (!hitExistingTerrain(hit)) {
      return false;
    }

    if (!this.deps.permissionsManager.getPermissionForAction(hit.pos, "dump")) {
      throw new AttackDestroyInteractionError({
        kind: "acl_permission",
        action: "dump",
        pos: hit.pos,
      });
    }

    if (hit.distance <= changeRadius(this.deps.resources)) {
      if (!scoopWater(this.deps, hit.distance)) {
        dumpWater(this.deps, hit.pos, hit.face);
      }
      const player = this.deps.resources.get("/scene/local_player").player;
      player.eagerEmote(this.deps.events, this.deps.resources, "place");
      return true;
    }

    return false;
  }
}
