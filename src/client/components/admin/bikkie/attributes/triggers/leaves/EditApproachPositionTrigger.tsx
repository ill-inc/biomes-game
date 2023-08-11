import type { ApproachPositionTriggerDefinition } from "@/shared/triggers/schema";
import { toNumber } from "lodash";

export const EditApproachPositionTrigger: React.FunctionComponent<{
  def: Readonly<ApproachPositionTriggerDefinition>;
  onChange: (def: ApproachPositionTriggerDefinition) => void;
}> = ({ def, onChange }) => {
  return (
    <>
      <li>
        <label>X</label>
        <input
          type="number"
          defaultValue={def?.pos[0] || 0}
          onChange={(e) => {
            const x = toNumber(e.target.value);
            if (isNaN(x)) {
              return;
            }
            onChange({
              ...def,
              pos: [x, def.pos[1], def.pos[2]],
            });
          }}
        />
      </li>
      <li>
        <label>Y</label>
        <input
          type="number"
          defaultValue={def?.pos[1] || 0}
          onChange={(e) => {
            const y = toNumber(e.target.value);
            if (isNaN(y)) {
              return;
            }
            onChange({
              ...def,
              pos: [def.pos[0], y, def.pos[2]],
            });
          }}
        />
      </li>
      <li>
        <label>Z</label>
        <input
          type="number"
          defaultValue={def?.pos[2] || 0}
          onChange={(e) => {
            const z = toNumber(e.target.value);
            if (isNaN(z)) {
              return;
            }
            onChange({
              ...def,
              pos: [def.pos[0], def.pos[1], z],
            });
          }}
        />
      </li>
      <li>
        <label>Default Nav Aid</label>
        <input
          type="checkbox"
          defaultChecked={def?.allowDefaultNavigationAid ?? true}
          onChange={(e) => {
            onChange({
              ...def,
              allowDefaultNavigationAid: e.target.checked,
            });
          }}
        />
      </li>
    </>
  );
};
