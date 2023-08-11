import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { CountInput } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/CountInput";
import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import styles from "@/client/styles/admin.challenges.module.css";
import { WEARABLE_SLOTS } from "@/shared/bikkie/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { WearTypeStoredTriggerDefinition } from "@/shared/triggers/schema";
import { useMemo } from "react";

function useWearableTypes() {
  const allBiscuits = useMatchingBiscuits();
  return useMemo(
    () => allBiscuits.filter((b) => WEARABLE_SLOTS.includes(b.id as any)),
    [allBiscuits]
  );
}

export const EditWearTypeTrigger: React.FunctionComponent<{
  def: Readonly<WearTypeStoredTriggerDefinition>;
  onChange: (def: WearTypeStoredTriggerDefinition) => void;
}> = ({ def, onChange }) => {
  const wearableTypes = useWearableTypes();
  return (
    <>
      <li>
        <label>Type</label>
        <BiscuitDropDown
          biscuits={wearableTypes}
          selected={def.typeId || INVALID_BIOMES_ID}
          nullItem="None"
          onSelect={(typeId) => {
            if (typeId) {
              onChange({
                ...def,
                typeId,
              });
            }
          }}
        />
      </li>
      <li className={styles["item-qty"]}>
        <label>Qty</label>
        <CountInput def={def} onChange={onChange} />
      </li>
    </>
  );
};
