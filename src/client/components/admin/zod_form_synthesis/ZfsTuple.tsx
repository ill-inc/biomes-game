import type {
  CreateZfsAnyFn,
  LensMap,
} from "@/client/components/admin/zod_form_synthesis/shared";
import styles from "@/client/styles/admin.zfs.module.css";
import { cloneDeepWithItems } from "@/shared/game/item";
import { Fragment } from "react";
import type * as z from "zod";

export const ZfsTuple = <S extends z.ZodTuple<any>, V extends z.infer<S>>({
  schema,
  value,
  onChangeRequest,
  schemaLenses,
  createZfsAny,
}: {
  schema: S;
  value: V;
  onChangeRequest: (newValue: V) => void;
  schemaLenses?: LensMap;
  createZfsAny: CreateZfsAnyFn;
}) => {
  return (
    <div className={styles["zfs-tuple"]}>
      {value.map((v, i) => (
        <Fragment key={i}>
          {createZfsAny({
            schema: schema.items[i],
            value: v,
            onChangeRequest: (newV) => {
              const newTuple = cloneDeepWithItems(value);
              newTuple[i] = newV;
              onChangeRequest(newTuple);
            },
            schemaLenses,
          })}
        </Fragment>
      ))}
    </div>
  );
};
