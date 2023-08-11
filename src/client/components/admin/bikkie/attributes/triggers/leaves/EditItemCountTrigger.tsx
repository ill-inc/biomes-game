import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { CountInput } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/CountInput";
import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import styles from "@/client/styles/admin.challenges.module.css";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import { anItem } from "@/shared/game/item";
import { INVALID_BIOMES_ID } from "@/shared/ids";

import type { RawItem } from "@/shared/game/raw_item";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import type { PropsWithChildren } from "react";

export function EditItemCountTrigger<
  T extends StoredTriggerDefinition & { item?: RawItem; count: number }
>({
  def,
  onChange,
  children,
  schema: schemaPath,
  allowNone,
}: PropsWithChildren<{
  def: Readonly<T>;
  onChange: (def: T) => void;
  schema?: SchemaPath | undefined;
  allowNone?: boolean;
}>) {
  const items = useMatchingBiscuits(schemaPath ?? "/items");
  return (
    <>
      <li className={styles["item"]}>
        <label>Item</label>
        <BiscuitDropDown
          biscuits={items}
          selected={def.item?.id || INVALID_BIOMES_ID}
          nullItem={allowNone ? "None" : undefined}
          onSelect={(newItemId) => {
            if (newItemId) {
              onChange({
                ...def,
                item: anItem(newItemId),
              });
            } else if (allowNone) {
              onChange({
                ...def,
                item: anItem(INVALID_BIOMES_ID),
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
