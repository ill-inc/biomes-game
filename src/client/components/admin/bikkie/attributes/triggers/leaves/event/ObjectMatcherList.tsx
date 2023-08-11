import { Predicate } from "@/client/components/admin/bikkie/attributes/triggers/leaves/event/Predicate";
import { getKindForSchema } from "@/client/components/admin/zod_form_synthesis/ZfsUnion";
import shapeDefs from "@/shared/asset_defs/gen/shapes.json";
import { BikkieIds } from "@/shared/bikkie/ids";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import { isBooleanTypeSchema } from "@/shared/firehose/events";
import type { CameraMode } from "@/shared/game/types";
import { zCameraMode } from "@/shared/game/types";
import {
  defaultBiscuitSchemaPath,
  isBagAsStringSchema,
  isBiomesIdSchema,
  isBlueprintIdSchema,
  isCameraIdSymbol,
  isEntityIdSchema,
  isItemIdSchema,
  isItemSchema,
  isMinigameIdSchema,
  isNpcTypeIdSchema,
  isQuestGiverSchema,
  isSeedIdSchema,
  isShapeTypeSchema,
} from "@/shared/game/zod_symbols";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { Matcher, ObjectMatcher } from "@/shared/triggers/matcher_schema";
import { ok } from "assert";
import { compact, isEqual } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import type {
  AnyZodObject,
  ZodDiscriminatedUnionOption,
  ZodTypeAny,
} from "zod";
import { ZodArray, ZodDiscriminatedUnion, ZodNumber, ZodObject } from "zod";

export interface FieldMatcher {
  field: string;
  kind:
    | "anyItemWith"
    | "anyItemEqual"
    | "questGiver"
    | "entityIdValue"
    | "enum"
    | "boolValue"
    | "numberRange"
    | "minigame"
    | "distinctArrayMatches";

  enumValues?: string[];
  arrayElementSchema?: AnyZodObject;
  biscuitSchemaPath?: SchemaPath;
  defaultPredicate: Matcher;
  prettyName?: string;
}

export const ObjectMatcherList: React.FunctionComponent<{
  schema: AnyZodObject;
  matcher: ObjectMatcher;
  onChange: (val: ObjectMatcher) => unknown;
  ignoreFields?: string[];
}> = ({ schema, matcher, onChange, ignoreFields }) => {
  if (schema instanceof ZodDiscriminatedUnion<any, any[]>) {
    return (
      <DiscriminatedUnionMatcherList
        schema={schema}
        matcher={matcher}
        onChange={onChange}
        ignoreFields={ignoreFields}
      />
    );
  } else {
    return (
      <NonUnionObjectMatcherList
        schema={schema}
        matcher={matcher}
        onChange={onChange}
        ignoreFields={ignoreFields}
      />
    );
  }
};

const DiscriminatedUnionMatcherList: React.FunctionComponent<{
  schema: ZodDiscriminatedUnion<"kind", ZodDiscriminatedUnionOption<"kind">[]>;
  matcher: ObjectMatcher;
  onChange: (val: ObjectMatcher) => unknown;
  ignoreFields?: string[];
}> = ({ schema, matcher, onChange, ignoreFields }) => {
  const optionSchema = useMemo(() => {
    if (!matcher.restrictToUnionValue) {
      return undefined;
    }
    const theOption = schema.options.find(
      (e) => getKindForSchema(e) === matcher.restrictToUnionValue
    );
    return theOption;
  }, [matcher.restrictToUnionValue]);

  return (
    <>
      <label>Kind</label>
      <select
        value={matcher.restrictToUnionValue}
        onChange={(e) => {
          onChange({
            kind: "object",
            restrictToUnionValue: e.target.value,
            fields: [],
          });
        }}
      >
        {schema.options.map((e) => (
          <option key={getKindForSchema(e)} value={getKindForSchema(e)}>
            {getKindForSchema(e)}
          </option>
        ))}
      </select>

      {optionSchema !== undefined && (
        <ObjectMatcherList
          ignoreFields={ignoreFields}
          schema={optionSchema}
          matcher={matcher}
          onChange={onChange}
        />
      )}
    </>
  );
};

