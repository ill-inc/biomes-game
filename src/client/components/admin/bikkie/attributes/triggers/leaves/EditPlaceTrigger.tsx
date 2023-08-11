import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { CountInput } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/CountInput";
import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import { anItem } from "@/shared/game/item";
import type { PlaceStoredTriggerDefinition } from "@/shared/triggers/schema";

export const EditPlaceTrigger: React.FunctionComponent<{
  def: Readonly<PlaceStoredTriggerDefinition>;
  onChange: (def: PlaceStoredTriggerDefinition) => void;
}> = ({ def, onChange }) => {
  const items = useMatchingBiscuits("/items");
  return (
    <>
      <li>
        <label>Block</label>
        <BiscuitDropDown
          biscuits={items}
          selected={def.item.id}
          onSelect={(newItemId) => {
            if (newItemId) {
              onChange({
                ...def,
                item: anItem(newItemId),
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
