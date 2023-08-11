import { ItemBagEditor } from "@/client/components/admin/bikkie/attributes/ItemBagEditor";
import { LootProbabilityEditor } from "@/client/components/admin/bikkie/attributes/LootProbabilityEditor";
import styles from "@/client/styles/admin.bikkie.module.css";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import type { DropTable } from "@/shared/game/item_specs";
import {
  bagSpecToBag,
  bagToBagSpec,
  lootProbabilityToNumber,
} from "@/shared/game/items";
import React from "react";

export const DropTableEditor: React.FunctionComponent<{
  value: DropTable;
  schema?: SchemaPath;
  placeholder?: string;
  onChange: (newTable: DropTable) => void;
}> = ({ value: table, schema, placeholder, onChange }) => {
  const totalRolls = table.reduce(
    (sum, [roll]) => sum + lootProbabilityToNumber(roll),
    0
  );
  const anyCustom = table.some(([roll]) => lootProbabilityToNumber(roll) > 1);
  return (
    <div className={styles["drop-table-editor"]}>
      {placeholder && table.length === 0 && (
        <div className={styles["placeholder"]}>
          <span>{placeholder}</span>
        </div>
      )}
      {table.map(([roll, bag], index) => {
        return (
          <React.Fragment key={index}>
            <div className={styles["roll"]}>
              <LootProbabilityEditor
                value={roll}
                onChange={(newProbability) => {
                  const updated = Array.from(table);
                  updated[index][0] = newProbability;
                  onChange(updated);
                }}
              />
              {anyCustom && <div>/{totalRolls} drops:</div>}
            </div>
            <ItemBagEditor
              bag={bagSpecToBag(bag)}
              schema={schema}
              placeholder="Nothing"
              onChange={(newBag) => {
                const newBagSpec = bagToBagSpec(newBag);
                const updated = Array.from(table);
                if (newBagSpec.length === 0) {
                  updated.splice(index, 1);
                } else {
                  updated[index] = [roll, newBagSpec];
                }
                onChange(updated);
              }}
            />
          </React.Fragment>
        );
      })}
      <button
        onClick={() => {
          const updated = Array.from(table);
          updated.push([1, []]);
          onChange(updated);
        }}
      >
        Add
      </button>
    </div>
  );
};
