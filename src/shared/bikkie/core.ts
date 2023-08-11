import type {
  AnyBakedBikkieAttributes,
  BikkieAttribute,
} from "@/shared/bikkie/attributes";
import type { BiomesId } from "@/shared/ids";
import { ok } from "assert";
import { mapValues, uniq } from "lodash";
import type { z } from "zod";

export interface AbstractBiscuit {
  readonly "": unique symbol;
  readonly id: BiomesId;
}

const PROHIBITED_SCHEMA_NAMES = [
  "attributes",
  "subschemas",
  "schemaWalker",
  "schema",
  "name",
  "is",
];

// Represents a type assertion in Bikkie-space.
export interface BikkieSchema<
  TAttributes extends AnyBakedBikkieAttributes,
  TAttributeSelection extends (keyof TAttributes)[],
  TSubSchemas extends Record<string, AnyBikkieSchema>
> {
  readonly attributes: TAttributeSelection;
  readonly recommendedAttributes: (keyof TAttributes)[];
  readonly subschemas: TSubSchemas;
}

export type AnyBikkieSchema = BikkieSchema<any, any, any>;

export type RawSchema<
  TAttributes extends AnyBakedBikkieAttributes,
  TAttributeSelection extends (keyof TAttributes)[],
  TSubSchemas extends Record<string, RawSchema<TAttributes, any, any>>
> = {
  readonly attributes?: TAttributeSelection;
  readonly recommendedAttributes?: (keyof TAttributes)[];
  readonly subschemas?: TSubSchemas;
};

export type Concat<T1 extends unknown[], T2 extends unknown[]> = [...T1, ...T2];

export type ExpandRawSchema<T, TWith> = T extends RawSchema<
  infer TAttributes,
  infer TAttributeSelection,
  infer TSubSchemas
>
  ? TWith extends (keyof TAttributes)[]
    ? BikkieSchema<
        TAttributes,
        [...TAttributeSelection, ...TWith],
        {
          [K in keyof TSubSchemas]: ExpandRawSchema<
            TSubSchemas[K],
            [...TAttributeSelection, ...TWith]
          >;
        }
      >
    : never
  : never;

export type SchemaForRaw<T> = T extends RawSchema<
  infer TAttributes,
  infer TAttributeSelection,
  infer TSubSchemas
>
  ? BikkieSchema<
      TAttributes,
      TAttributeSelection,
      {
        [K in keyof TSubSchemas]: ExpandRawSchema<
          TSubSchemas[K],
          TAttributeSelection
        >;
      }
    >
  : never;

export function conformsWith<TSchema extends AnyBikkieSchema>(
  schema: TSchema | undefined,
  value?: AbstractBiscuit
): value is BiscuitFromAttributeSelection<
  AttributesOf<TSchema>,
  TSchema["attributes"]
> {
  if (!schema) {
    return true;
  }
  if (!value) {
    return false;
  }
  for (const name of schema.attributes) {
    if (!(name in value)) {
      return false;
    }
  }
  return true;
}

function visitAll(
  root: AnyBikkieSchema,
  callback: (path: string, schema: AnyBikkieSchema) => void,
  path = "/"
) {
  callback(path, root);
  for (const name in root.subschemas) {
    visitAll(root.subschemas[name], callback, `${path}/${name}`);
  }
}

export type SchemaWalker<
  TAttributes extends AnyBakedBikkieAttributes,
  TSchema extends BikkieSchema<TAttributes, any, any>
> = {
  [K in keyof TSchema["subschemas"]]: SchemaWalker<
    TAttributes,
    TSchema["subschemas"][K]
  >;
} & {
  schema: TSchema;
  attributes: TSchema["attributes"];
  check: (
    val?: AbstractBiscuit
  ) => val is BiscuitFromAttributeSelection<TAttributes, TSchema["attributes"]>;
};

export class SchemaWalkerHandler<T extends AnyBikkieSchema> {
  constructor(private readonly schema: T) {}

  protected create<TSubSchema extends AnyBikkieSchema>(target: TSubSchema) {
    return new SchemaWalkerHandler(target);
  }

  check = (value?: AbstractBiscuit) => conformsWith(this.schema, value);

