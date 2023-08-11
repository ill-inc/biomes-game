import { ColorRow } from "@/client/components/character/ColorRow";
import type { PaletteKey } from "@/shared/asset_defs/color_palettes";
import { colorEntries } from "@/shared/asset_defs/color_palettes";
("@/shared/asset_defs/color_palettes");

export const EditCharacterColorPanel: React.FunctionComponent<{
  selectedId: string | undefined;
  onSelect: (newId: string) => void;
  palette: PaletteKey;
}> = ({ selectedId, onSelect, palette }) => {
  return (
    <div>
      <div className="button-row">
        <ColorRow
          colors={colorEntries(palette)}
          keyPrefix="skin_color"
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
};
