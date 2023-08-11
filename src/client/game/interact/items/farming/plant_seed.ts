import { groupOccupancyAt } from "@/client/game/helpers/occupancy";
import { AttackDestroyInteractionErrorMessage } from "@/client/game/interact/errors";
import { changeRadius, plantSeed } from "@/client/game/interact/helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import { BikkieIds } from "@/shared/bikkie/ids";
import { terrainIdToBlock } from "@/shared/bikkie/terrain";
import { anItem } from "@/shared/game/item";
import type { BlueprintHit, TerrainHit } from "@/shared/game/spatial";
import { hitExistingTerrain } from "@/shared/game/spatial";
import { compactMap } from "@/shared/util/collections";

export class PlantSeedItemSpec implements AttackDestroyDelegateSpec {
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
      this.plantSeed(itemInfo, hit);
      return true;
    }

    return false;
  }

  private plantSeed(
    itemInfo: ClickableItemInfo,
    hit: TerrainHit | BlueprintHit
  ) {
    const { pos, terrainId: terrainId } = hit;
    if (groupOccupancyAt(this.deps.resources, pos)) {
      throw new AttackDestroyInteractionErrorMessage(
        "Can't plant seed in a group."
      );
    }

    const block = terrainIdToBlock(terrainId);
    const plantableBlocks = anItem(itemInfo.item)?.plantableBlocks;
    if (!block || !plantableBlocks || !plantableBlocks.includes(block.id)) {
      const plantableBlockNames = compactMap(
        plantableBlocks,
        (id) => anItem(id)?.displayName
      );
      if (plantableBlockNames.length === 0) {
        throw new AttackDestroyInteractionErrorMessage(
          "This seed is unplantable"
        );
      }
      if (
        plantableBlocks &&
        plantableBlocks.length === 1 &&
        plantableBlocks[0] === BikkieIds.tilledSoil
      ) {
        throw new AttackDestroyInteractionErrorMessage(
          `Use a Hoe to till before planting`
        );
      }
      throw new AttackDestroyInteractionErrorMessage(
        `Must plant seed on ${plantableBlockNames.join(", ")}.`
      );
    }
    const allowed = this.deps.permissionsManager.clientActionAllowedAt(
      "plantSeed",
      pos
    );

    if (!allowed) {
      throw new AttackDestroyInteractionErrorMessage(
        "Not allowed to plant seed here"
      );
    }

    const player = this.deps.resources.get("/scene/local_player").player;
    player.eagerEmote(this.deps.events, this.deps.resources, "diggingHand");
    plantSeed(this.deps, pos, itemInfo.itemRef);
  }
}
