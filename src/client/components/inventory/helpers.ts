import type { InventoryOverrideContextType } from "@/client/components/inventory/InventoryOverrideContext";
import type { ClientContextSubset } from "@/client/game/context";
import type { HotBarSelection } from "@/client/game/resources/inventory";
import type {
  ClientReactResources,
  ClientResources,
} from "@/client/game/resources/types";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import type {
  Inventory,
  ReadonlyRecipeBook,
  Wearing,
} from "@/shared/ecs/gen/components";
import {
  BeginTradeEvent,
  InventoryCombineEvent,
  InventorySplitEvent,
  InventorySwapEvent,
  RobotInventorySwapEvent,
} from "@/shared/ecs/gen/events";
import type { Item, OwnedItemReference } from "@/shared/ecs/gen/types";
import type { OwnedItems } from "@/shared/game/inventory";
import { maybeGetSlotByRef } from "@/shared/game/inventory";
import { countOf } from "@/shared/game/items";
import { getRecipeOutput } from "@/shared/game/recipes";
import { isValidRobotInventoryItem } from "@/shared/game/robot";
import type { BiomesId } from "@/shared/ids";
import { pollUntil } from "@/shared/util/async";
import { mapMap } from "@/shared/util/collections";
import { ok } from "assert";
import { compact } from "lodash";

export const INVENTORY_COLS = 9;

export function inventorySelectionName(selection: HotBarSelection): string {
  if (selection.kind === "camera") {
    return selection.mode.label ?? selection.item?.displayName ?? "";
  }
  return selection.item?.displayName ?? "";
}

export function getRecipeAttribute(recipe: Item, attribute: keyof Biscuit) {
  const direct = recipe[attribute];
  if (direct) {
    return direct;
  }
  const outputs = getRecipeOutput(recipe);
  if (outputs) {
    for (const output of outputs) {
      const outputAttr = output[1].item[attribute];
      if (outputAttr) {
        return outputAttr;
      }
    }
  }
  return undefined;
}

// Map of item BiscuitId -> Array of available recipes to craft
export type RecipeMap = {
  [key in BiomesId]?: Item[];
};
export function getRecipeMap(recipeBook: ReadonlyRecipeBook): RecipeMap {
  const recipeMap: RecipeMap = new Proxy<RecipeMap>({} as RecipeMap, {
    get: (target, name) => {
      const key = name as unknown as BiomesId;
      if (!(key in target)) {
        target[key] = [];
      }
      return target[key];
    },
  });
  for (const recipe of recipeBook.recipes.values()) {
    const output = getRecipeOutput(recipe);
    if (!output) {
      continue;
    }
    for (const outputItem of output.values()) {
      recipeMap[outputItem.item.id]!.push(recipe);
    }
  }
  return recipeMap;
}

export function hasPreviewHologram(item: Item | undefined) {
  return item && (item.isBlueprint || item.groupId);
}

export function itemIsExclusivelyGroup(item: Item | undefined) {
  return item && !item.isBlueprint && !!item.groupId;
}

export function recipeDisplayName(recipe: Item): string {
  const directName = recipe.displayName;
  if (directName && directName !== "???") {
    return directName;
  }

  const output = getRecipeOutput(recipe);
  if (output && output.size > 0) {
    return (
      mapMap(output, (value) => value.item.displayName).join(" and ") ||
      "(unknown recipe)"
    );
  }
  return "(unknown recipe)";
}

export function getOwnedItems(
  resources: ClientReactResources | ClientResources,
  userId: BiomesId
): OwnedItems {
  const inventory = resources.get("/ecs/c/inventory", userId) as
    | Inventory
    | undefined;
  const wearing = resources.get("/ecs/c/wearing", userId) as
    | Wearing
    | undefined;

  return { inventory, wearing };
}

export function useOwnedItems(
  reactResources: ClientReactResources,
  userId: BiomesId
): OwnedItems {
  const [inventory, wearing] = reactResources.useAll(
    ["/ecs/c/inventory", userId],
    ["/ecs/c/wearing", userId]
  ) as [Inventory, Wearing];

  return { inventory, wearing };
}

export function ownedItemVersions(
  reactResources: ClientReactResources,
  userId: BiomesId
): number[] {
  return [
    reactResources.version("/ecs/c/inventory", userId),
    reactResources.version("/ecs/c/wearing", userId),
  ];
}

