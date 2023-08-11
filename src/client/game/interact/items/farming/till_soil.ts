import { groupOccupancyAt } from "@/client/game/helpers/occupancy";
import { AttackDestroyInteractionErrorMessage } from "@/client/game/interact/errors";
import {
  changeRadius,
  iterateInteractPattern,
  tillSoil,
} from "@/client/game/interact/helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type {
  DestroyInfo,
  InteractContext,
} from "@/client/game/interact/types";
import { terrainIdToBlock } from "@/shared/bikkie/terrain";
import type { BlueprintHit, TerrainHit } from "@/shared/game/spatial";
import { hitExistingTerrain } from "@/shared/game/spatial";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import { equals } from "@/shared/math/linear";
import { compactMap } from "@/shared/util/collections";

const TILL_TIME_MS = 1000;

export class TillSoilItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly deps: InteractContext<
      | "userId"
      | "input"
      | "resources"
      | "permissionsManager"
      | "events"
      | "voxeloo"
    >
  ) {}

  onPrimaryDown(itemInfo: ClickableItemInfo) {
    if (this.startTilling(itemInfo)) {
      return true;
    }
    return false;
  }

  get destroyInfo() {
    return this.deps.resources.get("/scene/local_player").destroyInfo;
  }

  set destroyInfo(newInfo: DestroyInfo | undefined) {
    this.deps.resources.get("/scene/local_player").destroyInfo = newInfo;
  }

  get localPlayer() {
    return this.deps.resources.get("/scene/local_player").player;
  }

  onPrimaryUp() {
    this.stopTilling();
    this.destroyInfo = undefined;
    return true;
  }

  onPrimaryHoldTick(itemInfo: ClickableItemInfo) {
    if (!this.destroyInfo || this.destroyInfo.activeAction.action !== "till") {
      this.startTilling(itemInfo);
      return true;
    }
    const { hit } = this.deps.resources.get("/scene/cursor");
    if (!hit || !hitExistingTerrain(hit)) {
      this.destroyInfo = undefined;
      return false;
    }
    const secondsSinceEpoch = this.deps.resources.get("/clock").time;

    if (!this.localPlayer.isEmoting(secondsSinceEpoch, "destroy")) {
      this.localPlayer.eagerEmote(
        this.deps.events,
        this.deps.resources,
        "destroy"
      );
    }

    if (!equals(this.destroyInfo.pos, hit.pos)) {
      this.startTilling(itemInfo);
    }

    if (!terrainIdToBlock(hit.terrainId)?.isTillable) {
      this.stopTilling();
      return true;
    }
    if (this.destroyInfo?.finished) {
      return true;
    }

    const actionDelta = 1000 * (secondsSinceEpoch - this.destroyInfo.start);

    if (actionDelta > this.destroyInfo.actionTimeMs) {
      this.tillSoil(itemInfo, hit);
      this.stopTilling();
    } else if (this.destroyInfo) {
      this.destroyInfo.percentage = actionDelta / this.destroyInfo.actionTimeMs;
    }
    return true;
  }

  private startTilling(itemInfo: ClickableItemInfo) {
    const { hit } = this.deps.resources.get("/scene/cursor");

    if (!hitExistingTerrain(hit)) {
      this.stopTilling();
      return false;
    }

    const allowed = this.deps.permissionsManager.clientActionAllowedAt(
      "tillSoil",
      hit.pos
    );

    if (hit.distance <= changeRadius(this.deps.resources)) {
      const secondsSinceEpoch = this.deps.resources.get("/clock").time;
      if (terrainIdToBlock(hit.terrainId)?.isTillable) {
        // Hardness >= 10 is an admin hoe; don't require time
        const actionTimeMs =
          (itemInfo.item?.hardnessClass ?? 0) < 10 ? TILL_TIME_MS : 0;
        if (actionTimeMs > 0) {
          // If tillable, till. Otherwise, fallback
          this.destroyInfo = {
            start: secondsSinceEpoch,
            pos: hit.pos,
            face: hit.face,
            canDestroy: true,
            allowed,
            hardnessClass: 0,
            activeAction: {
              ...this.destroyInfo?.activeAction,
              action: "till",
            },
            finished: false,
            actionTimeMs,
          };
        } else {
          this.tillSoil(itemInfo, hit);
        }
        return true;
      }
    }
    this.stopTilling();
    return false;
  }

  private stopTilling() {
    if (this.destroyInfo?.activeAction.action === "till") {
      this.destroyInfo.finished = true;
    }
    const secondsSinceEpoch = this.deps.resources.get("/clock").time;
    if (this.localPlayer.isEmoting(secondsSinceEpoch, "destroy")) {
      this.localPlayer.eagerCancelEmote(this.deps.events);
    }
  }

  private tillSoil(
    itemInfo: ClickableItemInfo,
    hit: TerrainHit | BlueprintHit
  ) {
    const { pos } = hit;
    if (groupOccupancyAt(this.deps.resources, pos)) {
      throw new AttackDestroyInteractionErrorMessage(
        "Can't till soil with a group occupying the space."
      );
    }

    this.localPlayer.eagerEmote(
      this.deps.events,
      this.deps.resources,
      "diggingTool"
    );

    const terrainHelper = TerrainHelper.fromResources(
      this.deps.voxeloo,
      this.deps.resources
    );

    const tillablePos = compactMap(
      iterateInteractPattern(this.localPlayer, pos, itemInfo.item),
      (pos) => {
        const block = terrainHelper.getTerrainID(pos);
        if (!terrainIdToBlock(block)?.isTillable) {
          return undefined;
        }
        return pos;
      }
    );
    if (tillablePos.length === 0) {
      // For untillable blocks, fall back to destroy
      throw new AttackDestroyInteractionErrorMessage(
        "This block is not tillable."
      );
    }
    const allowedPos = tillablePos.filter((pos) => {
      return this.deps.permissionsManager.clientActionAllowedAt(
        "tillSoil",
        pos
      );
    });
    if (allowedPos.length === 0) {
      throw new AttackDestroyInteractionErrorMessage(
        "Not allowed to till here."
      );
    }

    tillSoil(this.deps, pos, allowedPos, itemInfo.itemRef);
  }
}
