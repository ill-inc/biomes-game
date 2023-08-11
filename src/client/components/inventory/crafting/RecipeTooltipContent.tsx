import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { ingredientCountRender } from "@/client/components/inventory/crafting/helpers";
import type { Item, ItemAndCount, ItemBag } from "@/shared/ecs/gen/types";
import { addToBag, bagCount, containerToBag } from "@/shared/game/items";
import { getRecipeInput } from "@/shared/game/recipes";
import { mapMap } from "@/shared/util/collections";
import { formatItemCount } from "@/shared/util/view_helpers";
import { useMemo } from "react";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";

export const RecipeTooltipContent: React.FunctionComponent<{
  recipe: Item;
}> = ({ recipe }) => {
  const { reactResources, userId } = useClientContext();
  const inventory = reactResources.use("/ecs/c/inventory", userId);
  const inventoryBag = useMemo(() => {
    const bag: ItemBag = new Map<string, ItemAndCount>();
    if (inventory) {
      addToBag(bag, containerToBag(inventory.items));
      addToBag(bag, containerToBag(inventory.hotbar));
      addToBag(bag, inventory.currencies);
    }
    return bag;
  }, [inventory]);
  const input = getRecipeInput(recipe);
  if (!input) {
    return <></>;
  }

  const list = mapMap(input, (item) => {
    const ingredientCount = ingredientCountRender(item);
    const owned = bagCount(inventoryBag, item.item, {
      allowTypeMatch: true,
      respectPayload: false,
    });
    const needed = item.count - owned;

    return (
      <li className="craft-ingredient-row" key={item.item.id}>
        <div className="cell">
          <ItemIcon item={item.item} />
          {ingredientCount > 1 && (
            <div className="amount-overlay">{ingredientCount}</div>
          )}
        </div>
        <div className="label">
          <div>{item.item.displayName}</div>
          {needed > 0n && (
            <div className="detail needed">
              {formatItemCount({ item: item.item, count: needed })} more needed
            </div>
          )}
        </div>
      </li>
    );
  });

  return <ul>{list}</ul>;
};
