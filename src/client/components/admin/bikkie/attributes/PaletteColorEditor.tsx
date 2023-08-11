import { colorPalettesMap } from "@/galois/assets/color_palettes";
import { flatMapMap } from "@/shared/util/collections";
import { useMemo } from "react";

export const PaletteColorEditor: React.FunctionComponent<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const options = useMemo(() => {
    return [
      "",
      ...flatMapMap(colorPalettesMap, (palette, paletteKey) =>
        palette.def.paletteEntries.map((option) => `${paletteKey}:${option}`)
      ),
    ].sort();
  }, []);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};
