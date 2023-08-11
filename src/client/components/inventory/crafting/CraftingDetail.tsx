import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { CraftingBundle } from "@/client/components/inventory/crafting/helpers";
import {
  getCraftingBundle,
  performCraft,
  stationOk,
  useCraftingBundle,
} from "@/client/components/inventory/crafting/helpers";
import type { RecipeMap } from "@/client/components/inventory/helpers";
import {
  getRecipeAttribute,
  getRecipeMap,
} from "@/client/components/inventory/helpers";
import {
  itemDamageRow,
  ItemTooltip,
} from "@/client/components/inventory/ItemTooltip";
import { MaybeError } from "@/client/components/system/MaybeError";
import { MiniPhoneDialogContent } from "@/client/components/system/mini_phone/MiniPhoneDialog";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import type { Item, ItemAndCount, ItemBag } from "@/shared/ecs/gen/types";
import type { CraftingContext } from "@/shared/game/crafting";
import {
  calculateCraftingStationRoyalty,
  craftingTimeMs,
} from "@/shared/game/crafting";

import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import { CraftingStationRoyaltyFeeListing } from "@/client/components/inventory/crafting/CraftingStationRoyaltyFeeListing";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import { DialogButton } from "@/client/components/system/DialogButton";
import { useError } from "@/client/components/system/MaybeError";
import type { OwnedItems, ReadonlyOwnedItems } from "@/shared/game/inventory";
import {
  determineGivePattern,
  determineTakePattern,
  giveToOwnedItems,
  takeFromOwnedItems,
} from "@/shared/game/inventory";
import { anItem, cloneDeepWithItems } from "@/shared/game/item";
import {
  addToBag,
  bagCount,
  bagWith,
  containerToBag,
  itemCountToApproximateNumber,
} from "@/shared/game/items";
import { getRecipeOutput } from "@/shared/game/recipes";
import type { BiomesId } from "@/shared/ids";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { compactMap, mapMap } from "@/shared/util/collections";
import { orify } from "@/shared/util/text";
import { formatItemCount } from "@/shared/util/view_helpers";
import { ok } from "assert";
import { first, toNumber } from "lodash";
import type { PropsWithChildren } from "react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const MAX_CRAFT_REPEATS = 1000;

function craftableAmount(
  ownedItems: ReadonlyOwnedItems,
  craftingBundle: CraftingBundle,
  userId: BiomesId,
  createdById?: BiomesId,
  stationItem?: Item
) {
  if (!craftingBundle.canCraft) {
    return 0;
  }
  let amount = 0;
  const items = cloneDeepWithItems(ownedItems) as OwnedItems;
  const inputs = bagWith(
    craftingBundle.ingredients,
    calculateCraftingStationRoyalty(userId, createdById, stationItem) ||
      new Map()
  );
  while (amount < MAX_CRAFT_REPEATS) {
    const pattern = determineTakePattern(items, inputs, {
      allowTypeMatch: true,
    });
    if (!pattern || !takeFromOwnedItems(items, pattern)) {
      break;
    }

    const givePattern = determineGivePattern(items, craftingBundle.output);
    if (!givePattern || !giveToOwnedItems(items, givePattern)) {
      break;
    }

    amount += 1;
  }
  return amount;
}

// delayClearCrafting will refresh isCrafting to replay animations,
// and will clear any pending timeouts if called again during a previous
// call's delay
export function useCraftingDelay(delay?: number) {
  const [isCrafting, setIsCrafting] = useState<boolean>(false);
  const [delayTimeout, setDelayTimeout] = useState<
    NodeJS.Timeout | undefined
  >();
  delay = delay === undefined ? 2500 : delay;

  // Clear any existing timers we have on this, since the player could be spam clicking
  // before we finish.
  const delayClearCrafting = useCallback(() => {
    if (delayTimeout) {
      clearTimeout(delayTimeout);
    }

    // Replay the animations on spam clicks
    setIsCrafting(false);
    setTimeout(() => setIsCrafting(true), 1);

    setDelayTimeout(setTimeout(() => setIsCrafting(false), delay));
  }, [delayTimeout]);
  return { isCrafting, delayClearCrafting, setIsCrafting };
}

export const CraftButton: React.FunctionComponent<
  PropsWithChildren<{
    isCrafting: boolean;
    craftDuration: number;
    onClick: () => void;
    disabled?: boolean;
    size?: "medium" | "small";
    extraClassNames?: string;
    craftedAnimation?: boolean;
  }>
