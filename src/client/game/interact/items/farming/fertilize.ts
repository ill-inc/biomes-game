import { plantExperimentalAt } from "@/client/game/helpers/farming";
import { AttackDestroyInteractionErrorMessage } from "@/client/game/interact/errors";
import { changeRadius, fertilizePlant } from "@/client/game/interact/helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import type { BlueprintHit, TerrainHit } from "@/shared/game/spatial";
import { hitExistingTerrain } from "@/shared/game/spatial";

export class FertilizeItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly deps: InteractContext<
      "userId" | "input" | "resources" | "permissionsManager" | "events"
    >
  ) {}

  onPrimaryDown(itemInfo: ClickableItemInfo) {
    const { hit } = this.deps.resources.get("/scene/cursor");

    if (!hitExistingTerrain(hit)) {
      return false;
    }

    if (hit.distance <= changeRadius(this.deps.resources)) {
      this.fertilizePlant(itemInfo, hit);
      return true;
    }

    return false;
  }

  private fertilizePlant(
    itemInfo: ClickableItemInfo,
    hit: TerrainHit | BlueprintHit
  ) {
    const { pos } = hit;
    const plantId = plantExperimentalAt(this.deps.resources, pos);
    if (!plantId) {
      throw new AttackDestroyInteractionErrorMessage("No plant here");
    }
    const player = this.deps.resources.get("/scene/local_player").player;
    player.eagerEmote(this.deps.events, this.deps.resources, "watering");
    fertilizePlant(this.deps, pos, itemInfo.itemRef);
  }
}
