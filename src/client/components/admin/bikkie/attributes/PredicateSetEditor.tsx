import { DialogTypeaheadInput } from "@/client/components/system/DialogTypeaheadInput";
import styles from "@/client/styles/admin.bikkie.module.css";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { bikkieTrue } from "@/shared/bikkie/schema/types";
import type { BiomesId } from "@/shared/ids";
import { mapSet } from "@/shared/util/collections";
import { without } from "lodash";
import { useMemo, useState } from "react";

export const PredicateSetEditor: React.FunctionComponent<{
  value: Set<BiomesId>;
  placeholder?: string;
  onChange: (newValue: Set<BiomesId>) => void;
}> = ({ value, placeholder, onChange }) => {
  const bikkiePredicates = useMemo(
    () => attribs.all.filter((e) => e.type() === bikkieTrue),
    []
  );

  const [toAdd, setToAdd] = useState(bikkiePredicates[0]);

  return (
    <ul className={styles["biscuit-set-editor"]}>
      {placeholder && value.size === 0 && <li>{placeholder}</li>}
      {mapSet(value, (id) => (
        <li key={id}>
          {attribs.byId.get(id)?.name}
          <button
            onClick={() => {
              onChange(new Set<BiomesId>(without([...value.values()], id)));
            }}
          >
            Remove
          </button>
        </li>
      ))}
      <li className={styles["predicate"]}>
        <DialogTypeaheadInput
          options={bikkiePredicates}
          value={toAdd}
          getDisplayName={(e) => e.niceName ?? e.name}
          onChange={(e) => {
            if (e) {
              setToAdd(e);
            }
          }}
        />
        <button
          onClick={() => {
            if (toAdd) {
              onChange(
                new Set<BiomesId>([...value.values(), toAdd.id as BiomesId])
              );
            }
          }}
        >
          Add
        </button>
      </li>
    </ul>
  );
};
