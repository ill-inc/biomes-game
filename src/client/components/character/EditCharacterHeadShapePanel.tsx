import {
  CharacterPreview,
  makePreviewSlot,
} from "@/client/components/character/CharacterPreview";
import { getBiscuits } from "@/shared/bikkie/active";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type { ReadonlyAppearance } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { Vector3 } from "three";

export const EditCharacterHeadShapePanel: React.FunctionComponent<{
  selectedId: BiomesId;
  previewAppearance: ReadonlyAppearance;
  onSelect: (newId: BiomesId) => void;
  showLabel?: boolean;
}> = ({ selectedId, previewAppearance, onSelect, showLabel = true }) => {
  const cameraPos = new Vector3(6, 4.33, -13.33);
  const controlTarget = new Vector3(0, 1.4, 0);
  const headShapeSlots = getBiscuits(bikkie.schema.head).map(({ id }) => (
    <CharacterPreview
      key={id}
      previewSlot={makePreviewSlot("bikkie", id)}
      appearanceOverride={{
        ...previewAppearance,
        head_id: id,
      }}
      wearableOverrides={new Map()}
      onClick={() => onSelect(id)}
      extraClassName={"button" + (selectedId == id ? " selected" : "")}
      controlTarget={controlTarget}
      cameraPos={cameraPos}
      cameraFOV={3}
      controls={false}
      animate={false}
    />
  ));

  return (
    <div className="head-shape">
      {showLabel && <label>Head style</label>}
      <div className="button-row button-row-3">{headShapeSlots}</div>
    </div>
  );
};
