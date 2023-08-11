import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import { DialogButton } from "@/client/components/system/DialogButton";
import styles from "@/client/styles/admin.bikkie.module.css";
import { colorEntries } from "@/shared/asset_defs/color_palettes";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import type { Item } from "@/shared/game/item";
import { countOf, createBag } from "@/shared/game/items";
import type { ItemAndCount, ItemBag } from "@/shared/game/types";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { DefaultMap } from "@/shared/util/collections";
import {
  dyeColorToPaletteColor,
  isValidDyeColor,
  itemDyedColor,
} from "@/shared/util/dye_helpers";
import { toNumber } from "lodash";
import { useCallback, useMemo } from "react";

export const CountEditor: React.FunctionComponent<{
  item: Item;
  count: bigint;
  onChange: (newCount: bigint) => void;
}> = ({ item, count, onChange: propagateChange }) => {
  const onChange = useCallback(
    (value: any) => {
      const newCount = BigInt(toNumber(value));
      if (newCount === count) {
        return;
      }
      propagateChange(newCount);
    },
    [propagateChange]
  );

  const useSelector = useMemo(() => {
    if (item.isCurrency) {
      return false;
    }
    if (count % 1n !== 0n || count < 0n || count > 100n) {
      return false;
    }
    return true;
  }, [item, count]);

  if (!useSelector) {
    return (
      <input
        type="number"
        value={String(count)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  } else {
    return (
      <select onChange={(e) => onChange(e.target.value)} value={String(count)}>
        {[...Array(100).keys()].map((newCount) => (
          <option key={newCount} value={String(newCount)}>
            {newCount === 0 ? "-" : `${newCount}x`}
          </option>
        ))}
      </select>
    );
  }
};

export const ItemBagRow: React.FunctionComponent<{
  itemAndCount: ItemAndCount;
  onChange: (row?: ItemAndCount) => void;
}> = ({ itemAndCount: { item, count }, onChange }) => {
  const allItems = useMatchingBiscuits();
  return (
    <li>
      <CountEditor
        item={item}
        count={count}
        onChange={(newCount) =>
          onChange(newCount > 0 ? { item, count: newCount } : undefined)
        }
      />
      <BiscuitDropDown
        biscuits={allItems}
        selected={item.id}
        nullItem="DELETE"
        onSelect={(newItem) => {
          if (newItem === item.id) {
            // No change.
            return;
          }
          if (!newItem) {
            onChange(undefined);
            return;
          }
          onChange(newItem ? countOf(newItem, count) : undefined);
        }}
      />
      {item.isWearable && (
        <select
          value={itemDyedColor(item) ?? ""}
          onChange={(e) => {
            const newValue = e.target.value;
            if (isValidDyeColor(newValue)) {
              onChange(
                countOf(
                  item.id,
                  {
                    [attribs.paletteColor.id]: dyeColorToPaletteColor(newValue),
                  },
                  count
                )
              );
            } else {
              onChange(countOf(item.id, count));
            }
          }}
        >
          <option value="">No Dye</option>
          {colorEntries("color_palettes/item_primary_colors").map(({ id }) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      )}
    </li>
  );
};

export const ItemBagEditor: React.FunctionComponent<{
  schema?: SchemaPath;
  bag: ItemBag;
  placeholder?: string;
  onChange: (newBag: ItemBag) => void;
}> = ({ schema: schemaPath, bag, placeholder, onChange }) => {
  const allItems = useMatchingBiscuits(schemaPath);

  const itemNames = new DefaultMap((id) => {
    const item = allItems.find((item) => item.id === id);
    return item ? item.name : `Unknown/${id}`;
  });

  const sortedBag = useMemo(
    () =>
      Array.from(bag.values()).sort(({ item: a }, { item: b }) =>
        itemNames.get(a.id).localeCompare(itemNames.get(b.id))
      ),
    [bag, allItems]
  );

  return (
    <ul className={styles["item-bag-editor"]}>
      {placeholder && sortedBag.length === 0 && (
        <li className={styles["placeholder"]}>
          <span>{placeholder}</span>
        </li>
      )}
      {sortedBag.map((itemAndCount, index) => (
        <ItemBagRow
          key={index}
          itemAndCount={itemAndCount}
          onChange={(row) => {
            // Remove the old value.
            const updated = Array.from(sortedBag);
            updated.splice(index, 1);
            if (row) {
              const existing = updated.find(
                ({ item }) => item.id === row.item.id
              );
              if (existing !== undefined) {
                existing.count += row.count;
              } else {
                updated.push(row);
              }
            }
            onChange(createBag(...updated));
          }}
        />
      ))}
      <li>
        <BiscuitDropDown
          biscuits={allItems}
          selected={INVALID_BIOMES_ID}
          nullItem="Add"
          onSelect={(newItem) => {
            if (!newItem) {
              return;
            }
            if (sortedBag.some(({ item }) => item.id === newItem)) {
              return;
            }
            const updated = Array.from(sortedBag);
            updated.push(countOf(newItem));
            onChange(createBag(...updated));
          }}
        />
      </li>
    </ul>
  );
};

export const ItemBagArrayEditor: React.FunctionComponent<{
  schema?: SchemaPath;
  bagArray: ItemBag[];
  placeholder?: string;
  onChange: (newBag: ItemBag[]) => void;
}> = ({ schema, bagArray, placeholder, onChange }) => {
  const handleChange = (index: number) => {
    return (newBag: ItemBag) => {
      const newBagArray = [...bagArray];
      newBagArray[index] = newBag;
      onChange(newBagArray);
    };
  };

  const handleDelete = (index: number) => {
    const newBagArray = [...bagArray];
    newBagArray.splice(index, 1);
    onChange(newBagArray);
  };

  const handleAdd = () => {
    const newBagArray = [...bagArray];
    newBagArray.push(new Map());
    onChange(newBagArray);
  };

  return (
    <>
      <ul className={styles["item-bag-array-editor"]}>
        {bagArray.map((bag, index) => (
          <div key={index} className={styles["item-bag-wrapper"]}>
            <ItemBagEditor
              bag={bag}
              onChange={handleChange(index)}
              schema={schema}
              placeholder={placeholder}
            />
            <DialogButton
              onClick={() => handleDelete(index)}
              extraClassNames={styles["delete-button"]}
            >
              🗑️
            </DialogButton>
          </div>
        ))}
      </ul>
      <DialogButton onClick={handleAdd} size="xsmall">
        Add
      </DialogButton>
    </>
  );
};