> = ({
  isCrafting,
  craftDuration,
  onClick,
  disabled,
  size = "medium",
  extraClassNames,
  craftedAnimation,
  children,
}) => {
  craftedAnimation ??= true;
  return (
    <div
      style={
        {
          "--crafting-animation-time": `${craftDuration}ms`,
        } as React.CSSProperties
      }
    >
      <div
        className={`craft-button ${craftedAnimation ? "animated" : ""} ${
          isCrafting ? "is-crafting" : ""
        } ${extraClassNames || ""}`}
      >
        <DialogButton
          type="primary"
          size={size}
          onClick={onClick}
          disabled={disabled}
        >
          <div className="bar-fill" />
          <div className="crafted">
            <span className="check">✓</span>{" "}
            <span className="crafted-text">Added to Inventory</span>
          </div>
          <div className="button-text">{children ? children : "Craft"}</div>
        </DialogButton>
      </div>
    </div>
  );
};

export const CraftingDetailIngredient: React.FunctionComponent<{
  item: ItemAndCount;
  craftingContext: CraftingContext;
  recipeMap?: RecipeMap;
  onCraft?: (recipe: Item) => void;
  setError?: (err: any) => void;
  showInlineCraftButton?: boolean;
}> = ({
  item,
  craftingContext,
  recipeMap,
  onCraft,
  setError,
  showInlineCraftButton,
}) => {
  const clientContext = useClientContext();
  const { reactResources, userId } = clientContext;
  const [inventory, wearing] = reactResources.useAll(
    ["/ecs/c/inventory", userId],
    ["/ecs/c/wearing", userId]
  );
  ok(inventory && wearing);
  const inventoryBag = useMemo(() => {
    const bag: ItemBag = new Map<string, ItemAndCount>();
    addToBag(bag, containerToBag(inventory.items));
    addToBag(bag, containerToBag(inventory.hotbar));
    addToBag(bag, inventory.currencies);
    return bag;
  }, [inventory]);

  const needed = useMemo(() => {
    let needed = 0n;
    if (item.count > 0n) {
      const owned = bagCount(inventoryBag, item.item, {
        allowTypeMatch: true,
        respectPayload: false,
      });
      needed = item.count - owned;
    }
    return needed;
  }, [item, inventory]);

  const owned = useMemo(() => {
    let owned = 0n;
    owned = bagCount(inventoryBag, item.item, {
      allowTypeMatch: true,
      respectPayload: false,
    });
    return owned;
  }, [item, inventory]);

  // Return first craftable recipe found
  const potentialRecipes = (recipeMap && recipeMap[item.item.id]) || [];
  const craftableCraftingBundle = first(
    compactMap(potentialRecipes, (e) => {
      const bundle = getCraftingBundle(
        reactResources,
        userId,
        e.id,
        craftingContext.stationItem
      );

      if (bundle.canCraft) {
        return bundle;
      }
      return undefined;
    })
  );

  const [isCrafting, setIsCrafting] = useState(false);
  const craftAbortController = useRef(new AbortController());
  const doCraft = useCallback(
    async (recipe: Item) => {
      if (!craftableCraftingBundle) {
        setError?.("No recipe");
        return;
      }
      setIsCrafting(true);
      try {
        await performCraft(
          clientContext,
          {
            ...craftingContext,
            recipe: craftableCraftingBundle.item,
          },
          craftAbortController.current
        );
        onCraft?.(recipe);
      } catch (error: any) {
        setError?.(error);
      } finally {
        setIsCrafting(false);
      }
    },
    [craftingContext?.stationEntityId, craftableCraftingBundle]
  );
  useEffect(() => {
    return () => {
      craftAbortController.current.abort("DOM Closed");
    };
  }, []);

  return (
    <ItemTooltip key={item.item.id} item={item.item}>
      <div className="ingredient">
        <div className="cell">
          <ItemIcon item={item.item} className="ingredient-image" />
          <div className="amount-overlay">{formatItemCount(item)}</div>
        </div>
        <div className="name">
          {item.item.displayName}
          {needed > 0 ? (
            <div className="crafting-needed">
              {formatItemCount({ item: item.item, count: needed })} more needed
            </div>
          ) : (
            <div className="crafting-you-have">
              You have {formatItemCount({ item: item.item, count: owned })}
            </div>
          )}
        </div>
        {(craftableCraftingBundle || isCrafting) && showInlineCraftButton && (
          <CraftButton
            isCrafting={isCrafting}
            craftDuration={
              craftableCraftingBundle ? craftingTimeMs(craftingContext) : 1000
            }
            onClick={() => {
              if (craftableCraftingBundle?.canCraft && !isCrafting) {
                void doCraft(craftableCraftingBundle.item);
              }
            }}
            disabled={!craftableCraftingBundle}
            size="small"
          />
        )}
      </div>
    </ItemTooltip>
  );
};

