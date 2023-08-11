import type { ClientContext } from "@/client/game/context";
import { ItemMeshKey } from "@/client/game/resources/item_mesh";
import type { AnimatedPlaceableMesh } from "@/client/game/resources/placeables/types";
import type { ClientResourceDeps } from "@/client/game/resources/types";
import { DROP_SCALE } from "@/shared/constants";
import type { Item } from "@/shared/game/item";

export async function updateMountContentsInfo(
  context: ClientContext,
  deps: ClientResourceDeps,
  mesh: AnimatedPlaceableMesh
) {
  const { mountContentsInfo } = mesh;
  if (!mountContentsInfo) {
    return;
  }

  const inventory = deps.get("/ecs/c/container_inventory", mesh.placeableId);
  const pricedContainerInventory = deps.get(
    "/ecs/c/priced_container_inventory",
    mesh.placeableId
  );

  let firstItem: Item | undefined;
  if (inventory) {
    firstItem = inventory.items?.find((e) => Boolean(e))?.item;
  } else if (pricedContainerInventory) {
    firstItem = pricedContainerInventory.items.find((e) => Boolean(e))?.contents
      ?.item;
  }

  if (mountContentsInfo.particleSystem) {
    mountContentsInfo.particleSystem.three.visible = !!firstItem;
  }

  mountContentsInfo.contentsGroup.remove(
    ...mountContentsInfo.contentsGroup.children
  );

  if (firstItem) {
    const itemMeshFactory = await deps.get(
      "/scene/item/mesh",
      new ItemMeshKey(firstItem)
    );
    const itemMesh = itemMeshFactory();
    itemMesh.three.scale.setScalar(DROP_SCALE);
    mountContentsInfo.contentsGroup.add(itemMesh.three);
    mountContentsInfo.itemMeshInstances.push(itemMesh);
  }
}
