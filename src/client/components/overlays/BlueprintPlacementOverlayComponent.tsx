import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { InventoryCellContents } from "@/client/components/inventory/InventoryCellContents";
import { getCraftingStationNameForBlueprintId } from "@/client/game/helpers/blueprint";
import type { BlueprintPlacementOverlay } from "@/client/game/resources/overlays";
import type { ItemAndCount, ItemBag } from "@/shared/ecs/gen/types";
import { getBlueprintItemTypeId } from "@/shared/game/blueprint";
import { anItem } from "@/shared/game/item";
import {
  addToBag,
  bagCount,
  containerToBag,
  countOf,
  getItemTypeId,
  itemCountToApproximateNumber,
} from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import pluralize from "@/shared/plural";
import { sortBy, startCase } from "lodash";

import { useEffect, useState } from "react";

interface RequiredItem {
  itemId: BiomesId;
  itemName: string;
  count: number;
  owned: number;
  needed: number;
}

const ItemCountDisplay: React.FunctionComponent<{
  blueprintId: BiomesId;
}> = ({ blueprintId }) => {
  const { reactResources, userId } = useClientContext();
  const inventory = reactResources.use("/ecs/c/inventory", userId);
  const [requiredItems, setRequiredItems] = useState<RequiredItem[]>();

  useEffect(() => {
    if (!inventory) {
      return;
    }
    const bag: ItemBag = new Map<string, ItemAndCount>();
    addToBag(bag, containerToBag(inventory.items));
    addToBag(bag, containerToBag(inventory.hotbar));
    addToBag(bag, inventory.currencies);

    const items = reactResources.get(
      "/groups/blueprint/required_items",
      blueprintId
    );

    const sorted = sortBy(Array.from(items), ([_, count]) => -count);
    setRequiredItems(
      sorted.map(([itemId, count]) => {
        const typeId = getItemTypeId(anItem(itemId));
        const owned = itemCountToApproximateNumber(
          countOf(
            itemId,
            bagCount(bag, anItem(typeId), {
              allowTypeMatch: true,
            })
          )
        );
        const needed = Math.max(count - owned, 0);
        const itemName = anItem(typeId).displayName;
        return {
          itemId: getBlueprintItemTypeId(itemId),
          itemName,
          count,
          owned,
          needed,
        };
      })
    );
  }, [inventory]);

  return (
    <>
      {requiredItems?.map(({ itemId, itemName, needed, owned }) => {
        if (needed === 0) {
          return [];
        }
        return [
          <div key={itemId} className="blueprint-ingredient">
            <div className="cell">
              <InventoryCellContents key={itemId} slot={countOf(itemId, 1n)} />
            </div>
            <div className="name">{`${needed} ${
              owned > 1 ? "more" : ""
            } ${pluralize(startCase(itemName), needed + owned)}`}</div>
          </div>,
        ];
      })}
    </>
  );
};

export const BlueprintPlacementOverlayComponent: React.FunctionComponent<{
  overlay: BlueprintPlacementOverlay;
}> = ({ overlay: _overlay }) => {
  const { reactResources } = useClientContext();
  const [stationName, setStationName] = useState("");
  const selection = reactResources.use("/hotbar/selection");

  useEffect(() => {
    if (!selection.item || !selection.item.isBlueprint) {
      return;
    }
    setStationName(
      getCraftingStationNameForBlueprintId(selection.item.id) ??
        "Crafting Station"
    );
  }, [selection]);

  const blueprintId =
    selection.item && selection.item.isBlueprint
      ? selection.item.id
      : undefined;

  return (
    <div className="inspect-overlay">
      <div className="inspect blueprint-placement blueprint">
        <div className="instructions">
          <div className="blueprint-instructions-title">
            Gather missing materials to build a {stationName}
          </div>
          {blueprintId && <ItemCountDisplay blueprintId={blueprintId} />}
        </div>
      </div>
    </div>
  );
};