  has(target: any, name: string): boolean {
    return (
      name in target ||
      name === "check" ||
      name === "schema" ||
      name in this.schema.subschemas
    );
  }

  get(target: any, name: string): any {
    if (name === "check") {
      return this.check;
    } else if (name === "schema") {
      return this.schema;
    }
    const existing = target[name];
    if (existing !== undefined) {
      return existing;
    }
    const subschema = this.schema.subschemas[name as keyof T["subschemas"]];
    ok(subschema, `Unknown subschema: ${name}`);
    return new Proxy(subschema, this.create(subschema));
  }
}

export type SchemaOrWalker = AnyBikkieSchema | { schema: AnyBikkieSchema };

export function normalizeToSchema(
  bikkie: AnyBikkie,
  schema: AnySchemaPath | SchemaOrWalker
) {
  if (typeof schema === "string") {
    return bikkie.getSchema(schema);
  }
  return "schema" in schema ? schema.schema : schema;
}

function mergeAttributeLists<TAttributes extends AnyBakedBikkieAttributes>(
  a?: (keyof TAttributes)[],
  b?: (keyof TAttributes)[]
) {
  return uniq([...(a ?? []), ...(b ?? [])]);
}

function prepareRawSchema<
  TAttributes extends AnyBakedBikkieAttributes,
  TAttributeSelection extends (keyof TAttributes)[],
  TRawSchema extends RawSchema<TAttributes, TAttributeSelection, any>
>(
  rawSchema: TRawSchema,
  withAttributes?: (keyof TAttributes)[],
  withRecommendedAttributes?: (keyof TAttributes)[]
): SchemaForRaw<TRawSchema> {
  const attributes = mergeAttributeLists(rawSchema.attributes, withAttributes);
  const recommendedAttributes = mergeAttributeLists(
    rawSchema.recommendedAttributes,
    withRecommendedAttributes
  );
  return {
    attributes,
    recommendedAttributes,
    subschemas: mapValues(rawSchema.subschemas ?? {}, (subschema, key) => {
      ok(
        !PROHIBITED_SCHEMA_NAMES.includes(key),
        `You cannot have a child schema named '${key}'.`
      );
      return prepareRawSchema(subschema, attributes, recommendedAttributes);
    }),
  } as any;
}

export type AnySchemaPath = `/${string}`;

export type ExpandSchemaPaths<T, Prefix extends string> = T extends {
  subschemas: infer S;
}
  ? {
      [K in keyof S]: K extends string
        ? `${Prefix}/${K}` | ExpandSchemaPaths<S[K], `${Prefix}/${K}`>
        : never;
    }[keyof S]
  : never;

export type SchemaPaths<T> =
  | "/"
  | {
      [K in keyof T]: K extends string
        ? `/${K}` | ExpandSchemaPaths<T[K], `/${K}`>
        : never;
    }[keyof T];

export type SelectSubSchema<T, Path extends string> = T extends {
  subschemas: infer S;
}
  ? Path extends `${infer Name}/${infer Rest}`
    ? Name extends keyof S
      ? SelectSubSchema<S[Name], Rest>
      : never
    : Path extends keyof S
    ? S[Path]
    : never
  : never;

export type SelectSchema<T, Path extends string> = Path extends "/"
  ? undefined
  : Path extends `/${infer Name}/${infer Rest}`
  ? Name extends keyof T
    ? SelectSubSchema<T[Name], Rest>
    : never
  : Path extends `/${infer Name}`
  ? Name extends keyof T
    ? T[Name]
    : never
  : never;

export type SchemasForRaw<
  TAttributes extends AnyBakedBikkieAttributes,
  T extends Record<string, RawSchema<TAttributes, (keyof TAttributes)[], any>>
> = {
  [K in keyof T]: SchemaForRaw<T[K]>;
};

// The overall complete schema of all items in Bikkie.
export class Bikkie<
  TAttributes extends AnyBakedBikkieAttributes,
  TRawSchemas extends Record<string, RawSchema<any, any[], any>>
