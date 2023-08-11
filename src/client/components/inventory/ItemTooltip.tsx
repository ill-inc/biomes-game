import {
  hasClientContext,
  useClientContext,
} from "@/client/components/contexts/ClientContextReactContext";
import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import { useInventoryAltClickContext } from "@/client/components/inventory/InventoryAltClickContext";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import type { TooltipFlair } from "@/client/components/inventory/InventoryViewContext";
import { useInventoryViewContext } from "@/client/components/inventory/InventoryViewContext";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { useCachedUsername } from "@/client/util/social_manager_hooks";
import { itemBuffDescription } from "@/shared/game/buffs";
import { chargeRemaining } from "@/shared/game/expiration";
import type { Item } from "@/shared/game/item";
import type { LootProbability } from "@/shared/game/item_specs";
import {
  closestNamedLootProbability,
  countOf,
  durabilityRemaining,
  isDroppableItem,
  lootProbabilityToNumber,
  maxLootProbability,
  waterLevelRemaining,
} from "@/shared/game/items";
import type { ItemAndCount } from "@/shared/game/types";
import { INVALID_BIOMES_ID } from "@/shared/ids";

import { assertNever } from "@/shared/util/type_helpers";
import { formatCurrencyItem } from "@/shared/util/view_helpers";
import { capitalize } from "lodash";
import type { PropsWithChildren } from "react";
import React from "react";

export function useItemDisplayName(item: Item | undefined): string {
  if (!hasClientContext()) {
    return item?.displayTooltip ?? item?.displayName ?? "";
  }

  const labels = useLatestAvailableComponents(item?.entityId, "label");

  if (item === undefined) {
    return "";
  } else if (item.isRobot) {
    return labels.length > 0 && labels[0] ? labels[0].text : item.displayName;
  } else {
    return item.displayTooltip || item.displayName;
  }
}

export function itemDamageRow(item: Item): JSX.Element | string | undefined {
  if (!item.dps) {
    return;
  }
  const damageMessage = `Damage: ${item.dps}`;
  switch (item.destroyerClass) {
    case 1: // Axes
      return (
        <>
          {damageMessage} <span className="yellow">2x against wood</span>
        </>
      );
    case 2: // Picks
      return (
        <>
          {damageMessage} <span className="yellow">2x against stone</span>
        </>
      );
    default:
      return damageMessage;
  }
}

export function itemRequiresClock(item?: Item) {
  return Boolean(item && chargeRemaining(item, 1) !== undefined);
}

export function itemDurabilityOrChargeRow(
  item: Item,
  time: number | undefined
) {
  const waterLevel = waterLevelRemaining(item);
  if (waterLevel !== undefined) {
    return (
      <>
        Water Level:{" "}
        <span className={waterLevel > 20 ? "yellow" : "red"}>
          {waterLevel.toFixed(0)}/100
        </span>
      </>
    );
  }
  const durability = durabilityRemaining(item);
  if (durability !== undefined) {
    return (
      <>
        Durability:{" "}
        <span className={durability > 20 ? "yellow" : "red"}>
          {durability.toFixed(0)}/100
        </span>
      </>
    );
  }
  const charge = time ? chargeRemaining(item, time) : undefined;
  if (charge !== undefined) {
    return (
      <>
        {charge >= 100
          ? "Charge"
          : item.isChargeable
          ? "Charging"
          : "Discharging"}
        :{" "}
        <span className={charge > 20 ? "yellow" : "red"}>
          {charge.toFixed(0)}%
        </span>
      </>
    );
  }
}

export function flairRows(itemAndCount: ItemAndCount, flair: TooltipFlair[]) {
  const rows: JSX.Element[] = [];
  for (const e of flair) {
    switch (e.kind) {
      case "sale":
        rows.push(
          <div className={`sell-${itemAndCount.item.id}`}>
            Sell 1 for{" "}
            <span className={"yellow"}>
              {formatCurrencyItem(e.unitPrice, "locale")} BLING
            </span>
          </div>
        );

        if (itemAndCount.count > 1n) {
          rows.push(
            <div className={`sell-many-${itemAndCount.item.id}`}>
              Sell {String(itemAndCount.count)} for{" "}
              <span className={"yellow"}>
                {formatCurrencyItem(
                  countOf(
                    e.unitPrice.item,
                    e.unitPrice.count * itemAndCount.count
                  ),
                  "locale"
                )}{" "}
                BLING
              </span>
            </div>
          );
        }
        break;

      default:
        assertNever(e.kind);
    }
  }
  return rows;
}

const ItemRarity: React.FunctionComponent<{ prob: LootProbability }> = ({
  prob,
}) => {
  const rarity = closestNamedLootProbability(prob);
  let classes = "";
  let text = capitalize(rarity);
  switch (rarity) {
    case "very common":
    case "guaranteed":
      text = "Common";
    // eslint-disable-next-line no-fallthrough
    case "common":
      classes = "text-white";
      break;
    case "uncommon":
      classes = "text-blue";
      break;
    case "rare":
      classes = "text-green";
      break;
    case "epic":
      classes = "text-purple";
      break;
    case "legendary":
      classes = "text-yellow";
      break;
    case "never":
      text = "Mythic";
    // eslint-disable-next-line no-fallthrough
    case "mythic":
      classes = "text-orange";
      break;
  }
  return (
    <span className={`${classes}`}>
      {text} ({lootProbabilityToNumber(prob) * 100}%)
    </span>
  );
};

const CreatedByRow: React.FunctionComponent<{
  item: Item;
}> = ({ item }) => {
  const creatorName = useCachedUsername(item.createdBy ?? INVALID_BIOMES_ID);
  return <div className="created-by">Created by {creatorName}</div>;
};

