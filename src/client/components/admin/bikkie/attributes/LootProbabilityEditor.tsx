import type { LootProbability } from "@/shared/game/item_specs";
import { zLootProbability } from "@/shared/game/item_specs";
import { lootProbabilityToNumber } from "@/shared/game/items";
import { capitalize, compact, flatMap, sortBy, toNumber } from "lodash";
import { useState } from "react";
import { ZodEnum } from "zod";

export const LootProbabilityEditor: React.FunctionComponent<{
  value: LootProbability;
  onChange: (newValue: LootProbability) => void;
}> = ({ value, onChange }) => {
  const isNumber = typeof value === "number";
  const [showCustom, setShowCustom] = useState(isNumber);
  const enums = sortBy(
    compact(
      flatMap(zLootProbability.options, (x) => {
        if (x instanceof ZodEnum) {
          return [...x.options.values()];
        }
        return;
      })
    ),
    (x) => lootProbabilityToNumber(x)
  );
  const enumLabels = new Map<LootProbability, string>(
    enums.map((x) => [
      x,
      `${capitalize(x)} (${lootProbabilityToNumber(x) * 100}%)`,
    ])
  );
  return (
    <div className={"flex"}>
      {showCustom && (
        <input
          type={"number"}
          value={lootProbabilityToNumber(value)}
          onChange={(e) => {
            onChange(toNumber(e.target.value));
          }}
        />
      )}
      <select
        value={showCustom ? "custom" : value}
        onChange={(e) => {
          if (e.target.value === "custom") {
            setShowCustom(true);
            return;
          }
          onChange(e.target.value as LootProbability);
          setShowCustom(false);
        }}
      >
        {enums.map((x) => (
          <option key={x} value={x}>
            {enumLabels.get(x) ?? x}
          </option>
        ))}
        <option value={"custom"} disabled={true}>
          Custom
        </option>
      </select>
    </div>
  );
};
