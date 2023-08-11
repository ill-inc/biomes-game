import { DurationEditor } from "@/client/components/admin/bikkie/attributes/DurationEditor";
import { EntityIdInput } from "@/client/components/admin/bikkie/attributes/EntityIdInput";
import { ShapeNameEditor } from "@/client/components/admin/bikkie/attributes/ShapeNameEditor";
import styles from "@/client/styles/admin.bikkie.module.css";
import type { ShapeName } from "@/shared/asset_defs/shapes";
import type {
  FarmStage,
  GroupFarmStage,
  LogFarmStage,
} from "@/shared/game/farming";
import { defaultFarmStageSpec } from "@/shared/game/farming";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { Vec4 } from "@/shared/math/types";
import { useMemo, useState } from "react";

export const EditFarmingStageLog: React.FunctionComponent<{
  stage: Readonly<LogFarmStage>;
  onChange: (stage: FarmStage) => void;
}> = ({ stage, onChange }) => {
  return (
    <div>
      <label>Number of Logs</label>
      <input
        type="number"
        value={stage.logs}
        onChange={(e) => {
          onChange({ ...stage, logs: parseInt(e.target.value) });
        }}
      />
      <label>Log Shape</label>
      <ShapeNameEditor
        shape={stage.logShape as ShapeName}
        onChange={(logShape) => {
          onChange({ ...stage, logShape: logShape });
        }}
      />
    </div>
  );
};

export const EditFarmingStageGroup: React.FunctionComponent<{
  stage: Readonly<GroupFarmStage>;
  onChange: (stage: FarmStage) => void;
}> = ({ stage, onChange }) => {
  const [useId, setUseId] = useState(!!stage.groupId);
  return (
    <div>
      <label>Group</label>
      <select
        value={useId ? "id" : "blob"}
        onChange={(e) => {
          setUseId(e.target.value === "id");
        }}
      >
        <option value="id">Group Id</option>
        <option value="blob">Group Blob</option>
      </select>

      {useId ? (
        <EntityIdInput
          value={stage.groupId || INVALID_BIOMES_ID}
          onChange={(groupId) => {
            onChange({ ...stage, groupId, groupBlob: undefined });
          }}
        />
      ) : (
        <input
          type="text"
          value={stage.groupBlob}
          onChange={(e) => {
            onChange({
              ...stage,
              groupBlob: e.target.value,
              groupId: undefined,
            });
          }}
        />
      )}
    </div>
  );
};

export const EditFarmingRequiresSun: React.FunctionComponent<{
  requiresSun?: boolean;
  onChange: (requiresSun?: boolean) => void;
}> = ({ requiresSun, onChange }) => {
  return (
    <select
      value={`${requiresSun}`}
      onChange={(e) => {
        if (e.target.value === "true") {
          onChange(true);
        } else if (e.target.value === "false") {
          onChange(false);
        } else {
          onChange(undefined);
        }
      }}
    >
      <option value="true">Requires Sun</option>
      <option value="false">Requires Shade</option>
      <option value="undefined">No Sun/Shade Requirement</option>
    </select>
  );
};