export const CraftingDetail: React.FunctionComponent<{
  recipe: Item;
  stationEntityId?: BiomesId;
  onChangeRecipe?: (recipe: Item) => void;
}> = ({ recipe, stationEntityId, onChangeRecipe }) => {
  const [error, setError] = useError();
  const clientContext = useClientContext();
  const { resources, reactResources, audioManager, userId } = clientContext;
  const [recipeBook, inventory, wearing] = reactResources.useAll(
    ["/ecs/c/recipe_book", userId],
    ["/ecs/c/inventory", userId],
    ["/ecs/c/wearing", userId]
  );
  ok(inventory && wearing && recipeBook);
  const onCraft = () => audioManager.playSound("craft_success");
  const stationItem = relevantBiscuitForEntityId(resources, stationEntityId);
  const craftingBundle = useCraftingBundle(
    reactResources,
    userId,
    recipe.id,
    stationItem
  );

  const craftContext: CraftingContext = {
    recipe,
    stationItem: stationItem,
    stationEntityId: stationEntityId,
  };
  const [isCrafting, setIsCrafting] = useState(false);
  const [craftRepeats, setCraftRepeats] = useState(1);
  const [amountCrafted, setAmountCrafted] = useState(0);
  const craftAbortController = useRef(new AbortController());
  const doCraft = useCallback(async () => {
    try {
      setIsCrafting(true);
      for (let i = 0; i < craftRepeats; i++) {
        await performCraft(
          clientContext,
          craftContext,
          craftAbortController.current
        );
        if (i + 1 < craftRepeats) {
          // Don't update on the last one; just wait for the animation
          setAmountCrafted(i + 1);
        }
      }
      onCraft?.();
      // Wait the duration of the "added to inventory" animation
      // after the last craft
      // await sleep(1000);
    } catch (error: any) {
      setError(error);
    } finally {
      setAmountCrafted(0);
      setIsCrafting(false);
    }
  }, [craftContext, craftRepeats, setIsCrafting, setAmountCrafted]);

  useEffect(() => {
    return () => {
      craftAbortController.current.abort("Closed DOM");
    };
  }, []);

  const recipeMap = useMemo(
    () => getRecipeMap(recipeBook),
    [reactResources.version("/ecs/c/recipe_book", userId)]
  );

  const ingredientsCells = mapMap(craftingBundle.ingredients, (ingredient) => (
    <CraftingDetailIngredient
      key={ingredient.item.id}
      craftingContext={craftContext}
      recipeMap={recipeMap}
      item={ingredient}
      onCraft={onCraft}
      showInlineCraftButton={!craftingBundle.canCraft}
    />
  ));

  const description = useMemo(
    () => getRecipeAttribute(recipe, "displayDescription"),
    [recipe]
  );

  const damage = useMemo(() => {
    const outputs = getRecipeOutput(recipe);
    if (!outputs) {
      return null;
    }
    return <>{mapMap(outputs, (output) => itemDamageRow(output.item))}</>;
  }, [recipe]);

  const [createdBy] = useLatestAvailableComponents(
    stationEntityId,
    "created_by"
  );

  const canCraftAmount = useMemo(() => {
    const stationItem = relevantBiscuitForEntityId(resources, stationEntityId);
    return craftableAmount(
      { inventory, wearing },
      craftingBundle,
      userId,
      createdBy?.id,
      stationItem
    );
  }, [craftingBundle, inventory, wearing]);

  useEffect(() => {
    if (craftRepeats > canCraftAmount && canCraftAmount > 0 && !isCrafting) {
      setCraftRepeats(canCraftAmount);
    }
  }, [canCraftAmount, craftRepeats, isCrafting]);

  const singleOutputItemCount = useMemo(() => {
    if (craftingBundle.output.size === 1) {
      return itemCountToApproximateNumber(
        [...craftingBundle.output.values()][0]
      );
    }
    return undefined;
  }, [craftingBundle]);

  const formatRepeats = useCallback(
    (repeats: number) => {
      if (singleOutputItemCount) {
        return `${repeats * singleOutputItemCount}`;
      }
      return `${repeats}x`;
    },
    [singleOutputItemCount]
  );

  const craftButtonText = useMemo(() => {
    if (isCrafting) {
      if (craftRepeats > 1) {
        return `Crafting (${formatRepeats(amountCrafted + 1)}/${formatRepeats(
          craftRepeats
        )})`;
      }
      return "Crafting...";
    }
    return `Craft ${craftingBundle.name}`;
  }, [isCrafting, craftRepeats, amountCrafted, craftingBundle.name]);

  const [focus, setFocus] = useState(false);

  return (
    <div className="crafting-detail">
      <MaybeError error={error} />
      <MiniPhoneDialogContent>
        <div className="padded-view-auto-height">
          <div className="item-details">
            <div className="item-text">
              <>
                <div className="name">{craftingBundle.name}</div>
                {damage && (
                  <div className="secondary-label" key="damage">
                    {damage}
                  </div>
                )}
                {description && (
                  <div className="description">{String(description)}</div>
                )}
                {craftingBundle.detailCategory && (
                  <div className="category">
                    {craftingBundle.detailCategory}
                  </div>
                )}
              </>
            </div>
            <div className="item-image">
              <img src={craftingBundle.iconURL} />
              {(singleOutputItemCount ?? 0) > 1 && (
                <div className="amount-overlay">{singleOutputItemCount}</div>
              )}
            </div>
          </div>
          <div className="ingredients-label">
            <label>Ingredients</label>
            {craftingBundle.alternatives.length > 1 && (
              <select
                value={recipe.id}
                className="alternatives"
                onChange={(e) => {
                  const newIdx = toNumber(e.target.value);
                  if (!isNaN(newIdx) && newIdx > 0) {
                    onChangeRecipe?.(
                      craftingBundle.alternatives[newIdx].recipe
                    );
                  }
                }}
              >
                {craftingBundle.alternatives.map((alternative, idx) => (
                  <option value={idx} key={idx}>
                    {alternative.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="ingredients">{ingredientsCells}</div>
        </div>
      </MiniPhoneDialogContent>
      <div className="bottom">
        <div className="dialog-button-group flex-col gap-0.6">
          {stationOk(craftingBundle.item, craftContext.stationItem) &&
            stationEntityId && (
              <CraftingStationRoyaltyFeeListing
                stationEntityId={stationEntityId}
              />
            )}
          <div className="flex flex-row gap-0.6">
            <div className={"flex-grow"}>
              {stationOk(craftingBundle.item, craftContext.stationItem) ? (
                <div className={"relative"}>
                  <Tooltipped tooltip={craftingBundle.cannotCraftReason}>
                    <CraftButton
                      isCrafting={isCrafting}
                      craftDuration={craftingTimeMs(craftContext)}
                      disabled={!craftingBundle.canCraft || isCrafting}
                      onClick={() => {
                        if (!isCrafting) {
                          void doCraft();
                        }
                      }}
                      craftedAnimation={amountCrafted + 1 === craftRepeats}
                      key={amountCrafted}
                    >
                      {craftButtonText}
                    </CraftButton>
                  </Tooltipped>
                </div>
              ) : craftingBundle.craftWith ? (
                <div className="bottom-cant-craft-reason">
                  Craft at a{" "}
                  {orify(
                    craftingBundle.craftWith
                      .filter((s) => s != stationItem?.id)
                      .map((s) => anItem(s).displayName)
                  )}
                </div>
              ) : (
                <div className="bottom-cant-craft-reason">
                  Craft with your hands
                </div>
              )}
            </div>
            {canCraftAmount > 1 && (
              <select
                onChange={(e) => {
                  setFocus(false);
                  e.target.blur();
                  const newCraftRepeats = toNumber(e.target.value);
                  if (!isNaN(newCraftRepeats) && newCraftRepeats > 0) {
                    setCraftRepeats(newCraftRepeats);
                  }
                }}
                onFocus={() => {
                  setFocus(true);
                }}
                onBlur={() => setFocus(false)}
                className="basis-8"
              >
                {[...Array(canCraftAmount).keys()].map((i) => {
                  const repeats = i + 1;
                  return (
                    <option value={repeats} key={repeats}>
                      {repeats === craftRepeats && !focus && "Qty: "}
                      {formatRepeats(repeats)}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
