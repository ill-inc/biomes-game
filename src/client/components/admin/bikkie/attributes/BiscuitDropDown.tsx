import type { ListedBiscuit } from "@/client/components/admin/bikkie/search";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import { DialogTypeaheadInput } from "@/client/components/system/DialogTypeaheadInput";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { useCallback, useMemo } from "react";

export const BiscuitDropDown: React.FunctionComponent<{
  biscuits: ListedBiscuit[];
  selected: BiomesId;
  nullItem?: string;
  disabled?: boolean;
  useDisplayName?: boolean;
  onSelect: (id?: BiomesId) => void;
}> = ({ biscuits, selected, nullItem, onSelect, disabled, useDisplayName }) => {
  const rawNameFor = useCallback(
    (b: ListedBiscuit) => {
      if (useDisplayName ?? true) {
        return b.displayName ?? b.name;
      } else {
        return b.name;
      }
    },
    [useDisplayName]
  );
  const options = useMemo(
    () => biscuits.sort((a, b) => rawNameFor(a).localeCompare(rawNameFor(b))),
    [biscuits, rawNameFor]
  );
  const notInSet = useMemo(
    () => selected && !biscuits.some((biscuits) => biscuits.id === selected),
    [biscuits, selected]
  );

  // Dedupes biscuit names in dropdowns
  const nameMap = useMemo(() => {
    const seenNames = new Set<string>();
    const seenTwice = new Set<string>();
    const map = new Map<ListedBiscuit, string>();
    for (const biscuit of biscuits) {
      const rn = rawNameFor(biscuit);
      if (seenNames.has(rn)) {
        seenTwice.add(rn);
      }
      seenNames.add(rn);
    }

    for (const biscuit of biscuits) {
      const rn = rawNameFor(biscuit);
      if (seenTwice.has(rn)) {
        map.set(
          biscuit,
          `${rawNameFor(biscuit)} (${biscuit.name} - ${biscuit.id})`
        );
      } else {
        map.set(biscuit, rn);
      }
    }
    return map;
  }, [biscuits, biscuits.length, rawNameFor]);

  return (
    <DialogTypeaheadInput<ListedBiscuit, ["Unknown"]>
      onChange={(e) => {
        if (e === "Unknown") {
          return;
        }

        if (e === undefined) {
          if (nullItem) {
            onSelect(undefined);
          }
          return;
        }

        onSelect(e.id);
      }}
      disabled={disabled}
      getDisplayName={(e) => nameMap.get(e) ?? "<BAD>"}
      getThumbnail={(e) => {
        const option = options.find((biscuit) => e && e.id === biscuit.id);
        const item = option ? anItem(option.id) : undefined;
        if (item) {
          return <ItemIcon className="h-3 w-3" item={item} />;
        } else {
          return undefined;
        }
      }}
      value={notInSet ? "Unknown" : options.find((e) => e.id === selected)}
      nullName={nullItem}
      nullable={nullItem !== undefined}
      options={options}
      specialValues={notInSet ? ["Unknown"] : undefined}
    />
  );
};
