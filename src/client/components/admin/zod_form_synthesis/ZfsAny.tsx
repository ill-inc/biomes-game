import { BiscuitIdEditor } from "@/client/components/admin/bikkie/attributes/BiscuitIdEditor";
import type { LensMap } from "@/client/components/admin/zod_form_synthesis/shared";
import { ZfsArray } from "@/client/components/admin/zod_form_synthesis/ZfsArray";
import { ZfsBigInt } from "@/client/components/admin/zod_form_synthesis/ZfsBigInt";
import { ZfsBoolean } from "@/client/components/admin/zod_form_synthesis/ZfsBoolean";
import { ZfsEnum } from "@/client/components/admin/zod_form_synthesis/ZfsEnum";
import { ZfsMap } from "@/client/components/admin/zod_form_synthesis/ZfsMap";
import { ZfsNumber } from "@/client/components/admin/zod_form_synthesis/ZfsNumber";
import { ZfsObject } from "@/client/components/admin/zod_form_synthesis/ZfsObject";
import { ZfsSet } from "@/client/components/admin/zod_form_synthesis/ZfsSet";
import { ZfsString } from "@/client/components/admin/zod_form_synthesis/ZfsString";
import { ZfsTuple } from "@/client/components/admin/zod_form_synthesis/ZfsTuple";
import { ZfsUnion } from "@/client/components/admin/zod_form_synthesis/ZfsUnion";
import type { BiomesId } from "@/shared/ids";
import { unwrappedSchema } from "@/shared/zfs/async_default";
import { getBikkieSchema } from "@/shared/zfs/bikkie_schema";
import * as z from "zod";

export const ZfsAny = <S extends z.ZodTypeAny, V extends z.infer<S>>({
  schema: wrappedSchema,
  value,
  onChangeRequest,
  schemaLenses,
}: {
  schema: S;
  value: V;
  onChangeRequest: (newValue: V) => void;
  schemaLenses?: LensMap;
}) => {
  const schema = unwrappedSchema(wrappedSchema);

  if (!schema) {
    return <div>Schema is undefined</div>;
  }
  const lensValue = schemaLenses?.map(schema, value, onChangeRequest);
  if (lensValue) {
    return lensValue;
  } else if (schema instanceof z.ZodObject) {
    return (
      <ZfsObject
        schema={schema}
        value={value}
        onChangeRequest={onChangeRequest}
        schemaLenses={schemaLenses}
      ></ZfsObject>
    );
  } else if (schema instanceof z.ZodArray) {
    return (
      <ZfsArray
        schema={schema}
        value={value}
        onChangeRequest={onChangeRequest}
        schemaLenses={schemaLenses}
        createZfsAny={ZfsAny}
      ></ZfsArray>
    );
  } else if (schema instanceof z.ZodTuple) {
    return (
      <ZfsTuple
        schema={schema}
        value={value}
        onChangeRequest={onChangeRequest}
        schemaLenses={schemaLenses}
        createZfsAny={ZfsAny}
      ></ZfsTuple>
    );
  } else if (
    schema instanceof z.ZodUnion ||
    schema instanceof z.ZodDiscriminatedUnion
  ) {
    return (
      <ZfsUnion
        schema={schema}
        value={value}
        onChangeRequest={onChangeRequest}
        schemaLenses={schemaLenses}
        createZfsAny={ZfsAny}
      ></ZfsUnion>
    );
  } else if (schema instanceof z.ZodEnum) {
    return (
      <ZfsEnum
        schema={schema}
        value={value}
        onChangeRequest={onChangeRequest as (v: string) => void}
      ></ZfsEnum>
    );
  } else if (schema instanceof z.ZodString) {
    return (
      <ZfsString
        schema={schema}
        value={value}
        onChangeRequest={onChangeRequest as (v: string) => void}
      ></ZfsString>
    );
  } else if (schema instanceof z.ZodNumber) {
    const bikkieSchema = getBikkieSchema(schema);
    if (bikkieSchema !== undefined) {
      return (
        <BiscuitIdEditor
          schema={bikkieSchema}
          value={value}
          onChange={onChangeRequest as (v: BiomesId) => void}
        />
      );
    } else {
      return (
        <ZfsNumber
          schema={schema}
          value={value}
          onChangeRequest={onChangeRequest as (v: number) => void}
        ></ZfsNumber>
      );
    }
  } else if (schema instanceof z.ZodBigInt) {
    return (
      <ZfsBigInt
        schema={schema}
        value={value}
        onChangeRequest={onChangeRequest as (v: bigint) => void}
      />
    );
  } else if (schema instanceof z.ZodBoolean) {
    return (
      <ZfsBoolean
        schema={schema}
        value={value}
        onChangeRequest={onChangeRequest as (v: boolean) => void}
      ></ZfsBoolean>
    );
  } else if (
    schema instanceof z.ZodSet &&
    schema._def.valueType instanceof z.ZodEnum
  ) {
    return (
      <ZfsSet
        schema={schema}
        value={value}
        onChangeRequest={
          onChangeRequest as (
            v: z.ZodSet<z.ZodEnum<[string, ...string[]]>>
          ) => void
        }
      ></ZfsSet>
    );
  } else if (
    schema instanceof z.ZodMap &&
    schema._def.keyType instanceof z.ZodEnum
  ) {
    return (
      <ZfsMap
        schema={schema}
        value={value}
        onChangeRequest={
          onChangeRequest as (
            v: z.ZodSet<z.ZodEnum<[string, ...string[]]>>
          ) => void
        }
      ></ZfsMap>
    );
  } else if (schema instanceof z.ZodLiteral) {
    return <div> {value} </div>;
  }

  return <div>Unknown type for schema type: {schema._def.typeName}.</div>;
};
