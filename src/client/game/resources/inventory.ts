import type { ClientContext } from "@/client/game/context";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import { compatibleCameraModes } from "@/client/game/util/camera";
import type { CameraItemMode } from "@/shared/bikkie/schema/types";
import type { ReadonlyInventory } from "@/shared/ecs/gen/components";
import type { OwnedItemReference } from "@/shared/ecs/gen/types";
import type { Item } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";
import { first, isEqual } from "lodash";

export type ItemSelection = OwnedItemReference & {
  item?: Item;
};

export interface CameraSelection {
  kind: "camera";
  ref: OwnedItemReference;
  item?: Item;
  mode: CameraItemMode;
}

export type HotBarSelection = ItemSelection | CameraSelection;

export function slotRefFromSelection(
  selection: HotBarSelection
): OwnedItemReference | undefined {
  return selection.kind === "camera" ? selection.ref : selection;
}

export function getSelectedItem(
  inventory: ReadonlyInventory | undefined,
  selectedIdx: number
) {
  return inventory && selectedIdx >= 0 && selectedIdx < inventory.hotbar.length
    ? inventory.hotbar[selectedIdx]
    : undefined;
}

function genHotBarSelection(
  { userId }: { userId: BiomesId },
  deps: ClientResourceDeps
): HotBarSelection {
  const selectedIdx = deps.get("/hotbar/index").value;
  const inventory = deps.get("/ecs/c/inventory", userId);
  const playerBehavior = deps.get("/ecs/c/player_behavior", userId);
  const selectedItem = getSelectedItem(inventory, selectedIdx);
  const cameraMode = deps.get("/hotbar/camera_mode").value;

  const ret = {
    ...inventory?.selected,
    item: selectedItem?.item,
  } as ItemSelection;

  if (selectedItem && ret.item?.action === "photo" && playerBehavior) {
    return {
      ...ret,
      kind: "camera",
      mode: compatibleCameraModes(ret.item).find((m) => isEqual(m, cameraMode))
        ? cameraMode
        : first(compatibleCameraModes(ret.item)) ?? "normal",
      ref: inventory?.selected,
    } as CameraSelection;
  } else {
    return ret;
  }
}

export async function addInventoryResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  const userId = await loader.get("userId");
  builder.addOnce("/hotbar/index", (deps) => {
    const inventory = deps.get("/ecs/c/inventory", userId);
    return {
      value:
        inventory?.selected?.kind === "hotbar" ? inventory.selected.idx : 0,
    };
  });
  builder.addOnce("/hotbar/camera_mode", (deps) => {
    const inventory = deps.get("/ecs/c/inventory", userId);
    if (inventory?.selected.kind === "item") {
      const item = getSelectedItem(inventory, inventory.selected.idx);
      return {
        value: first(compatibleCameraModes(item?.item))!,
      };
    }

    return {
      value: first(compatibleCameraModes(undefined))!,
    };
  });
  builder.add("/hotbar/selection", loader.provide(genHotBarSelection));
}
