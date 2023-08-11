import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import { setCurrentBiscuit } from "@/client/game/resources/bikkie";
import { terrainIdToBlock } from "@/shared/bikkie/terrain";
import { hitExistingTerrain } from "@/shared/game/spatial";

export class BikkieWandItemSpec implements AttackDestroyDelegateSpec {
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

  onPrimaryDown(itemInfo: ClickableItemInfo) {
    if (!itemInfo.item) {
      return false;
    }

    const { hit } = this.deps.resources.get("/scene/cursor");

    if (hit?.kind === "entity") {
      const { entity } = hit;
      if (entity.placeable_component) {
        setCurrentBiscuit(
          this.deps.resources,
          entity.placeable_component.item_id
        );
        return true;
      } else if (entity.npc_metadata) {
        setCurrentBiscuit(this.deps.resources, entity.npc_metadata.type_id);
        return true;
      } else if (entity.loose_item) {
        setCurrentBiscuit(this.deps.resources, entity.loose_item.item.id);
        return true;
      }
    } else if (hitExistingTerrain(hit)) {
      const block = terrainIdToBlock(hit.terrainId);
      if (block?.id) {
        setCurrentBiscuit(this.deps.resources, block.id);
        return true;
      }
    }
    return false;
  }
}
