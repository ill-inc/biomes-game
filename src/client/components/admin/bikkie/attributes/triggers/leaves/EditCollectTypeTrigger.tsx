import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { useItemTypes } from "@/client/components/admin/bikkie/attributes/triggers/helpers";
import { CountInput } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/CountInput";
import styles from "@/client/styles/admin.challenges.module.css";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import type { PropsWithChildren } from "react";

export function EditCollectTypeTrigger<
  T extends StoredTriggerDefinition & {
    count: number;
    typeId: BiomesId;
  }
>({
  def,
  onChange,
  children,
}: PropsWithChildren<{
  def: Readonly<T>;
  onChange: (def: T) => void;
}>) {
  const itemTypes = useItemTypes();
  return (
    <>
      <li>
        <label>Type</label>
        <BiscuitDropDown
          biscuits={itemTypes}
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
      {children}
    </>
  );
}
