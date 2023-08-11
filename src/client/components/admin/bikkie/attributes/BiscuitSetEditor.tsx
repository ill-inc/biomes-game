import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import styles from "@/client/styles/admin.bikkie.module.css";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { useMemo } from "react";

export const BiscuitSetEditor: React.FunctionComponent<{
  value: BiomesId[];
  placeholder?: string;
  schema?: SchemaPath;
  onChange: (newBag: BiomesId[]) => void;
}> = ({ value, placeholder, schema: schemaPath, onChange }) => {
  const allItems = useMatchingBiscuits(schemaPath);

  const allNames = useMemo(
    () => new Map(allItems.map(({ id, name }) => [id, name])),
    [allItems]
  );
  const sortedSet = useMemo(
    () =>
      value.sort((a, b) =>
        (allNames.get(a) ?? "Unknown").localeCompare(
          allNames.get(b) ?? "Unknown"
        )
      ),
    [value, allItems]
  );

  const unusedItems = useMemo(
    () => allItems.filter((item) => !sortedSet.includes(item.id)),
    [allItems, sortedSet]
  );

  return (
    <ul className={styles["biscuit-set-editor"]}>
      {placeholder && sortedSet.length === 0 && <li>{placeholder}</li>}
      {sortedSet.map((item, index) => (
        <li key={item}>
          {allNames.get(item) ?? "Unknown"}
          <button
            onClick={() => {
              const updated = Array.from(sortedSet);
              updated.splice(index, 1);
              onChange(updated);
            }}
          >
            Remove
          </button>
        </li>
      ))}
      {unusedItems.length > 0 && (
        <li>
          <BiscuitDropDown
            biscuits={unusedItems}
            selected={INVALID_BIOMES_ID}
            nullItem="Add"
            onSelect={(newItem) => {
              if (!newItem || sortedSet.includes(newItem)) {
                return;
              }
              onChange([...sortedSet, newItem]);
            }}
          />
        </li>
      )}
    </ul>
  );
};
