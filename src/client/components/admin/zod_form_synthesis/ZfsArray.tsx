import { AsyncDefaultReactContext } from "@/client/components/admin/zod_form_synthesis/AsyncDefault";
import type {
  CreateZfsAnyFn,
  LensMap,
} from "@/client/components/admin/zod_form_synthesis/shared";
import { DialogButton } from "@/client/components/system/DialogButton";
import styles from "@/client/styles/admin.zfs.module.css";
import { cloneDeepWithItems } from "@/shared/game/item";
import { fireAndForget } from "@/shared/util/async";
import { canCreateDefault, createDefault } from "@/shared/zfs/async_default";
import React, { useCallback, useContext, useState } from "react";
import type * as z from "zod";

export const ZfsArray = <
  S extends z.ZodArray<z.ZodTypeAny>,
  V extends z.infer<S>
>({
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
  const asyncDefaultContext = useContext(AsyncDefaultReactContext);
  const [adding, setAdding] = useState(false);

  const addNewItem = useCallback(async () => {
    if (adding) {
      return;
    }
    setAdding(true);
    try {
      const newArray = cloneDeepWithItems(value);
      newArray.push(await createDefault(asyncDefaultContext, schema.element));
      onChangeRequest(newArray);
    } finally {
      setAdding(false);
    }
  }, [value, adding]);

  return (
    <div className={styles["zfs-array"]}>
      {value.map((v, i) => (
        <React.Fragment key={i}>
          {schema._def.minLength === null ||
          value.length > schema._def.minLength.value ? (
            <div className={styles["zfs-x-button"]}>
              <DialogButton
                onClick={() => {
                  const newArray = cloneDeepWithItems(value);
                  newArray.splice(i, 1);
                  onChangeRequest(newArray);
                }}
              >
                X
              </DialogButton>
            </div>
          ) : (
            <div></div>
          )}
          {createZfsAny({
            schema: schema.element,
            value: v,
            onChangeRequest: (newV) => {
              const newArray = cloneDeepWithItems(value);
              newArray[i] = newV;
              onChangeRequest(newArray);
            },
            schemaLenses,
          })}
        </React.Fragment>
      ))}
      {canCreateDefault(schema.element) &&
      (schema._def.maxLength === null ||
        value.length < schema._def.maxLength.value) ? (
        <>
          <div className={styles["zfs-x-button"]}>
            <DialogButton
              disabled={adding}
              onClick={() => fireAndForget(addNewItem())}
            >
              +
            </DialogButton>
          </div>
          <div></div>
        </>
      ) : (
        <></>
      )}
    </div>
  );
};