export function useResolvedItemRef(
  reactResources: ClientReactResources,
  userId: BiomesId,
  ref?: OwnedItemReference
) {
  const ownedItems = useOwnedItems(reactResources, userId);
  return maybeGetSlotByRef(ownedItems, ref);
}

export const craftingCategories = [
  "Land Flag",
  "Blueprints",
  "Materials",
  "Metals & Gems",
  "Tools",
  "Clothing",
  "Hats",
  "Hair",
  "Face",
  "Outerwear",
  "Tops",
  "Bottoms",
  "Ears",
  "Neck",
  "Hands",
  "Feet",
  "Objects",
  "Lights",
  "Blocks",
];

export interface SwapInfo {
  src: OwnedItemReference;
  dst: OwnedItemReference;
  srcEntityId?: BiomesId;
  dstEntityId?: BiomesId;
}

function maybeGetSlotFromEntityByRef(
  deps: ClientContextSubset<"reactResources" | "userId">,
  entityId: BiomesId,
  ref: OwnedItemReference
) {
  if (deps.userId === entityId || ref.kind === "wearable") {
    return maybeGetSlotByRef(getOwnedItems(deps.reactResources, entityId), ref);
  }

  const items = deps.reactResources.get("/ecs/c/container_inventory", entityId);
  ok(items && ref.kind === "item");
  return items.items[ref.idx];
}

export function robotInventorySwap(
  deps: ClientContextSubset<"events" | "userId" | "reactResources">,
  context: InventoryOverrideContextType,
  swapInfo: SwapInfo
) {
  /**
   * {srcItem} is being moved into the inventory of {dstEntityId}.
   */
  const srcEntityId = swapInfo?.srcEntityId ?? deps.userId;
  const dstEntityId = swapInfo?.dstEntityId ?? deps.userId;

  const srcItem = maybeGetSlotFromEntityByRef(deps, srcEntityId, swapInfo.src);
  const destinationIsRobot = deps.reactResources.get(
    "/ecs/c/robot_component",
    dstEntityId
  );

  if (destinationIsRobot && !isValidRobotInventoryItem(srcItem)) {
    return;
  }

  void deps.events.publish(
    new RobotInventorySwapEvent({
      id: srcEntityId,
      src: swapInfo.src,
      dst: swapInfo.dst,
      dst_id: dstEntityId,
    })
  );
}

export function eagerInventorySwap(
  deps: ClientContextSubset<"events" | "userId" | "reactResources">,
  context: InventoryOverrideContextType,
  swapInfo: SwapInfo
) {
  const srcEntityId = swapInfo?.srcEntityId ?? deps.userId;
  const dstEntityId = swapInfo?.dstEntityId ?? deps.userId;
  const isRobotSwap =
    deps.reactResources.get("/ecs/c/robot_component", srcEntityId) ||
    deps.reactResources.get("/ecs/c/robot_component", dstEntityId);

  if (isRobotSwap) {
    robotInventorySwap(deps, context, swapInfo);
    return;
  }

  const srcItem = maybeGetSlotFromEntityByRef(deps, srcEntityId, swapInfo.src);
  const targetItem = maybeGetSlotFromEntityByRef(
    deps,
    dstEntityId,
    swapInfo.dst
  );

  if (srcEntityId === deps.userId) {
    context.eagerSetInventoryOverride({
      ref: swapInfo.src,
      value: targetItem,
    });
  }

  if (dstEntityId === deps.userId) {
    context.eagerSetInventoryOverride({
      ref: swapInfo.dst,
      value: srcItem,
    });
  }

  const positions = compact([
    deps.reactResources.get("/ecs/c/position", srcEntityId)?.v,
    deps.reactResources.get("/ecs/c/position", dstEntityId)?.v,
  ]);

  void deps.events.publish(
    new InventorySwapEvent({
      src_id: srcEntityId,
      src: swapInfo.src,
      dst_id: dstEntityId,
      dst: swapInfo.dst,
      player_id: deps.userId,
      positions,
    })
  );
}

export interface CombineInfo {
  src: OwnedItemReference;
  dst: OwnedItemReference;
  srcEntityId?: BiomesId;
  dstEntityId?: BiomesId;
  quantity?: bigint;
}

