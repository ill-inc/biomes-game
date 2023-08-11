import type { MapBeamStoredTriggerDefinition } from "@/shared/triggers/schema";
import { toNumber } from "lodash";

export const EditMapBeamTrigger: React.FunctionComponent<{
  def: Readonly<MapBeamStoredTriggerDefinition>;
  onChange: (def: MapBeamStoredTriggerDefinition) => void;
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
              pos: [x, def.pos[1]],
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
              pos: [def.pos[0], y],
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
