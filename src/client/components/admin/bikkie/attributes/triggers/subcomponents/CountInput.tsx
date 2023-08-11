import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { toInteger } from "lodash";

export const CountInput = <
  TDef extends Readonly<StoredTriggerDefinition & { count: number }>
>({
  def,
  onChange,
}: {
  def: TDef;
  onChange: (def: TDef) => void;
}) => {
  return (
    <input
      type="number"
      defaultValue={def.count || 1}
      onChange={(e) => {
        const newCount = toInteger(e.target.value);
        if (isNaN(newCount)) {
          // don't update on invalid numbers
          return;
        }
        if (newCount > 0) {
          onChange({
            ...def,
            count: newCount,
          });
        }
      }}
    />
  );
};
