import { doCreateCraftingStation } from "@/client/game/helpers/blueprint";
import { handleWandInteraction } from "@/client/game/interact/helpers";
import { isPotentialGroupVoxel } from "@/client/game/interact/item_types/attack_destroy_delegate_item_helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import { hitExistingTerrain } from "@/shared/game/spatial";
import { isEqual } from "lodash";

const MAX_WAND_DISTANCE = 32;

export class WandItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly deps: InteractContext<
      | "resources"
      | "permissionsManager"
      | "events"
      | "gardenHose"
      | "userId"
      | "table"
    >
  ) {}

  onUnselected() {
    this.deps.resources.set("/groups/src", {});
    return true;
  }

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
      return false;
    }

    if (
      hit.kind === "blueprint" &&
      hit.distance <= MAX_WAND_DISTANCE &&
      this.deps.resources.get("/groups/blueprint/state", hit.blueprintEntityId)
        .completed
    ) {
      doCreateCraftingStation(
        this.deps.resources,
        this.deps.events,
        hit.blueprintEntityId
      );
      return true;
    } else if (
      hit.kind === "terrain" &&
      hit.distance <= MAX_WAND_DISTANCE &&
      handleWandInteraction(this.deps, hit.pos)
    ) {
      return true;
    }

    return false;
  }

  onTick() {
    const { hit } = this.deps.resources.get("/scene/cursor");

    // If the wand is selected, update the source position.
    const currentPos = this.deps.resources.get("/groups/src");
    if (hit?.kind === "terrain" && !isEqual(hit.pos, currentPos.pos)) {
      if (
        isPotentialGroupVoxel(
          this.deps.resources,
          this.deps.permissionsManager,
          hit.pos
        )
      ) {
        this.deps.resources.set("/groups/src", { pos: hit.pos });
      } else {
        this.deps.resources.set("/groups/src", {});
      }
    } else if (hit?.kind !== "terrain" && currentPos.pos) {
      this.deps.resources.set("/groups/src", {});
    }

    return false;
  }
}
