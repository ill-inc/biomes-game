import { hasPreviewHologram } from "@/client/components/inventory/helpers";
import type { ClientContextSubset } from "@/client/game/context";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import { AttackDestroyDelegateItemSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import { ClickableItemScript } from "@/client/game/interact/item_types/clickable_item_script";
import type { PressAndHoldSpec } from "@/client/game/interact/item_types/press_and_hold_item_spec";
import { PressAndHoldItemSpec } from "@/client/game/interact/item_types/press_and_hold_item_spec";
import { BecomeNPCItemSpec } from "@/client/game/interact/items/become_npc";
import { CameraItemSpec } from "@/client/game/interact/items/camera";
import { ConsumableItemSpec } from "@/client/game/interact/items/consumable";
import { DestroyerItemSpec } from "@/client/game/interact/items/destroyer";
import { DyeItemSpec } from "@/client/game/interact/items/dye";
import { FertilizeItemSpec } from "@/client/game/interact/items/farming/fertilize";
import { PlantSeedItemSpec } from "@/client/game/interact/items/farming/plant_seed";
import { TillSoilItemSpec } from "@/client/game/interact/items/farming/till_soil";
import { WaterPlantItemSpec } from "@/client/game/interact/items/farming/water_plant";
import { FishingItemSpec } from "@/client/game/interact/items/fishing";
import { HomestoneItemSpec } from "@/client/game/interact/items/homestone";
import { PlaceableItemSpec } from "@/client/game/interact/items/placeable";
import { PreviewableItemSpec } from "@/client/game/interact/items/previewable";
import { ShapeItemSpec } from "@/client/game/interact/items/shape";
import { ShaperItemSpec } from "@/client/game/interact/items/shaper";
import { TerrainSpec } from "@/client/game/interact/items/terrain";
import { TreasureItemSpec } from "@/client/game/interact/items/treasure";
import { BikkieWandItemSpec } from "@/client/game/interact/items/wands/bikkie";
import { DespawnWantItemSpec } from "@/client/game/interact/items/wands/despawn_wand";
import { NegaWandItemSpec } from "@/client/game/interact/items/wands/nega_wand";
import { PlacerWandItemSpec } from "@/client/game/interact/items/wands/placer_wand";
import { SpaceClipboardWandItemSpec } from "@/client/game/interact/items/wands/space_clipboard";
import { WandItemSpec } from "@/client/game/interact/items/wands/wand";
import { WaterBucketItemSpec } from "@/client/game/interact/items/water_bucket";
import { WaypointCameraItemSpec } from "@/client/game/interact/items/waypoint_cam";
import type {
  ActionType,
  ActiveItemScript,
} from "@/client/game/interact/types";
import { setCurrentBiscuit } from "@/client/game/resources/bikkie";
import type { HotBarSelection } from "@/client/game/resources/inventory";
import type { Script } from "@/client/game/scripts/script_controller";
import type { OwnedItemReference } from "@/shared/ecs/gen/types";
import { TimeWindow } from "@/shared/util/throttling";
import { cloneDeep, isEqual } from "lodash";

const MIN_ACTION_DELAY_MS = 200;

export class InteractScript implements Script {
  readonly name = "interact";

  private lastSelectionChangeSpec?: ReturnType<
    typeof InteractScript.prototype.selectionChangeSpec
  >;
  private lastActiveScript?: ActiveItemScript;
  private actionThrottler = new TimeWindow<ActionType>(MIN_ACTION_DELAY_MS);

  constructor(
    private readonly deps: ClientContextSubset<
      | "audioManager"
      | "authManager"
      | "events"
      | "gardenHose"
      | "input"
      | "mailman"
      | "marchHelper"
      | "permissionsManager"
      | "resources"
      | "socialManager"
      | "table"
      | "userId"
      | "voxeloo"
    >
  ) {}

  tick(dt: number): void {
    const changeSpec = this.selectionChangeSpec();
    if (!isEqual(changeSpec, this.lastSelectionChangeSpec)) {
      this.lastActiveScript?.onUnselected?.();
      const activeSelection = this.deps.resources.get("/hotbar/selection");
      this.lastActiveScript = this.scriptForItem(activeSelection);
      this.lastSelectionChangeSpec = cloneDeep(changeSpec);
    }

    this.lastActiveScript?.tick(dt);
  }

  private selectionChangeSpec() {
    const activeSelection = this.deps.resources.get("/hotbar/selection");
    const becomeNpc = this.deps.resources.get("/scene/npc/become_npc");
    const activeSpec = {
      activeSelectionKind: activeSelection.kind,
      itemId: activeSelection.item?.id,
      itemAction: activeSelection.item?.action,
      hotbarIdx:
        activeSelection.kind === "hotbar" ? activeSelection.idx : undefined,
    };
    return {
      activeSelection: activeSpec,
      becomeNpc: becomeNpc,
    };
  }

  private scriptForItem(
    selection: HotBarSelection
  ): ActiveItemScript | undefined {
    const depsWithActionThrottler = {
      ...this.deps,
      actionThrottler: this.actionThrottler,
    };
    if (selection.kind === "camera") {
      return this.attackDestroyScriptWithSpec(
        selection.ref,
        new CameraItemSpec(this.deps)
      );
    }

    if (this.deps.resources.get("/scene/npc/become_npc").kind === "active") {
      return this.attackDestroyScriptWithSpec(
        selection,
        new BecomeNPCItemSpec(depsWithActionThrottler)
      );
    }

    if (selection.item && selection.kind === "hotbar") {
      const action = selection.item.action as ActionType;

      if (
        this.deps.resources.get("/groups/placement/preview").active() ||
        hasPreviewHologram(selection.item)
      ) {
        return this.attackDestroyScriptWithSpec(
          selection,
          new PreviewableItemSpec(depsWithActionThrottler)
        );
      }

      if (action !== "bikkie") {
        // If we're not in a magical bikkie item, presume to inspect the current
        // item.
        if (this.deps.authManager.currentUser.hasSpecialRole("admin")) {
          setCurrentBiscuit(this.deps.resources, selection.item.id);
        }
      }

      switch (action) {
        case "fish":
          return this.attackDestroyScriptWithSpec(
            selection,
            new FishingItemSpec(this.deps)
          );
        case "waypointCam":
          return this.attackDestroyScriptWithSpec(
            selection,
            new WaypointCameraItemSpec(this.deps)
          );
        case "warpHome":
          return this.pressAndHoldItemWithSpec(
            selection,
            new HomestoneItemSpec(depsWithActionThrottler)
          );
        case "eat":
        case "drink":
          return this.pressAndHoldItemWithSpec(
            selection,
            new ConsumableItemSpec(this.deps)
          );

        case "destroy":
          return this.destroyScript(selection);
          break;

        case "till":
          return this.destroyScript(
            selection,
            new TillSoilItemSpec(depsWithActionThrottler)
          );
          break;

        case "plant":
          return this.attackDestroyScriptWithSpec(
            selection,
            new PlantSeedItemSpec(depsWithActionThrottler)
          );
          break;

        case "waterPlant":
          return this.attackDestroyScriptWithSpec(
            selection,
            new WaterPlantItemSpec(depsWithActionThrottler)
          );
          break;

        case "fertilize":
          return this.attackDestroyScriptWithSpec(
            selection,
            new FertilizeItemSpec(depsWithActionThrottler)
          );
          break;

        case "reveal":
          return this.attackDestroyScriptWithSpec(
            selection,
            new TreasureItemSpec(depsWithActionThrottler)
          );
        case "wand":
          return this.attackDestroyScriptWithSpec(
            selection,
            new WandItemSpec(depsWithActionThrottler)
          );
        case "bikkie":
          return this.attackDestroyScriptWithSpec(
            selection,
            new BikkieWandItemSpec(depsWithActionThrottler)
          );
        case "spaceClipboard":
          return this.attackDestroyScriptWithSpec(
            selection,
            new SpaceClipboardWandItemSpec(depsWithActionThrottler)
          );
        case "negaWand":
          return this.attackDestroyScriptWithSpec(
            selection,
            new NegaWandItemSpec(depsWithActionThrottler)
          );
        case "placerWand":
          return this.attackDestroyScriptWithSpec(
            selection,
            new PlacerWandItemSpec(depsWithActionThrottler)
          );
        case "shaper":
          return this.attackDestroyScriptWithSpec(
            selection,
            new ShaperItemSpec(depsWithActionThrottler)
          );
        case "despawnWand":
          return this.attackDestroyScriptWithSpec(
            selection,
            new DespawnWantItemSpec(depsWithActionThrottler)
          );
        case "dump":
          return this.attackDestroyScriptWithSpec(
            selection,
            new WaterBucketItemSpec(depsWithActionThrottler)
          );
          break;
        case "place":
        case "placeRobot":
          if (selection.item.isPlaceable) {
            return this.attackDestroyScriptWithSpec(
              selection,
              new PlaceableItemSpec(depsWithActionThrottler)
            );
          } else {
            return this.attackDestroyScriptWithSpec(
              selection,
              new TerrainSpec(depsWithActionThrottler)
            );
          }
          break;
        case "shape":
          return this.attackDestroyScriptWithSpec(
            selection,
            new ShapeItemSpec(depsWithActionThrottler)
          );
        case "dye":
          return this.attackDestroyScriptWithSpec(
            selection,
            new DyeItemSpec(depsWithActionThrottler)
          );
      }
    }

    return this.destroyScript(selection);
  }

  private attackDestroyScriptWithSpec(
    ref: OwnedItemReference,
    spec: AttackDestroyDelegateSpec
  ) {
    return new ClickableItemScript(
      this.deps,
      ref,
      new AttackDestroyDelegateItemSpec(
        { ...this.deps, actionThrottler: this.actionThrottler },
        spec
      )
    );
  }

  private destroyScript(
    itemRef: OwnedItemReference,
    primarySpec?: AttackDestroyDelegateSpec
  ) {
    return new ClickableItemScript(
      this.deps,
      itemRef,
      new DestroyerItemSpec(
        {
          ...this.deps,
          actionThrottler: this.actionThrottler,
        },
        primarySpec
      )
    );
  }

  private pressAndHoldItemWithSpec(
    ref: OwnedItemReference,
    spec: PressAndHoldSpec
  ) {
    return this.attackDestroyScriptWithSpec(
      ref,
      new PressAndHoldItemSpec(this.deps, spec)
    );
  }
}