export function eagerInventoryCombine(
  deps: ClientContextSubset<"events" | "userId" | "reactResources">,
  context: InventoryOverrideContextType,
  combineInfo: CombineInfo
) {
  const srcEntityId = combineInfo?.srcEntityId ?? deps.userId;
  const dstEntityId = combineInfo?.dstEntityId ?? deps.userId;

  const srcItem = maybeGetSlotFromEntityByRef(
    deps,
    srcEntityId,
    combineInfo.src
  );
  const targetItem = maybeGetSlotFromEntityByRef(
    deps,
    dstEntityId,
    combineInfo.dst
  );

  if (!srcItem || !targetItem) {
    return;
  }

  const quantity = combineInfo.quantity ?? srcItem.count;
  if (srcEntityId === deps.userId) {
    context.eagerCombineInventoryOverride({
      delta: quantity,
      item: srcItem.item,
      ref: combineInfo.src,
    });
  }

  if (dstEntityId === deps.userId) {
    context.eagerCombineInventoryOverride({
      delta: -quantity,
      item: targetItem.item,
      ref: combineInfo.dst,
    });
  }

  const positions = compact([
    deps.reactResources.get("/ecs/c/position", srcEntityId)?.v,
    deps.reactResources.get("/ecs/c/position", dstEntityId)?.v,
  ]);

  void deps.events.publish(
    new InventoryCombineEvent({
      src_id: srcEntityId,
      src: combineInfo.src,
      dst_id: dstEntityId,
      dst: combineInfo.dst,
      count: quantity,
      player_id: deps.userId,
      positions,
    })
  );
}

export function eagerInventorySplit(
  deps: ClientContextSubset<"events" | "userId" | "reactResources">,
  context: InventoryOverrideContextType,
  combineInfo: CombineInfo
) {
  const srcEntityId = combineInfo?.srcEntityId ?? deps.userId;
  const dstEntityId = combineInfo?.dstEntityId ?? deps.userId;

  const srcItem = maybeGetSlotFromEntityByRef(
    deps,
    srcEntityId,
    combineInfo.src
  );
  const targetItem = maybeGetSlotFromEntityByRef(
    deps,
    dstEntityId,
    combineInfo.dst
  );

  if (!srcItem || targetItem) {
    return;
  }

  const quantity = combineInfo.quantity ?? srcItem.count;
  if (srcEntityId === deps.userId) {
    context.eagerCombineInventoryOverride({
      delta: quantity,
      item: srcItem.item,
      ref: combineInfo.src,
    });
  }

  if (dstEntityId === deps.userId) {
    context.eagerSetInventoryOverride({
      ref: combineInfo.dst,
      value: countOf(srcItem.item, quantity),
    });
  }

  const positions = compact([
    deps.reactResources.get("/ecs/c/position", srcEntityId)?.v,
    deps.reactResources.get("/ecs/c/position", dstEntityId)?.v,
  ]);

  void deps.events.publish(
    new InventorySplitEvent({
      src_id: srcEntityId,
      src: combineInfo.src,
      dst_id: dstEntityId,
      dst: combineInfo.dst,
      count: combineInfo.quantity,
      player_id: deps.userId,
      positions,
    })
  );
}

export async function beginTrade(
  deps: ClientContextSubset<"events" | "userId" | "resources">,
  otherUserId: BiomesId
): Promise<BiomesId> {
  const currentActiveTrades = deps.resources.get(
    "/ecs/c/active_trades",
    deps.userId
  );

  const knownTradeIds =
    currentActiveTrades?.trades.map((e) => e.trade_id) ?? [];

  await deps.events.publish(
    new BeginTradeEvent({ id: deps.userId, id2: otherUserId })
  );

  const newTrade = await pollUntil(
    () => {
      const currentActiveTrades = deps.resources.get(
        "/ecs/c/active_trades",
        deps.userId
      );

      const newTrade = currentActiveTrades?.trades.find(
        (e) =>
          (e.id1 === otherUserId || e.id2 === otherUserId) &&
          !knownTradeIds.includes(e.trade_id)
      );
      return newTrade;
    },
    {
      timeout: 10000,
      timeoutText: "Timed out waiting for trade to be created",
    }
  );

  ok(newTrade);
  return newTrade.trade_id;
}
