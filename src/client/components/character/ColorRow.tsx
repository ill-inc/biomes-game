import type { ColorEntry } from "@/shared/asset_defs/color_palettes";
import { numberToHex } from "@/shared/math/colors";

export const ColorRow: React.FunctionComponent<{
  colors: ColorEntry[];
  keyPrefix: string;
  selectedId: string | undefined;
  onSelect: (newId: string) => void;
}> = ({ colors, keyPrefix, selectedId, onSelect }) => {
  return (
    <>
      {colors.map((x) => (
        <div
          key={`${keyPrefix}_${x.id}`}
          className={"button" + (selectedId == x.id ? " selected" : "")}
          style={{
            backgroundColor: `rgb(${x.iconColor[0]}, ${x.iconColor[1]}, ${x.iconColor[2]})`,
          }}
          onMouseDown={() => onSelect(x.id)}
        />
      ))}
    </>
  );
};

export const ColorRowHex: React.FunctionComponent<{
  colors: number[];
  selectedIndex: number | undefined;
  onSelect: (index: number) => void;
}> = ({ colors, selectedIndex, onSelect }) => {
  return (
    <>
      {colors.map((color, i) => (
        <div
          key={`${i}`}
          className={"button" + (selectedIndex == i ? " selected" : "")}
          style={{
            backgroundColor: `${numberToHex(color)}`,
          }}
          onMouseDown={() => onSelect(i)}
        />
      ))}
    </>
  );
};
