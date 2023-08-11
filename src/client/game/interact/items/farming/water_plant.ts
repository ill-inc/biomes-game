import { plantExperimentalAt } from "@/client/game/helpers/farming";
import { MarchHelper } from "@/client/game/helpers/march";
import { waterAt } from "@/client/game/helpers/water";
import { AttackDestroyInteractionErrorMessage } from "@/client/game/interact/errors";
import {
  changeRadius,
  iterateInteractPattern,
  replenishWater,
  waterPlants,
} from "@/client/game/interact/helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import type { BlueprintHit, TerrainHit } from "@/shared/game/spatial";
import { hitExistingTerrain } from "@/shared/game/spatial";
import type { BiomesId } from "@/shared/ids";
import type { Vec3 } from "@/shared/math/types";
import { compactMap } from "@/shared/util/collections";

export class WaterPlantItemSpec implements AttackDestroyDelegateSpec {
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
    const { hit } = this.deps.resources.get("/scene/cursor");

    if (!hitExistingTerrain(hit)) {
      return false;
    }

    if (hit.distance <= changeRadius(this.deps.resources)) {
      if (this.waterPlants(itemInfo, hit)) {
        return true;
      }
    }
    if (this.replenishWater(itemInfo)) {
      return true;
    }
    throw new AttackDestroyInteractionErrorMessage("No plant here.");
  }

  private waterPlants(
    itemInfo: ClickableItemInfo,
    hit: TerrainHit | BlueprintHit
  ) {
    const { pos } = hit;

    // If we don't hit a plant directly, don't water, so that
    // you can still replenish if a plant is next to water
    if (!plantExperimentalAt(this.deps.resources, pos)) {
      return false;
    }

    // Find plants around the hit position.
    const player = this.deps.resources.get("/scene/local_player").player;
    const plants = new Set<BiomesId>(
      compactMap(iterateInteractPattern(player, pos, itemInfo.item), (pos) =>
        plantExperimentalAt(this.deps.resources, pos)
      )
    );

    if (plants.size === 0) {
      return false;
    }
    const waterLevel = itemInfo.item?.waterAmount;
    if (!waterLevel) {
      throw new AttackDestroyInteractionErrorMessage("No water in can.");
    }
    player.eagerEmote(this.deps.events, this.deps.resources, "watering");

    waterPlants(this.deps, Array.from(plants), itemInfo.itemRef);
    return true;
  }

  private replenishWater(itemInfo: ClickableItemInfo) {
    // Water doesn't terminate the cursor ray march, so ray march ourselves here.
    const ray = MarchHelper.getCameraRayParams(
      this.deps.resources,
      changeRadius(this.deps.resources)
    );
    let waterHit: Vec3 | undefined;
    this.deps.voxeloo.march_faces(ray.cameraPos, ray.dir, (x, y, z, d, _f) => {
      if (d > ray.castDist) {
        return false;
      }
      const water = waterAt(this.deps.resources, [x, y, z]);
      if (water) {
        waterHit = [x, y, z];
        return false;
      }
      return true;
    });
    if (!waterHit) {
      return false;
    }
    const player = this.deps.resources.get("/scene/local_player").player;
    player.eagerEmote(this.deps.events, this.deps.resources, "watering");
    replenishWater(this.deps, waterHit, itemInfo.itemRef);
    return true;
  }
}