> {
  private readonly schemas: SchemasForRaw<TAttributes, TRawSchemas>;
  private readonly schemasByPath = new Map<string, AnyBikkieSchema>();

  constructor(rawSchemas: TRawSchemas) {
    this.schemas = mapValues(rawSchemas, (s) => {
      type Schema = typeof s;
      return prepareRawSchema<TAttributes, any, Schema["subschemas"]>(s);
    }) as any;
    this.schemasByPath = new Map();
    for (const name in this.schemas) {
      visitAll(
        this.schemas[name],
        (path, schema) => this.schemasByPath.set(path, schema),
        `/${name}`
      );
    }
  }

  allSchemas(): [SchemaPaths<TRawSchemas>, AnyBikkieSchema][] {
    return Array.from(this.schemasByPath) as any;
  }

  getSchema<T extends SchemaPaths<TRawSchemas>>(
    path: T
  ): SelectSchema<SchemasForRaw<TAttributes, TRawSchemas>, T>;
  getSchema(path: string | undefined): AnyBikkieSchema | undefined;
  getSchema<T extends SchemaPaths<TRawSchemas>>(
    path: T | string | undefined
  ):
    | SelectSchema<SchemasForRaw<TAttributes, TRawSchemas>, T>
    | AnyBikkieSchema
    | undefined {
    if (!path || path === "/") {
      return;
    }
    const schema = this.schemasByPath.get(path);
    ok(schema, `Unknown schema: ${path}`);
    return schema;
  }

  getPathForSchema(schema?: AnyBikkieSchema): SchemaPaths<TRawSchemas> {
    if (!schema) {
      return "/";
    }
    for (const [path, s] of this.schemasByPath) {
      if (s === schema) {
        return path as any;
      }
    }
    throw new Error("Schema not found");
  }

  get schema(): {
    [K in keyof TRawSchemas]: SchemaWalker<
      TAttributes,
      SchemaForRaw<TRawSchemas[K]>
    >;
  } {
    return new Proxy(this, {
      get: function (target, name) {
        const schema = target.schemas[name as keyof TRawSchemas];
        ok(schema, `Unknown schema: ${String(name)}`);
        return new Proxy(schema, new SchemaWalkerHandler(schema));
      },
    }) as any;
  }
}

export type SchemaPathsOf<T> =
  | "/"
  | (T extends Bikkie<any, infer TRawSchemas>
      ? SchemaPaths<TRawSchemas>
      : never);

export type AnyBikkie = Bikkie<AnyBakedBikkieAttributes, any>;

export type AttributesOf<T> = T extends Bikkie<infer TAttributes, any>
  ? TAttributes
  : T extends BikkieSchema<infer TAttributes, any, any>
  ? TAttributes
  : T extends RawSchema<infer TAttributes, any, any>
  ? TAttributes
  : never;

export type BiscuitFromAttributeSelection<
  TAttributes,
  TSelection extends (keyof TAttributes)[] = []
> = {
  readonly [K in Exclude<keyof TAttributes, "all" | "byId" | "byName">]:
    | (K extends TSelection[number] ? never : undefined)
    | (TAttributes[K] extends BikkieAttribute<any, any, infer TAttributeType>
        ? z.infer<TAttributeType>
        : never);
} & AbstractBiscuit;

export type BiscuitOf<T> = T extends Bikkie<infer TAttributes, any>
  ? BiscuitFromAttributeSelection<TAttributes>
  : T extends BikkieSchema<infer TAttributes, infer TAttributeSelection, any>
  ? BiscuitFromAttributeSelection<TAttributes, TAttributeSelection>
  : T extends RawSchema<infer TAttributes, infer TAttributeSelection, any>
  ? BiscuitFromAttributeSelection<TAttributes, TAttributeSelection>
  : AbstractBiscuit;

export type SelectFallbackAttributes<TAttributes> = {
  readonly [K in Exclude<
    keyof TAttributes,
    "all" | "byId" | "byName"
  >]: TAttributes[K] extends {
    fallbackValue: infer TFallback extends (...args: any[]) => any;
  }
    ? ReturnType<TFallback>
    : TAttributes[K] extends BikkieAttribute<any, any, infer TAttributeType>
    ? z.infer<TAttributeType> | undefined
    : never;
};

export type FallbackBiscuitOf<T> = T extends Bikkie<infer TAttributes, any>
  ? SelectFallbackAttributes<TAttributes>
  : {};
