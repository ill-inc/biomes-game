import type { ShapeName } from "@/shared/asset_defs/shapes";
import { zShapeName } from "@/shared/asset_defs/shapes";

export const ShapeNameEditor: React.FunctionComponent<{
  shape: Readonly<ShapeName>;
  onChange: (shape: ShapeName) => void;
}> = ({ shape, onChange }) => {
  return (
    <select onChange={(e) => onChange(e.target.value as ShapeName)}>
      {zShapeName.options.map((shapeName) => (
        <option
          value={shapeName}
          selected={shapeName === shape}
          key={shapeName}
        >
          {shapeName}
        </option>
      ))}
    </select>
  );
};
