import { CountInput } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/CountInput";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";

export function EditSimpleCountTrigger<
  T extends StoredTriggerDefinition & { count: number }
>({ def, onChange }: { def: Readonly<T>; onChange: (def: T) => void }) {
  return (
    <>
      <li>
        <label>Count</label>
        <CountInput def={def} onChange={onChange} />
      </li>
    </>
  );
}
