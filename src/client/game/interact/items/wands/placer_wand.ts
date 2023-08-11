import { addToast } from "@/client/components/toast/helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import { ClearPlacerEvent, PlacerWandEvent } from "@/shared/ecs/gen/events";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import { distManhattan } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { fireAndForget } from "@/shared/util/async";
import { dfsVoxels } from "@/shared/util/dfs";
import { getNowMs } from "@/shared/util/helpers";

const PLACER_WAND_HIT_DISTANCE = 20;
const PLACER_WAND_DFS_DISTANCE = 30;

export class PlacerWandItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly ctx: InteractContext<
      "resources" | "events" | "userId" | "voxeloo" | "marchHelper"
    >
  ) {}

  onPrimaryDown(itemInfo: ClickableItemInfo) {
    const hit = this.ctx.marchHelper.terrainHitAlongCameraRay(
      this.ctx.resources,
      PLACER_WAND_HIT_DISTANCE
    );
    if (!hit?.terrainId) {
      return false;
    }

    const helper = TerrainHelper.fromResources(
      this.ctx.voxeloo,
      this.ctx.resources
    );
    if (!isCandidate(helper, hit.pos)) {
      return false;
    }

    // DFS to find all blocks of the same type without a placer.
    const domain = [hit.pos];
    dfsVoxels(hit.pos, (pos) => {
      if (
        helper.getTerrainID(pos) === hit.terrainId &&
        isCandidate(helper, pos)
      ) {
        domain.push(pos);
        return distManhattan(hit.pos, pos) <= PLACER_WAND_DFS_DISTANCE;
      }
    });

    fireAndForget(
      this.ctx.events.publish(
        new PlacerWandEvent({
          id: this.ctx.userId,
          item_ref: itemInfo.itemRef,
          positions: domain,
        })
      )
    );

    this.ctx.actionThrottler.use("placerWand");
    return true;
  }

  onSecondaryDown(itemInfo: ClickableItemInfo) {
    const hit = this.ctx.marchHelper.terrainHitAlongCameraRay(
      this.ctx.resources,
      PLACER_WAND_HIT_DISTANCE
    );
    if (!hit?.terrainId) {
      return false;
    }

    const helper = TerrainHelper.fromResources(
      this.ctx.voxeloo,
      this.ctx.resources
    );
    if (!isCandidate(helper, hit.pos)) {
      return false;
    }

    fireAndForget(
      this.ctx.events.publish(
        new ClearPlacerEvent({
          id: this.ctx.userId,
          item_ref: itemInfo.itemRef,
          positions: [hit.pos],
        })
      )
    );

    addToast(this.ctx.resources, {
      id: Math.floor(getNowMs() / 1000.0),
      kind: "basic",
      message: "cleared placer",
    });

    this.ctx.actionThrottler.use("placerWand");
    return true;
  }
}

function isCandidate(helper: TerrainHelper, pos: ReadonlyVec3) {
  return !helper.getOccupancyID(pos);
}
