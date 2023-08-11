import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { CountInput } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/CountInput";
import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { BlueprintBuiltStoredTriggerDefinition } from "@/shared/triggers/schema";

export const EditBlueprintBuiltTrigger: React.FunctionComponent<{
  def: Readonly<BlueprintBuiltStoredTriggerDefinition>;
  onChange: (def: BlueprintBuiltStoredTriggerDefinition) => void;
}> = ({ def, onChange }) => {
  const blueprints = useMatchingBiscuits("/items/blueprints");
  return (
    <>
      <li>
        <label>Blueprint</label>
        <BiscuitDropDown
          biscuits={blueprints}
          selected={def.blueprint || INVALID_BIOMES_ID}
          nullItem="None"
          onSelect={(blueprint) => {
            if (blueprint) {
              onChange({
                ...def,
                blueprint,
              });
            }
          }}
        />
      </li>
      <li>
        <label>Count</label>
        <CountInput def={def} onChange={onChange} />
      </li>
    </>
  );
};
