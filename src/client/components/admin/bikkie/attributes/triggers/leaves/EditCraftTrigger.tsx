import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { CountInput } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/CountInput";
import { StationInput } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/StationInput";
import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import styles from "@/client/styles/admin.challenges.module.css";
import { anItem } from "@/shared/game/item";
import type { CraftStoredTriggerDefinition } from "@/shared/triggers/schema";

export const EditCraftTrigger: React.FunctionComponent<{
  def: Readonly<CraftStoredTriggerDefinition>;
  onChange: (def: CraftStoredTriggerDefinition) => void;
}> = ({ def, onChange }) => {
  const items = useMatchingBiscuits("/items");
  return (
    <>
      <li className={styles["item"]}>
        <label>Item</label>
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
        <label>Crafting Station</label>
        <StationInput def={def} onChange={onChange} />
      </li>
      <li className={styles["item-qty"]}>
        <label>Qty</label>
        <CountInput def={def} onChange={onChange} />
      </li>
    </>
  );
};
