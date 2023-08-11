import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { useItemTypes } from "@/client/components/admin/bikkie/attributes/triggers/helpers";
import { CountInput } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/CountInput";
import { StationInput } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/StationInput";
import type { CraftTypeStoredTriggerDefinition } from "@/shared/triggers/schema";

export const EditCraftTypeTrigger: React.FunctionComponent<{
  def: Readonly<CraftTypeStoredTriggerDefinition>;
  onChange: (def: CraftTypeStoredTriggerDefinition) => void;
}> = ({ def, onChange }) => {
  const itemTypes = useItemTypes();
  return (
    <>
      <li>
        <label>Type</label>
        <BiscuitDropDown
          biscuits={itemTypes}
          selected={def.typeId}
          onSelect={(id) => {
            if (id) {
              onChange({
                ...def,
                typeId: id,
              });
            }
          }}
        />
      </li>
      <li>
        <label>Crafting Station</label>
        <StationInput def={def} onChange={onChange} />
      </li>
      <li>
        <label>Count</label>
        <CountInput def={def} onChange={onChange} />
      </li>
    </>
  );
};
