import styles from "@/client/styles/admin.zfs.module.css";
import type * as z from "zod";

export const ZfsSet = <
  // Only sets of enums are currently supported. To generalize
  // in the future, this implementation can be made into a
  // special case.
  S extends z.ZodSet<z.ZodEnum<[string, ...string[]]>>,
  V extends z.infer<S>
>({
  schema,
  value,
  onChangeRequest,
}: {
  schema: S;
  value: V;
  onChangeRequest: (newValue: V) => void;
}) => {
  const enumSchema = schema._def.valueType;
  return (
    <div className={styles["zfs-set-enum"]}>
      {enumSchema.options.map((v, i) => (
        <div
          className={styles["zfs-set-enum-row"]}
          key={i}
          onClick={() => {
            onChangeRequest(
              new Set(
                value.has(v) ? [...value].filter((x) => x != v) : [...value, v]
              ) as V
            );
          }}
        >
          <input type="checkbox" checked={value.has(v)} />
          {v}
        </div>
      ))}
    </div>
  );
};
