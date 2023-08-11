import { iconUrl } from "@/client/components/inventory/icons";
import { Img } from "@/client/components/system/Img";
import { useInterval } from "@/client/util/intervals";
import { bikkieDerived, getBiscuits } from "@/shared/bikkie/active";
import { ITEM_TYPES } from "@/shared/bikkie/ids";
import type { Item } from "@/shared/game/item";
import { countOf, createBag } from "@/shared/game/items";
import type { ItemBag } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import { DefaultMap } from "@/shared/util/collections";
import { useMemo, useState } from "react";

export const ItemIcon: React.FunctionComponent<{
  item: Item;
  className?: string;
  defaultIcon?: string;
  seen?: Set<BiomesId>;
  style?: React.CSSProperties;
  draggable?: boolean;
}> = ({ item, className, defaultIcon, seen, style, draggable }) => {
  const isItemType = ITEM_TYPES.has(item.id);
  if (isItemType) {
    return (
      <ItemTypeIcon
        item={item}
        className={className}
        style={style}
        draggable={draggable}
      />
    );
  }
  return (
    <Img
      src={iconUrl(item, { defaultIcon, seen })}
      alt={item.name}
      className={className}
      style={style}
      draggable={draggable}
    />
  );
};

const itemsByType = bikkieDerived("itemsByType", () => {
  const items = getBiscuits("/items");
  return new DefaultMap((id: BiomesId) => {
    const filterFn = ITEM_TYPES.get(id);
    if (!filterFn) {
      return [];
    }
    return [...new Set(items.filter(filterFn))].map((item) => countOf(item));
  });
});

const ItemTypeIcon: React.FunctionComponent<{
  item: Item;
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
}> = ({ item, className, style, draggable }) => {
  const items = itemsByType().get(item.id);
  const bag = createBag(...items);
  return (
    <CycleItemIcons
      bag={bag}
      extraClassName={className}
      style={style}
      draggable={draggable}
    />
  );
};

const CYCLE_INTERVAL = 1000;
export const CycleItemIcons: React.FunctionComponent<{
  bag?: ItemBag;
  extraClassName?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
}> = ({ bag, extraClassName, style, draggable }) => {
  const toCycle = useMemo(
    () => (bag === undefined ? [] : [...bag.values()].map((e) => e.item)),
    [bag]
  );
  const [heroItemIdx, setHeroItemIdx] = useState(0);

  useInterval(() => {
    setHeroItemIdx((i) => {
      return i + 1;
    });
  }, CYCLE_INTERVAL);

  const heroItem =
    toCycle.length === 0 ? undefined : toCycle[heroItemIdx % toCycle.length];

  return (
    <Img
      src={iconUrl(heroItem)}
      className={extraClassName}
      style={style}
      draggable={draggable}
    />
  );
};
