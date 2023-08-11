import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { SelfInventoryRightPane } from "@/client/components/inventory/SelfInventoryScreen";
import { CraftingDetail } from "@/client/components/inventory/crafting/CraftingDetail";
import { RecipeRow } from "@/client/components/inventory/crafting/RecipeRow";
import { RecipeTooltipContent } from "@/client/components/inventory/crafting/RecipeTooltipContent";
import {
  getCraftingBundle,
  stationOk,
} from "@/client/components/inventory/crafting/helpers";
import { craftingCategories } from "@/client/components/inventory/helpers";
import { DialogButton } from "@/client/components/system/DialogButton";
import { Img } from "@/client/components/system/Img";
import { SegmentedControl } from "@/client/components/system/SegmentedControl";
import { MiniPhoneDialogContent } from "@/client/components/system/mini_phone/MiniPhoneDialog";
import { PaneActionSheet } from "@/client/components/system/mini_phone/split_pane/PaneActionSheet";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import type {
  ClientReactResources,
  ClientResources,
} from "@/client/game/resources/types";
import { isInventoryDragItem } from "@/client/util/drag_helpers";
import type { Item, ItemBag } from "@/shared/ecs/gen/types";
import searchIcon from "/public/hud/icon-16-search.png";

import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import { LeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { RightBarItem } from "@/client/components/system/mini_phone/split_pane/RightBarItem";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import {
  setCurrentBiscuit,
  setInlineAdminVisibility,
} from "@/client/game/resources/bikkie";
import { bagContains, bagWith, countOf, equalItems } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { compactMap, filterMap, mapMap } from "@/shared/util/collections";
import { andify } from "@/shared/util/text";
import { AnimatePresence, motion } from "framer-motion";
import { groupBy, sortBy } from "lodash";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import xIcon from "/public/hud/icon-16-x.png";

const SearchItemFilter: React.FunctionComponent<{
  item: Item;
  onClick: (item: Item) => void;
}> = ({ item, onClick }) => {
  return (
    <DialogButton extraClassNames="item-filter" onClick={() => onClick(item)}>
      <ItemIcon item={item} className="item" />
      <Img src={xIcon.src} alt="" className="close" />
    </DialogButton>
  );
};

const ALL_STATIONS = Symbol.for("biomes.ALL_STATONS");

interface CraftingFilterOptions {
  craftingStationItem?: Item | typeof ALL_STATIONS;
  requiredIngredients?: ItemBag;
  searchString?: string;
  onlyCraftable?: boolean;
}

function assembleRecipesByCategory(
  resources: ClientReactResources | ClientResources,
  userId: BiomesId,
  currentCraftingStationItem: Item | undefined,
  filterOptions: CraftingFilterOptions
) {
  const recipeBook = resources.get("/ecs/c/recipe_book", userId);
  if (!recipeBook) {
    return {};
  }

  const filteredRecipes = compactMap(recipeBook.recipes, ([, recipe]) => {
    if (!recipe.isRecipe) {
      // If someone has given you a recipe and disabled it, filter it from the UI
      return;
    }
    if (recipe.isHidden) {
      return;
    }

    const craftingBundle = getCraftingBundle(
      resources,
      userId,
      recipe.id,
      currentCraftingStationItem
    );

    if (
      filterOptions.craftingStationItem !== ALL_STATIONS &&
      !stationOk(craftingBundle.item, filterOptions.craftingStationItem)
    ) {
      return;
    }

    // Ingredient filtering
    if (
      filterOptions.requiredIngredients &&
      !bagContains(
        craftingBundle.ingredients,
        filterOptions.requiredIngredients,
        {
          allowTypeMatch: true,
        }
      )
    ) {
      return;
    }

    // Search filtering
    if (
      filterOptions.searchString &&
      !craftingBundle.name.toLowerCase().includes(filterOptions.searchString)
    ) {
      return;
    }

    // Craftable filtering
    if (filterOptions.onlyCraftable && !craftingBundle.canCraft) {
      return;
    }

    return craftingBundle;
  });

  // Combine recipes with the same output
  const recipesByOutput = groupBy(filteredRecipes, (item) => item.outputHash);
  const recipes = Object.values(recipesByOutput).map((entries) => {
    // If any of the recipes are craftable, use the one that:
    // - costs the least bling
    // - if costs the same bling, uses the least number of ingredients
    // Otherwise, use the first one
    const craftable = entries.filter((entry) => entry.canCraft);
    let targetEntry = entries[0];
    if (craftable.length > 0) {
      const sorted = sortBy(craftable, [
        (entry) => entry.blingCost,
        (entry) => entry.totalRequiredItems,
      ]);
      targetEntry = sorted[0];
    }
    // Also add a combined tooltip for all possible recipes, with the
    // craftable one at top.
    return {
      ...targetEntry,
      tooltip: (
        <ul className="multi-ingredient-tooltip">
          <li key={targetEntry.id}>
            <RecipeTooltipContent recipe={targetEntry.item} />
          </li>
          {entries
            .filter((entry) => entry.id != targetEntry.id)
            .map((entry) => (
              <li key={entry.id}>
                <RecipeTooltipContent recipe={entry.item} />
              </li>
            ))}
        </ul>
      ),
    };
  });

  // Group recipes into categories
  const recipesByCategory = groupBy(recipes, (recipe) => recipe.itemCategory);
  for (const category of Object.keys(recipesByCategory)) {
    recipesByCategory[category] = sortBy(
      recipesByCategory[category],
      (recipe) => recipe.name
    );
  }
  return recipesByCategory;
}

export const GeneralCraftingStationScreen: React.FunctionComponent<{
  stationEntityId?: BiomesId;
}> = ({ stationEntityId }) => {
  const { dragItem, setDragItem } = useInventoryDraggerContext();
  const {
    audioManager,
    resources,
    reactResources,
    gardenHose,
    userId,
    authManager,
  } = useClientContext();
  const [recipeBook, inventory] = reactResources.useAll(
    ["/ecs/c/recipe_book", userId],
    ["/ecs/c/inventory", userId],
    ["/ecs/c/wearing", userId]
  );
  const [requiredIngredients, setRequiredIngredients] = useState<ItemBag>(
    new Map()
  );

  const stationItem = relevantBiscuitForEntityId(resources, stationEntityId);

  useEffect(() => {
    if (stationItem && stationEntityId) {
      gardenHose.publish({
        kind: "open_station",
        stationEntityId: stationEntityId,
        stationItem,
      });
    }
  }, [stationItem?.id]);

  const onCraft = () => {
    audioManager.playSound("craft_success");
  };

  const title = stationItem?.displayName ?? "Recipes";

  const [searchString, setSearchString] = useState<string>("");
  const [showAll, setShowAll] = useState(false);
  const [segmentedControlSelectedIndex, setSegmentedControlSelectedIndex] =
    useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const searchFieldRef = useRef<HTMLInputElement>(null);
  const [showRightActionSheet, setShowRightActionSheet] =
    useState<boolean>(false);
  const [actionSheetContents, setActionSheetContents] = useState<JSX.Element>();
  const [actionSheetRightItem, setActionSheetRightItem] =
    useState<JSX.Element>();

  const isAdmin = authManager.currentUser.hasSpecialRole("admin");

  // If not handcrafting, show search (and hide segmented control filter)
  useMemo(() => setShowSearch(!!stationItem), [stationItem?.id]);

  const recipesByCategory = useMemo(
    () =>
      assembleRecipesByCategory(reactResources, userId, stationItem, {
        craftingStationItem: showAll ? ALL_STATIONS : stationItem,
        requiredIngredients,
        searchString,
      }),
    [
      recipeBook,
      inventory,
      requiredIngredients,
      searchString,
      showAll,
      stationItem?.id,
    ]
  );

  const onRecipeClick = (recipe: Item) => {
    setShowRightActionSheet(true);
    setActionSheetContents(
      <CraftingDetail
        recipe={recipe}
        stationEntityId={stationEntityId}
        onChangeRecipe={onRecipeClick}
      />
    );

    setActionSheetRightItem(
      isAdmin ? (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setInlineAdminVisibility(reactResources, "bikkie");
            setCurrentBiscuit(resources, recipe.id);
          }}
        >
          Bikkie
        </a>
      ) : (
        <></>
      )
    );
  };

  const onFilterAreaClick = useCallback(() => {
    if (!dragItem || !isInventoryDragItem(dragItem) || !dragItem.slot) {
      return;
    }
    setRequiredIngredients(
      bagWith(requiredIngredients, countOf(dragItem.slot.item, 1n))
    );
    setDragItem(null);
  }, [requiredIngredients, dragItem]);

  const clearRequiredIngredients = useCallback(() => {
    setRequiredIngredients(new Map());
    setSearchString("");
  }, [requiredIngredients]);

  let recipesContent!: JSX.Element;
  if (Object.keys(recipesByCategory).length === 0) {
    const filterMessage = [
      searchString !== "" && ` match "${searchString}"`,
      requiredIngredients.size > 0 &&
        ` use ${andify(
          mapMap(requiredIngredients, (items) => items.item.displayName)
        )}`,
    ].filter((msg) => msg) as string[];
    recipesContent = (
      <div className="empty-recipes">
        {filterMessage.length > 0 && (
          <>
            You don&apos;t know any recipes that {andify(filterMessage)}
            <br />
            <br />
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                clearRequiredIngredients();
              }}
            >
              Clear
            </a>
          </>
        )}
      </div>
    );
  } else {
    const sortedCategoriesSet = new Set(craftingCategories);
    const remainingCategories = Object.keys(recipesByCategory).filter(
      (category) => !sortedCategoriesSet.has(category)
    );
    const categories = [...craftingCategories, ...remainingCategories];
    recipesContent = (
      <MiniPhoneDialogContent style="pin-top" extraClassName="hide-scrollbar">
        <div className="recipe-list">
          {categories.map((category) => {
            const recipes = recipesByCategory[category];
            if (!recipes) {
              return <></>;
            }
            return (
              <>
                <label>{category}</label>
                <ul className="recipe-rows">
                  {recipes.map((r) => (
                    <RecipeRow
                      key={r.id}
                      craftingBundle={r}
                      onClick={onRecipeClick}
                      onCraft={onCraft}
                      tooltip={r.tooltip}
                      stationEntityId={stationEntityId}
                    />
                  ))}
                </ul>
              </>
            );
          })}
        </div>
      </MiniPhoneDialogContent>
    );
  }
  const dragItemName = useMemo(
    () =>
      dragItem && isInventoryDragItem(dragItem)
        ? dragItem.slot?.item.displayName
        : "specific item",
    [dragItem]
  );

  const removeRequiredItem = useCallback(
    (item: Item) => {
      setRequiredIngredients(
        filterMap(requiredIngredients, (value) => !equalItems(value.item, item))
      );
    },
    [requiredIngredients]
  );

  useEffect(() => {
    if (!stationItem) {
      searchFieldRef.current?.focus();
    }
  }, [showSearch, stationItem?.id]);

  useEffect(() => {
    if (requiredIngredients.size > 0) {
      setShowSearch(true);
    }
  }, [requiredIngredients]);

  return (
    <SplitPaneScreen
      extraClassName={title.toLowerCase().replace(" ", "-")}
      leftPaneExtraClassName={stationItem ? "biomes-box" : ""}
      rightPaneExtraClassName={stationItem ? "biomes-box" : ""}
    >
      <ScreenTitleBar title={title} divider={false}>
        {!showSearch && (
          <RightBarItem>
            <div
              className="toolbar-icon"
              onClick={() => {
                const shouldShowSearch = !showSearch;
                setShowSearch(shouldShowSearch);
                if (shouldShowSearch && !stationItem) {
                  setShowAll(true);
                }
              }}
            >
              <Img src={searchIcon.src} alt="" />
            </div>
          </RightBarItem>
        )}
      </ScreenTitleBar>
      <LeftPane extraClassName="hide-scrollbar">
        <div className="bg-image" />

        {showSearch ? (
          <div className="crafting-search">
            <div className="search-bar">
              <input
                type="text"
                value={searchString}
                placeholder={stationItem ? "Search" : "Search all recipes"}
                onChange={(e) => {
                  setSearchString(e.target.value);
                }}
                className="search-name"
                ref={searchFieldRef}
              />

              {!stationItem && (
                <ul className="search-options">
                  <li>
                    <a
                      className="search-cancel"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setSearchString("");
                        setShowSearch(!showSearch);
                        clearRequiredIngredients();
                        setShowAll(Boolean(segmentedControlSelectedIndex));
                      }}
                    >
                      Cancel
                    </a>
                  </li>
                </ul>
              )}
            </div>
            {mapMap(requiredIngredients, (ingredient) => (
              <SearchItemFilter
                key={ingredient.item.id}
                item={ingredient.item}
                onClick={removeRequiredItem}
              />
            ))}
          </div>
        ) : (
          <div className="crafting-search">
            <SegmentedControl
              index={segmentedControlSelectedIndex}
              items={["Handcraft", "All"]}
              onClick={(i) => {
                setSegmentedControlSelectedIndex(i);
                setShowAll(i == 1);
              }}
            />
          </div>
        )}

        <div className="crafting padded-view">
          <AnimatePresence initial={false}>
            {!dragItem && (
              <motion.div
                key={"recipes-content"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.15, duration: 0.1 }}
              >
                {recipesContent}
              </motion.div>
            )}
            {dragItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.15, duration: 0.1 }}
                className="filter-area"
                key="filter-area"
                onMouseUp={() => {
                  onFilterAreaClick();
                }}
              >
                <div className="filter-label">
                  Drop to filter recipes by {dragItemName}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <PaneActionSheet
          showing={showRightActionSheet}
          onClose={() => setShowRightActionSheet(false)}
          rightBarItem={actionSheetRightItem}
        >
          {actionSheetContents}
        </PaneActionSheet>
      </LeftPane>

      <RawRightPane>
        <SelfInventoryRightPane />
      </RawRightPane>
    </SplitPaneScreen>
  );
};
