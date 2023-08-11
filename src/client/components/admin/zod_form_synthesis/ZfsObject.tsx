import { AsyncDefaultReactContext } from "@/client/components/admin/zod_form_synthesis/AsyncDefault";
import type { LensMap } from "@/client/components/admin/zod_form_synthesis/shared";
import { ZfsAny } from "@/client/components/admin/zod_form_synthesis/ZfsAny";
import { DialogButton } from "@/client/components/system/DialogButton";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import styles from "@/client/styles/admin.zfs.module.css";
import { log } from "@/shared/logging";
import { fireAndForget } from "@/shared/util/async";
import { canCreateDefault, createDefault } from "@/shared/zfs/async_default";
import _ from "lodash";
import React, { useCallback, useContext, useState } from "react";
import * as z from "zod";

function stripOptional(x: z.ZodTypeAny) {
  if (x instanceof z.ZodOptional) {
    return x._def.innerType;
  } else {
    return x;
  }
}

const rowSeparator = (
  <>
    <div className={styles["zfs-object-row-separator"]}></div>
    <div className={styles["zfs-object-row-separator"]}></div>
  </>
);

export const ZfsObject = <S extends z.ZodObject<any>, V extends z.infer<S>>({
  schema,
  value,
  onChangeRequest,
  schemaLenses,
}: {
  schema: S;
  value: V;
  onChangeRequest: (newValue: V) => void;
  schemaLenses?: LensMap;
}) => {
  const asyncDefaultContext = useContext(AsyncDefaultReactContext);
  const shapeKeys = Object.keys(schema.shape).filter(
    (k) => !(schema.shape[k] instanceof z.ZodLiteral)
  );
  const valueKeys = Object.keys(value).filter((x) => value[x] !== undefined);
  const unspecifiedOptionalKeys: {
    key: string;
    newValueFunction: () => Promise<unknown>;
  }[] = [];
  for (const shapeKey of shapeKeys) {
    const propertyType = schema.shape[shapeKey];
    if (valueKeys.includes(shapeKey)) {
      continue;
    }
    if (!(propertyType instanceof z.ZodOptional<z.ZodTypeAny>)) {
      continue;
    }
    const innerType = propertyType._def.innerType;

    if (canCreateDefault(innerType)) {
      unspecifiedOptionalKeys.push({
        key: shapeKey,
        newValueFunction: () => createDefault(asyncDefaultContext, innerType),
      });
    } else {
      log.warn(
        `Optional property ${shapeKey} does not have a default value, so it will not appear in the list of fields to add.`
      );
    }
  }

  const specifiedKeys = valueKeys.filter((k) => shapeKeys.includes(k));

  const [selectedFieldToAdd, setSelectedFieldToAdd] = useState(0);
  const [adding, setAdding] = useState(false);

  const addNewItem = useCallback(async () => {
    if (adding) {
      return;
    }
    setAdding(true);
    try {
      const toAdd = unspecifiedOptionalKeys[selectedFieldToAdd];
      onChangeRequest({
        ...value,
        [toAdd.key]: await toAdd.newValueFunction(),
      });
      setSelectedFieldToAdd(0);
    } finally {
      setAdding(false);
    }
  }, [value, adding, selectedFieldToAdd]);

  return (
    <div className={styles["zfs-object"]}>
      {specifiedKeys.map((k, i) => {
        const curValue = value[k];
        return (
          <React.Fragment key={k}>
            {i !== 0 ? rowSeparator : <></>}
            <div className={styles["zfs-object-key"]}>
              {schema.shape[k] instanceof z.ZodOptional ? (
                <div className={styles["zfs-x-button"]}>
                  <DialogButton
                    onClick={() => onChangeRequest(_.omit(value, k) as V)}
                  >
                    X
                  </DialogButton>
                </div>
              ) : (
                <></>
              )}
              {schema.shape[k].description ? (
                <Tooltipped tooltip={schema.shape[k].description}>
                  {k}
                </Tooltipped>
              ) : (
                <div>{k}</div>
              )}
            </div>
            <div className={styles["zfs-object-value"]}>
              <ZfsAny
                schema={stripOptional(schema.shape[k])}
                value={curValue}
                onChangeRequest={(v) => onChangeRequest({ ...value, [k]: v })}
                schemaLenses={schemaLenses}
              ></ZfsAny>
            </div>
          </React.Fragment>
        );
      })}
      {unspecifiedOptionalKeys.length > 0 ? (
        <>
          {specifiedKeys.length > 0 ? rowSeparator : <></>}
          <>
            <div className={styles["zfs-object-property-to-add"]}>
              <select
                onChange={(e) => {
                  e.preventDefault();
                  setSelectedFieldToAdd(parseInt(e.target.value));
                }}
                value={selectedFieldToAdd}
              >
                {unspecifiedOptionalKeys.map((x, i) => (
                  <option key={i} value={i}>
                    {x.key}
                  </option>
                ))}
              </select>
            </div>
            <DialogButton
              disabled={adding}
              onClick={() => fireAndForget(addNewItem())}
            >
              Add
            </DialogButton>
          </>
        </>
      ) : (
        <></>
      )}
    </div>
  );
};