function extractFieldsFromSubschema(
  field: string,
  subschema: ZodTypeAny
): Array<FieldMatcher> {
  const fields: Array<FieldMatcher> = [];
  if (
    isItemIdSchema(subschema) ||
    isItemSchema(subschema) ||
    isBagAsStringSchema(subschema)
  ) {
    let biscuitSchemaPath: SchemaPath =
      defaultBiscuitSchemaPath(subschema) ?? "/items";

    if (isBlueprintIdSchema(subschema)) {
      biscuitSchemaPath = "/items/blueprints";
    } else if (isSeedIdSchema(subschema)) {
      biscuitSchemaPath = "/items/seed";
    } else if (isNpcTypeIdSchema(subschema)) {
      biscuitSchemaPath = "/npcs/types";
    }

    fields.push({
      field,
      kind: "anyItemEqual",
      defaultPredicate: {
        kind: "anyItemEqual",
        bikkieId: BikkieIds.grass,
      },
      biscuitSchemaPath,
      prettyName:
        isItemSchema(subschema) || isItemIdSchema(subschema)
          ? `${field} is`
          : `${field} hasItem`,
    });
    fields.push({
      field,
      kind: "anyItemWith",
      defaultPredicate: {
        kind: "anyItemWith",
        attributeId: attribs.isBlock.id,
      },
      biscuitSchemaPath,
      prettyName:
        isItemSchema(subschema) || isItemIdSchema(subschema)
          ? `${field} satisfies`
          : `${field} hasItemWith`,
    });
  }

  if (isEntityIdSchema(subschema)) {
    if (isQuestGiverSchema(subschema)) {
      fields.push({
        field,
        kind: "questGiver",
        defaultPredicate: {
          kind: "value",
          value: INVALID_BIOMES_ID,
        },

        prettyName: field,
      });
    } else {
      fields.push({
        field,
        kind: "entityIdValue",
        defaultPredicate: {
          kind: "value",
          value: INVALID_BIOMES_ID,
        },

        prettyName: field,
      });
    }
  }

  if (isShapeTypeSchema(subschema)) {
    fields.push({
      field,
      kind: "enum",
      defaultPredicate: {
        kind: "value",
        value: "peg",
      },
      enumValues: Object.keys(shapeDefs),
      prettyName: field,
    });
  }

  if (isCameraIdSymbol(subschema)) {
    fields.push({
      field,
      kind: "enum",
      defaultPredicate: {
        kind: "value",
        value: "normal" satisfies CameraMode,
      },
      enumValues: Object.keys(zCameraMode.Values),
      prettyName: field,
    });
  }

  if (isBooleanTypeSchema(subschema)) {
    fields.push({
      field,
      kind: "boolValue",
      defaultPredicate: {
        kind: "value",
        value: true,
      },
      prettyName: field,
    });
  }
  if (isMinigameIdSchema(subschema)) {
    fields.push({
      field,
      kind: "minigame",
      defaultPredicate: {
        kind: "value",
        value: INVALID_BIOMES_ID,
      },
      prettyName: field,
    });
  }

  if (
    subschema instanceof ZodArray<any> &&
    (subschema.element instanceof ZodObject ||
      subschema.element instanceof ZodDiscriminatedUnion)
  ) {
    fields.push({
      field,
      kind: "distinctArrayMatches",
      arrayElementSchema: subschema.element as AnyZodObject,
      defaultPredicate: {
        kind: "distinctArrayMatches",
        fields: [],
      },
    });
  }

  if (!isBiomesIdSchema(subschema) && subschema instanceof ZodNumber) {
    fields.push({
      field,
      kind: "numberRange",
      defaultPredicate: {
        kind: "numberRange",
      },
      prettyName: `${field} between`,
    });
  }
  return fields;
}

const NonUnionObjectMatcherList: React.FunctionComponent<{
  schema: AnyZodObject;
  matcher: ObjectMatcher;
  onChange: (val: ObjectMatcher) => unknown;
  ignoreFields?: string[];
}> = ({ schema, matcher, onChange, ignoreFields }) => {
  const [field, setField] = useState<FieldMatcher | undefined>(undefined);

  const fields = useMemo(() => {
    const fields: Array<FieldMatcher> = [];
    for (const [field, subschema] of Object.entries(schema.shape)) {
      if (ignoreFields && ignoreFields.includes(field)) {
        continue;
      }

      fields.push(
        ...extractFieldsFromSubschema(field, subschema as ZodTypeAny)
      );
    }
    return fields;
  }, [schema]);
  useEffect(() => {
    if (!fields.find((e) => isEqual(e, field))) {
      setField(fields[0]);
    }
  }, [schema, fields]);

  if (fields.length === 0) {
    return <></>;
  }

  return (
    <ul>
      <label>Predicates</label>
      {matcher.fields.map(([field, predicate], i) => {
        const fieldMatcher = fields.find(
          (e) => e.field === field && e.defaultPredicate.kind == predicate.kind
        );
        ok(fieldMatcher);
        return (
          <Predicate
            key={i}
            schema={schema}
            field={field}
            predicate={predicate}
            fieldMatcher={fieldMatcher}
            onChange={(val) => {
              onChange({
                ...matcher,
                fields: compact([
                  ...matcher.fields.slice(0, i),
                  val,
                  ...matcher.fields.slice(i + 1),
                ]),
              });
            }}
          />
        );
      })}
      {field && (
        <li>
          <select
            value={fields.findIndex((e) => isEqual(e, field))}
            onChange={(e) => {
              setField(fields[parseInt(e.target.value)]);
            }}
          >
            {fields.map((e, i) => (
              <option key={`${e.field}${e.kind}`} value={i}>
                {e.prettyName ? e.prettyName : `${e.field} ${e.kind}`}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              onChange({
                ...matcher,
                fields: [
                  ...matcher.fields,
                  [field.field, field.defaultPredicate],
                ],
              });
            }}
          >
            Add
          </button>
        </li>
      )}
    </ul>
  );
};

export default ObjectMatcherList;
