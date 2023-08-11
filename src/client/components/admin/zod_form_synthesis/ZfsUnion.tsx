import { AsyncDefaultReactContext } from "@/client/components/admin/zod_form_synthesis/AsyncDefault";
import type {
  CreateZfsAnyFn,
  LensMap,
} from "@/client/components/admin/zod_form_synthesis/shared";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import styles from "@/client/styles/admin.zfs.module.css";
import type { AsyncDefaultContext } from "@/shared/zfs/async_default";
import { canCreateDefault, createDefault } from "@/shared/zfs/async_default";
import { ok } from "assert";
import type { PropsWithChildren } from "react";
import { useContext } from "react";
import * as z from "zod";

export const MaybeWithTooltip: React.FunctionComponent<
  PropsWithChildren<{ schema: z.ZodTypeAny }>
> = ({ schema, children }) => {
  return schema.description ? (
    <Tooltipped tooltip={schema.description}>{children}</Tooltipped>
  ) : (
    <>{children}</>
  );
};

function getDefaultFunction(
  asyncDefaultContext: AsyncDefaultContext | undefined,
  subSchema: z.ZodTypeAny | z.ZodDiscriminatedUnion<"kind", any>
) {
  let defaultFunction: (() => Promise<unknown>) | undefined;
  if (canCreateDefault(subSchema)) {
    const captureContext = asyncDefaultContext && { ...asyncDefaultContext };
    defaultFunction = () => createDefault(captureContext, subSchema);
  }
  if (subSchema instanceof z.ZodDefault) {
    subSchema = subSchema._def.innerType; // Strip the z.ZodDefault type.
    ok(subSchema);
  }

  return defaultFunction;
}

export const ZfsUnion: React.FunctionComponent<{
  schema:
    | z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>
    | z.ZodDiscriminatedUnion<"kind", z.ZodDiscriminatedUnionOption<"kind">[]>;
  value: any;
  onChangeRequest: (newValue: any) => void;
  schemaLenses?: LensMap;
  createZfsAny: CreateZfsAnyFn;
}> = ({ schema, value, onChangeRequest, schemaLenses, createZfsAny }) => {
  const asyncDefaultContext = useContext(AsyncDefaultReactContext);
  const entriesWithKind: {
    kind: string;
    schema: z.ZodTypeAny;
    defaultFunction: () => Promise<unknown>;
  }[] = [];
  for (const subSchema of schema.options) {
    const kind = getKindForSchema(subSchema);
    if (kind === undefined) {
      return <div>Unsupported type for a union: {subSchema._def.typeName}</div>;
    }

    const defaultFunction = getDefaultFunction(asyncDefaultContext, subSchema);
    if (defaultFunction === undefined) {
      return (
        <div>
          The union type {kind} does not have a Zod default specified. If it is
          an object, make sure it has a kind field.
        </div>
      );
    }

    if (entriesWithKind.find(({ kind: k }) => kind === k)) {
      return (
        <div>A type with kind {kind} appears more than once in a union.</div>
      );
    }

    entriesWithKind.push({
      kind,
      schema: subSchema,
      defaultFunction,
    });
  }

  const valueKind = getKindForValue(value);
  if (valueKind === undefined) {
    return <div>Could not detect kind for currently set value.</div>;
  }

  const selectedEntry = entriesWithKind.find((e) => e.kind === valueKind);
  if (!selectedEntry) {
    return <>Invalid union kind {valueKind}</>;
  }

  return (
    <div className={styles["zfs-union"]}>
      <MaybeWithTooltip schema={selectedEntry?.schema}>
        <select
          onChange={(e) => {
            e.preventDefault();
            const targetValue = e.target.value;
            const newSelectedEntry = entriesWithKind.find(
              (entry) => entry.kind === targetValue
            );
            ok(newSelectedEntry, "Bad state for union selection");
            const defaultFn = newSelectedEntry.defaultFunction;
            // Instantiate the new selection with its default value.
            void (async () => {
              const newOne = await defaultFn();
              onChangeRequest(newOne);
            })();
          }}
          value={valueKind}
        >
          {entriesWithKind.map(({ kind }) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </MaybeWithTooltip>
      {schemaHasSubFields(selectedEntry.schema) ? (
        createZfsAny({
          schema: selectedEntry.schema,
          value,
          onChangeRequest,
          schemaLenses,
        })
      ) : (
        <></>
      )}
    </div>
  );
};

export function getKindForSchema(schema: z.ZodTypeAny): string | undefined {
  if (schema instanceof z.ZodObject && "kind" in schema.shape) {
    const kind = schema.shape.kind;
    if (
      kind instanceof z.ZodDefault &&
      kind._def.innerType instanceof z.ZodLiteral &&
      typeof kind._def.innerType._def.value === "string"
    ) {
      return kind._def.innerType._def.value;
    } else if (kind instanceof z.ZodLiteral && typeof kind.value === "string") {
      return kind.value;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}

export function getKindForValue(value: any): string | undefined {
  if (typeof value === "object") {
    if ("kind" in value && typeof value["kind"] === "string") {
      return value["kind"];
    }
  }
}

export function schemaHasSubFields(schema: z.ZodTypeAny): boolean {
  if (schema instanceof z.ZodObject && Object.keys(schema.shape).length > 1) {
    // We have sub fields if we have more than just the "kind" type.
    return true;
  }
  return false;
}
