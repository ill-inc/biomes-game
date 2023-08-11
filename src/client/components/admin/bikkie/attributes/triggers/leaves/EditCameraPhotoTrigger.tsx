import { CountInput } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/CountInput";
import type { CameraMode } from "@/shared/ecs/gen/types";
import { zCameraMode } from "@/shared/game/types";
import { isBiomesId } from "@/shared/ids";
import type { CameraPhotoStoredTriggerDefinition } from "@/shared/triggers/schema";
import { toInteger } from "lodash";

export const EditCameraPhotoTrigger: React.FunctionComponent<{
  def: Readonly<CameraPhotoStoredTriggerDefinition>;
  onChange: (def: CameraPhotoStoredTriggerDefinition) => void;
}> = ({ def, onChange }) => {
  return (
    <>
      <li>
        <label>Count</label>
        <CountInput def={def} onChange={onChange} />
      </li>
      <li>
        <label>Mode</label>
        <select
          defaultValue={def.mode || "null"}
          onChange={(e) => {
            onChange({
              ...def,
              mode:
                e.target.value === "null"
                  ? undefined
                  : (e.target.value as CameraMode),
            });
          }}
        >
          <option value="null">No Requirement</option>
          {Object.keys(zCameraMode.Values).map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </li>
      <li>
        <label>Num People</label>
        <input
          type="number"
          defaultValue={def.people || 0}
          onChange={(e) => {
            const val = toInteger(e.target.value);
            if (isNaN(val)) {
              return;
            }
            onChange({
              ...def,
              people: val,
            });
          }}
        />
      </li>
      <li>
        <label>Num Groups</label>
        <input
          type="number"
          defaultValue={def.groups || 0}
          onChange={(e) => {
            const val = toInteger(e.target.value);
            if (isNaN(val)) {
              return;
            }
            onChange({
              ...def,
              groups: val,
            });
          }}
        />
      </li>
      <li>
        <label>Group Id</label>
        <input
          type="number"
          defaultValue={def.groupId || ""}
          onChange={(e) => {
            const val = toInteger(e.target.value);
            if (isNaN(val) || !isBiomesId(val)) {
              onChange({
                ...def,
                groupId: undefined,
              });
            } else {
              onChange({
                ...def,
                groupId: val,
              });
            }
          }}
        />
      </li>
    </>
  );
};
