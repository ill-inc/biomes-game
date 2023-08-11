import { ZfsObject } from "@/client/components/admin/zod_form_synthesis/ZfsObject";
import { useCallback } from "react";
import * as z from "zod";

export const ZfsMap = <
  // Only sets of enums are currently supported. To generalize
  // in the future, this implementation can be made into a
  // special case.
  S extends z.ZodMap<z.ZodEnum<[string, ...string[]]>, z.ZodAny>,
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
  const enumSchema = schema._def.keyType;
  const schemaAsObject = useCallback(
    () =>
      z.object(
        Object.fromEntries(
          enumSchema.options.map((x) => [x, schema._def.valueType.optional()])
        )
      ),
    [schema]
  );
  const valueAsObject = useCallback(
    () => Object.fromEntries(value.entries()),
    [value]
  );

  return (
    <ZfsObject
      schema={schemaAsObject()}
      value={valueAsObject()}
      onChangeRequest={(newValue) => {
        onChangeRequest(new Map(Object.entries(newValue)) as V);
      }}
    />
  );
};