const DEFAULT_IRRADIANCE = [255, 255, 255, 10] as Vec4;
export const EditFarmingIrradiance: React.FunctionComponent<{
  irradiance?: Vec4;
  onChange: (irradiance?: Vec4) => void;
}> = ({ irradiance, onChange }) => {
  const [localIrradiance, setLocalIrradiance] = useState<Vec4 | undefined>(
    irradiance
  );
  // TODO replace with color picker
  return (
    <div>
      <label>Irradiance</label>
      <input
        type="checkbox"
        checked={irradiance !== undefined}
        onChange={(e) => {
          if (e.target.checked) {
            onChange(localIrradiance ?? DEFAULT_IRRADIANCE);
          } else {
            onChange(undefined);
          }
        }}
      />
      {irradiance && (
        <div className="flex">
          <label>R</label>
          <input
            type="number"
            value={localIrradiance?.[0] ?? DEFAULT_IRRADIANCE[0]}
            onChange={(e) => {
              const newIrr = [
                parseFloat(e.target.value),
                localIrradiance?.[1] ?? DEFAULT_IRRADIANCE[1],
                localIrradiance?.[2] ?? DEFAULT_IRRADIANCE[2],
                localIrradiance?.[3] ?? DEFAULT_IRRADIANCE[3],
              ] as Vec4;
              setLocalIrradiance(newIrr);
              onChange(newIrr);
            }}
          />
          <label>G</label>
          <input
            type="number"
            value={localIrradiance?.[1] ?? DEFAULT_IRRADIANCE[1]}
            onChange={(e) => {
              const newIrr = [
                localIrradiance?.[0] ?? DEFAULT_IRRADIANCE[0],
                parseFloat(e.target.value),
                localIrradiance?.[2] ?? DEFAULT_IRRADIANCE[2],
                localIrradiance?.[3] ?? DEFAULT_IRRADIANCE[3],
              ] as Vec4;
              setLocalIrradiance(newIrr);
              onChange(newIrr);
            }}
          />
          <label>B</label>
          <input
            type="number"
            value={localIrradiance?.[2] ?? DEFAULT_IRRADIANCE[2]}
            onChange={(e) => {
              const newIrr = [
                localIrradiance?.[0] ?? DEFAULT_IRRADIANCE[0],
                localIrradiance?.[1] ?? DEFAULT_IRRADIANCE[1],
                parseFloat(e.target.value),
                localIrradiance?.[3] ?? DEFAULT_IRRADIANCE[3],
              ] as Vec4;
              setLocalIrradiance(newIrr);
              onChange(newIrr);
            }}
          />
          <label>Intensity</label>
          <input
            type="number"
            value={localIrradiance?.[3] ?? DEFAULT_IRRADIANCE[3]}
            onChange={(e) => {
              const newIrr = [
                localIrradiance?.[0] ?? DEFAULT_IRRADIANCE[0],
                localIrradiance?.[1] ?? DEFAULT_IRRADIANCE[1],
                localIrradiance?.[2] ?? DEFAULT_IRRADIANCE[2],
                parseFloat(e.target.value),
              ] as Vec4;
              setLocalIrradiance(newIrr);
              onChange(newIrr);
            }}
          />
        </div>
      )}
    </div>
  );
};

export const EditFarmingStage: React.FunctionComponent<{
  stage: Readonly<FarmStage>;
  onChange: (stage: FarmStage) => void;
}> = ({ stage, onChange }) => {
  const uniqueEdits = useMemo(() => {
    switch (stage.kind) {
      case "sapling":
        return <div>Sapling</div>;
      case "log":
        return <EditFarmingStageLog stage={stage} onChange={onChange} />;
      case "group":
        return <EditFarmingStageGroup stage={stage} onChange={onChange} />;
    }
  }, [stage, onChange]);
  return (
    <>
      <select
        onChange={(e) => {
          onChange(defaultFarmStageSpec(e.target.value as FarmStage["kind"]));
        }}
      >
        {["sapling", "log", "group"].map((kind) => (
          <option value={kind} selected={stage.kind === kind} key={kind}>
            {kind}
          </option>
        ))}
      </select>
      <label>Stage Name</label>
      <input
        type="text"
        value={stage.name}
        onChange={(e) => onChange({ ...stage, name: e.target.value })}
      />
      {uniqueEdits}
      <label>Stage Duration</label>
      <DurationEditor
        timeMs={stage.timeMs}
        onChange={(timeMs) => onChange({ ...stage, timeMs })}
      />
      <div className={styles["compound-attribute"]}>
        <label>Requires Water</label>
        <input
          type="checkbox"
          checked={stage.requiresWater ?? true}
          onChange={(e) => {
            onChange({ ...stage, requiresWater: e.target.checked });
          }}
        />
      </div>
      <EditFarmingRequiresSun
        requiresSun={stage.requiresSun}
        onChange={(requiresSun) => {
          onChange({ ...stage, requiresSun });
        }}
      />
    </>
  );
};