export const ItemTooltip: React.FunctionComponent<
  PropsWithChildren<{
    item?: Item;
    count?: bigint;
    tooltip?: string | JSX.Element;
    secondaryLabel?: string;
    tertiaryLabel?: string;
    action?: boolean;
    offsetY?: number;
    slotType?: "inventory" | "worn" | "shop";
    ownerView?: boolean;
    disabled?: boolean;
    willTransform?: boolean;
  }>
> = ({
  item,
  count,
  tooltip,
  secondaryLabel,
  tertiaryLabel,
  action,
  offsetY,
  children,
  slotType,
  disabled,
  willTransform,
  ownerView = true,
}) => {
  let outputTooltip: string | JSX.Element | undefined;

  const className = action ? "cell-tooltip action" : "cell-tooltip";
  const wrapperExtra = action ? "action" : undefined;
  const { dragItem } = useInventoryDraggerContext();
  const { showAltClickUIForSlotRef } = useInventoryAltClickContext();
  // This class is reused in the admin tool, hence has a nullable client context
  const clientContext = useClientContext() as null | ReturnType<
    typeof useClientContext
  >;
  const displayName = useItemDisplayName(item);
  const clock = clientContext?.reactResources.maybeUse(
    itemRequiresClock(item),
    "/clock"
  );

  const inventoryViewContext = useInventoryViewContext();

  // Disable item tooltips during alt click
  if (showAltClickUIForSlotRef || disabled) {
    outputTooltip = undefined;
  } else if (item) {
    const itemAndCount = countOf(item, count ?? 1n);
    const flair = inventoryViewContext.tooltipFlairForItem(itemAndCount);
    const rows: JSX.Element[] = [
      <span className={className} key="displayName">
        {displayName}
      </span>,
    ];
    const type = item.tooltipTypeName;
    //For the category underneath the Display Name, use `type`, otherwise dynamically set the category
    if (type && type !== displayName) {
      rows.push(
        <div className="tertiary-label" key={`type-${item.id}`}>
          {type}
        </div>
      );
    } else {
      if (item.isFish) {
        rows.push(
          <div className="tertiary-label" key={`type-${item.id}`}>
            {item.isClearwaterFish
              ? "Clearwater"
              : item.isMuckwaterFish
              ? "Muck"
              : ""}{" "}
            Fish
          </div>
        );
        if (item.fishConditions && item.fishConditions?.length > 0) {
          rows.push(
            <ItemRarity
              prob={maxLootProbability(
                item.fishConditions.map((cond) => cond.probability)
              )}
              key={`rarity-${item.id}`}
            />
          );
        }
      } else if (item.isSeed) {
        rows.push(
          <div className="tertiary-label" key={`type-${item.id}`}>
            Seed
          </div>
        );
      }
    }

    const damage = itemDamageRow(item);
    if (damage) {
      rows.push(
        <div className="damage-label" key={`damage-${item.id}`}>
          {damage}
        </div>
      );
    }
    const durability = itemDurabilityOrChargeRow(item, clock?.time);
    if (durability) {
      rows.push(
        <div className="durability-label" key={`durability-${item.id}`}>
          {durability}
        </div>
      );
    }
    const description = item.displayDescription;
    if (description) {
      rows.push(
        <div className="secondary-label" key={`description-${item.id}`}>
          {description}
        </div>
      );
    }

    if (item.buffs) {
      const [buffDescription, buffType] = itemBuffDescription(item);
      if (buffDescription) {
        rows.push(
          <div
            className={`buff-${buffType}`}
            key={`buff-description-${item.id}`}
          >
            {buffDescription}
          </div>
        );
      }
    }

    if (item.givesHealth) {
      rows.push(
        <div className="buff-food" key={`food-${item.id}`}>
          Restores {item.givesHealth} Health
        </div>
      );
    }

    if (
      item.farming?.kind === "basic" &&
      item.farming.requiresSun !== undefined
    ) {
      rows.push(
        <div className="" key={`farm-${item.id}`}>
          Requires {item.farming.requiresSun ? "sun" : "shade"} to grow.
        </div>
      );
    }
    if (item.createdBy) {
      rows.push(<CreatedByRow item={item} />);
    }

    if (ownerView) {
      if (
        !isDroppableItem(item) &&
        !item.isRecipe &&
        item.stackable !== undefined
      ) {
        rows.push(
          <div className="bound-label" key={`${item.id}-bound`}>
            Bound to you
          </div>
        );
      }

      if (
        item.isWearable &&
        (slotType === "inventory" || slotType === "worn")
      ) {
        rows.push(
          <div className="wearable-label" key={`${item.id}-wearable`}>
            {slotType === "inventory"
              ? "Double-click to wear"
              : slotType === "worn"
              ? "Double-click to take off"
              : "Can be worn"}
          </div>
        );
      }
    }

    if (flair) {
      rows.push(...flairRows(itemAndCount, flair));
    }

    outputTooltip = <>{rows}</>;
  } else if (tooltip) {
    outputTooltip = (
      <>
        {typeof tooltip === "string" ? (
          <span className={className}>{tooltip}</span>
        ) : (
          tooltip
        )}
        {secondaryLabel && (
          <div className="secondary-label">{secondaryLabel}</div>
        )}
        {tertiaryLabel && <div className="tertiary-label">{tertiaryLabel}</div>}
      </>
    );
  }
  return (
    <Tooltipped
      tooltip={outputTooltip}
      offsetY={offsetY}
      wrapperExtraClass={wrapperExtra}
      overrideHidden={dragItem ? true : false}
      willTransform={willTransform}
    >
      {children}
    </Tooltipped>
  );
};
