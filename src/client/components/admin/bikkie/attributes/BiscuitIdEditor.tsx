import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import type { BiomesId } from "@/shared/ids";

export const BiscuitIdEditor: React.FunctionComponent<{
  value: BiomesId;
  schema?: SchemaPath;
  nullItem?: string;
  disabled?: boolean;
  onChange: (newValue: BiomesId) => void;
}> = ({ value, schema: schemaPath, nullItem, disabled, onChange }) => {
  const allItems = useMatchingBiscuits(schemaPath);

  return (
    <BiscuitDropDown
      biscuits={allItems}
      disabled={disabled}
      useDisplayName
      selected={value}
      nullItem={nullItem ?? "Select"}
      onSelect={(newItem) => {
        if (!newItem || value === newItem) {
          return;
        }
        onChange(newItem);
      }}
    />
  );
};
