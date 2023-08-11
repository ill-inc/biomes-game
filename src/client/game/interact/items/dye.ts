import { AttackDestroyInteractionError } from "@/client/game/interact/errors";
import { changeRadius } from "@/client/game/interact/helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import type { DyeName } from "@/shared/asset_defs/blocks";
import { getDyeID } from "@/shared/asset_defs/blocks";
import { terrainDyeable } from "@/shared/asset_defs/quirk_helpers";
import { DyeBlockEvent } from "@/shared/ecs/gen/events";
import { voxelShard } from "@/shared/game/shard";
import { hitExistingTerrain } from "@/shared/game/spatial";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { fireAndForget } from "@/shared/util/async";
import type { Dir } from "@/shared/wasm/types/common";

function dyeBlock(
  deps: InteractContext<
    "resources" | "events" | "permissionsManager" | "userId"
  >,
  pos: ReadonlyVec3,
  dir: Dir,
  dye: number
) {
  // TODO: Update this to happen eagerly
  // TODO: Remove the dye from the player's inventory.
  // TODO: Add a dedicated ACL for dyeing
  if (!deps.permissionsManager.getPermissionForAction(pos, "place")) {
    return false;
  }

  const shardId = voxelShard(...pos);
  // Dye the block.
  const entity = deps.resources.get("/ecs/terrain", shardId);
  if (entity) {
    fireAndForget(
      (async () =>
        deps.events.publish(
          new DyeBlockEvent({
            id: entity.id,
            dye: dye,
            position: pos,
            user_id: deps.userId,
          })
        ))()
    );
    deps.actionThrottler.use("place");
  }
}

export class DyeItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly deps: InteractContext<
      "resources" | "permissionsManager" | "events" | "userId"
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

    if (
      !this.deps.permissionsManager.getPermissionForAction(hit.pos, "place")
    ) {
      throw new AttackDestroyInteractionError({
        kind: "acl_permission",
        action: "place",
        pos: hit.pos,
      });
    }

    const dyeID = getDyeID(itemInfo.item.dyeColor as DyeName);
    if (!dyeID) {
      return false;
    }

    if (!hit.terrainId || !terrainDyeable(hit.terrainId)) {
      return false;
    }

    if (hit.distance <= changeRadius(this.deps.resources)) {
      dyeBlock(this.deps, hit.pos, hit.face, dyeID);
      const player = this.deps.resources.get("/scene/local_player").player;
      player.eagerEmote(this.deps.events, this.deps.resources, "place");
      return true;
    }

    return false;
  }
}
