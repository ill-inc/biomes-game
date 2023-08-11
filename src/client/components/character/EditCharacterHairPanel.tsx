import { iconUrl } from "@/client/components/inventory/icons";
import { getBiscuits } from "@/shared/bikkie/active";
import { BikkieIds } from "@/shared/bikkie/ids";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";

export const EditCharacterHairPanel: React.FunctionComponent<{
  selectedId: BiomesId;
  onSelect: (newId: BiomesId) => void;
}> = ({ selectedId, onSelect }) => {
  const hairSlots = getBiscuits(bikkie.schema.items.wearables.hair).map(
    ({ id }) => {
      if (id === BikkieIds.hair) {
        id = INVALID_BIOMES_ID;
      }
      return (
        <div
          className={`button ${selectedId === id ? "selected" : ""}`}
          key={id}
          onClick={() => onSelect(id)}
        >
          {id ? <img src={iconUrl(anItem(id))} /> : undefined}
        </div>
      );
    }
  );
  return <div className="button-row">{hairSlots}</div>;
};
