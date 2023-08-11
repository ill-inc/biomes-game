import { BuffsAndProbabilitiesAttributeEditor } from "@/client/components/admin/bikkie/attributes/BuffsAttributeEditor";
import { DurationEditor } from "@/client/components/admin/bikkie/attributes/DurationEditor";
import type { FertilizerEffect } from "@/shared/game/farming";
import {
  defaultFertilizerEffect,
  zFertilizerEffect,
} from "@/shared/game/farming";

export const EditFertilizerEffect: React.FunctionComponent<{
  value: FertilizerEffect;
  onChange: (newValue: FertilizerEffect) => void;
}> = ({ value, onChange }) => {
  return (
    <div>
      <div>
        <label>Effect</label>
        <select
          onChange={(e) =>
            onChange(
              defaultFertilizerEffect(
                e.target.value as FertilizerEffect["kind"]
              )
            )
          }
        >
          {[...zFertilizerEffect.optionsMap.keys()].map((kindPrimitive) => {
            const kind = kindPrimitive as FertilizerEffect["kind"];
            return (
              <option value={kind} selected={value.kind === kind} key={kind}>
                {kind}
              </option>
            );
          })}
        </select>
        {(value.kind === "time" || value.kind === "water") && (
          <DurationEditor
            timeMs={value.timeMs}
            onChange={(timeMs) => onChange({ ...value, timeMs })}
          />
        )}
        {value.kind === "buff" && (
          <BuffsAndProbabilitiesAttributeEditor
            value={value.buffs}
            onChange={(buffs) => onChange({ ...value, buffs })}
          />
        )}
      </div>
    </div>
  );
};
