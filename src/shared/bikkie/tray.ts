import type { AnyBakedBikkieAttributes } from "@/shared/bikkie/attributes";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID, zBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { removeNilishInPlace } from "@/shared/util/object";
import { assertNever } from "@/shared/util/type_helpers";
import type { CustomSerializedType } from "@/shared/zrpc/custom_types";
import { makeAsyncZodType } from "@/shared/zrpc/custom_types";
import { zrpcSerialize } from "@/shared/zrpc/serde";
import { ok } from "assert";
import { assign, entries, memoize } from "lodash";
import md5 from "md5";
import type { ZodType } from "zod";
import { z } from "zod";

export class ConstantAssignment<T> {
  readonly kind = "constant";
  constructor(public readonly value: T) {}
}

export type Unassignment = {
  readonly kind: "unassign";
};

export type InheritedAssignment = {
  readonly kind: "inherit";
  readonly from: BiomesId;
  readonly value: Exclude<BiscuitAttributeAssignment, InheritedAssignment>;
};

export type InferenceAssignment = {
  readonly kind: "infer";
  readonly rule: string;
};

// An assignment of an attribute to a biscuit; in particular has multiple
// variants for horizontal references, inheritance, as well as unassignment.
export type BiscuitAttributeAssignment =
  | ConstantAssignment<any>
  | InheritedAssignment
  | InferenceAssignment
  | Unassignment
  | null;

// Complete definition of a Biscuit.
export type BiscuitDefinition = {
  readonly id: BiomesId;
  extendedFrom?: BiomesId;
  attributes: Record<number, BiscuitAttributeAssignment>;
};

export function emptyBiscuitDefinition(id: BiomesId) {
  return { id, attributes: {} };
}

export const zBiscuitAttributeAssignment = z.lazy(
  memoize(() =>
    z.discriminatedUnion("kind", [
      zParentTrayAssignment,
      zConstantAssignment,
      zReferenceAssignment,
      zUnassignment,
      zInferenceAssignment,
    ])
  )
) as ZodType<BiscuitAttributeAssignment>;

export const zPreparedBiscuitAttributeAssignment = z.lazy(
  memoize(() => z.discriminatedUnion("kind", [zConstantAssignment]))
) as ZodType<PreparedBiscuitAttributeAssignment>;

export const zParentTrayAssignment = z.object({
  kind: z.literal("parentTray"),
  to: zBiscuitAttributeAssignment,
});

export const zConstantAssignment = z.object({
  kind: z.literal("constant"),
  value: z.any(),
});

export const zReferenceAssignment = z.object({
  kind: z.literal("reference"),
  to: z.number(), // Attribute ID.
});

export const zUnassignment = z.object({
  kind: z.literal("unassign"),
});

export const zInferenceAssignment = z.object({
  kind: z.literal("infer"),
  rule: z.string(),
});

export const zBiscuitDefinition = z.object({
  id: zBiomesId,
  extendedFrom: zBiomesId.optional(),
  attributes: z.record(zBiscuitAttributeAssignment),
}) as ZodType<BiscuitDefinition>;

export type PreparedBiscuitAttributeAssignment =
  | ConstantAssignment<any>
  | InferenceAssignment;

// Resolve assignments of attributes, potentially only of given kinds.
export function resolveAssignment(
  within: Record<number, BiscuitAttributeAssignment>,
  assignment?: BiscuitAttributeAssignment
): PreparedBiscuitAttributeAssignment | undefined {
  switch (assignment?.kind) {
    case "infer":
      return assignment;
    case "inherit":
      return resolveAssignment(within, assignment.value);
    case "constant":
      return assignment;
  }
}

export type PreparedBiscuitDefinition = {
  readonly id: BiomesId;
  readonly extendedFrom?: BiomesId;
  readonly attributes: Record<number, PreparedBiscuitAttributeAssignment>;
};

export const zPreparedBiscuitDefinition = z.object({
  id: zBiomesId,
  extendedFrom: zBiomesId.optional(),
  attributes: z.record(zPreparedBiscuitAttributeAssignment),
}) as ZodType<PreparedBiscuitDefinition>;

export function definitionHash(def?: PreparedBiscuitDefinition) {
  return def ? `${CONFIG.bikkieInferenceEpoch}-${md5(zrpcSerialize(def))}` : "";
}

export type TrayProvider = (parent: BiomesId) => Promise<BiscuitTray>;

export const zEncodedBiscuitTray = z.object({
  id: zBiomesId,
  createdAt: z.number(),
  name: z.string(),
  createdBy: zBiomesId.optional(),
  parent: zBiomesId.optional(),
  definitions: z.array(zBiscuitDefinition),
});

// Construct a zod type suitable for parsing an encoded biscuit tray.
export function zodBiscuitTray(
  attributes: AnyBakedBikkieAttributes,
  trayProvider: TrayProvider,
  attributeMapper?: (id: number) => number
) {
  return makeAsyncZodType((val: any) =>
    BiscuitTray.deserialize(
      attributes,
      trayProvider,
      zEncodedBiscuitTray.parse(val),
      attributeMapper
    )
  );
}

function validateDefinitionAttributeAssignments<
  T extends PreparedBiscuitDefinition | BiscuitDefinition
>(
  attributes: AnyBakedBikkieAttributes,
  def: T,
  attributeMapper?: (id: number) => number
): T {
  const parseAttributeId = attributeMapper
    ? (id: any) => attributeMapper(parseInt(id))
    : (id: any) => parseInt(id);
  return {
    ...def,
    attributes: Object.fromEntries(
      entries(def.attributes).map(([rawId, assignment]) => {
        const attributeId = parseAttributeId(rawId);
        if (assignment?.kind !== "constant") {
          return [attributeId, assignment];
        }
        const attribute = attributes.byId.get(attributeId);
        if (!attribute) {
          // Unknown attribute, do nothing.
          return [attributeId, assignment];
        }
        // Parse the value, this forces data migrations.
        return [
          attributeId,
          {
            kind: "constant",
            value: attribute.type().parse(assignment.value),
          },
        ];
      })
    ),
  };
}

export interface TrayMetadata {
  readonly createdAt: number;
  readonly name: string;
  readonly createdBy: BiomesId | undefined;
  readonly compactedFrom?: BiomesId;
}

export function createTrayMetadata(
  name: string,
  createdBy: BiomesId,
  compactedFrom?: BiomesId
): TrayMetadata {
  return {
    createdAt: Date.now(),
    name,
    createdBy,
    compactedFrom,
  };
}

// Represents an immutable of Biscuit definitions against a given schema, with
// potentially parent trays the tray is defined in terms of. This permits copy
// on write semantics, experimentation, etc.
export class BiscuitTray implements CustomSerializedType<BiscuitTray> {
  private prepared?: Map<BiomesId, PreparedBiscuitDefinition>;

  private constructor(
    public readonly attributes: AnyBakedBikkieAttributes,
    public readonly id: BiomesId,
    public readonly meta: TrayMetadata,
    public readonly parent?: BiscuitTray,
    private readonly definitions = new Map<BiomesId, BiscuitDefinition>()
  ) {
    ok(
      parent === undefined || parent.attributes === this.attributes,
      "Parent tray must have the same attributes"
    );
  }

  get depth(): number {
    return (this.parent?.depth ?? 0) + 1;
  }

  private static checkedCreate(
    attributes: AnyBakedBikkieAttributes,
    id: BiomesId,
    meta: TrayMetadata,
    parent?: BiscuitTray,
    definitions = new Map<BiomesId, BiscuitDefinition>()
  ) {
    ok(id, `Invalid tray id: ${id}`);
    return new BiscuitTray(attributes, id, meta, parent, definitions);
  }

  static empty(attributes: AnyBakedBikkieAttributes) {
    return new BiscuitTray(
      attributes,
      INVALID_BIOMES_ID,
      createTrayMetadata("", INVALID_BIOMES_ID)
    );
  }

  // Set a given definition, only intended to be used in construction.
  private set(...definitions: BiscuitDefinition[]) {
    definitions = definitions.map((d) => this.validateDefinition(d));
    // Topologically sort the definitions for addition to ensure any parent
    // dependencies are added before their children.
    while (definitions.length > 0) {
      const startLength = definitions.length;
      for (let i = 0; i < definitions.length; ) {
        const candidate = definitions[i];
        if (!candidate.extendedFrom || this.has(candidate.extendedFrom)) {
          // Can be included in the graph.
          this.definitionExtendedFromOk(candidate);
          definitions.splice(i, 1);
          this.definitions.set(candidate.id, candidate);
        } else {
          i++;
        }
      }
      // There must always be progress, otherwise we have a cycle.
      ok(
        definitions.length < startLength,
        "Definitions do not form a DAG, or are incomplete with respect to the new base."
      );
    }
    this.prepared = undefined;
  }

  static of(
    attributes: AnyBakedBikkieAttributes,
    id: BiomesId,
    meta: TrayMetadata,
    ...definitions: BiscuitDefinition[]
  ) {
    const tray = this.checkedCreate(attributes, id, meta);
    tray.set(...definitions);
    return tray;
  }

  ancestorTrays(): BiscuitTray[] {
    const ancestors: BiscuitTray[] = [this];
    for (
      let ancestor = this.parent;
      ancestor !== undefined;
      ancestor = ancestor.parent
    ) {
      ancestors.push(ancestor);
    }
    ancestors.reverse();
    return ancestors;
  }

  compactAs(
    id: BiomesId,
    meta: TrayMetadata,
    ...without: BiomesId[]
  ): BiscuitTray {
    const toRemove = new Set(without);
    const definitions = new Map<BiomesId, BiscuitDefinition>();
    for (const ancestor of this.ancestorTrays()) {
      for (const ancestorDefinition of ancestor.definitions.values()) {
        if (toRemove.has(ancestorDefinition.id)) {
          continue;
        }
        const existing = definitions.get(ancestorDefinition.id);

        const attributes: BiscuitDefinition["attributes"] = {
          ...existing?.attributes,
          ...ancestorDefinition.attributes,
        };
        for (const [key, value] of Object.entries(attributes)) {
          const attributeId = parseInt(key);
          // Compaction deletes unknown attributes, and undefined values.
          if (!value || !this.attributes.byId.get(attributeId)) {
            delete attributes[attributeId];
          }
        }
        const definition = <BiscuitDefinition>{
          ...existing,
          ...ancestorDefinition,
          attributes,
        };
        ok(
          !definition.extendedFrom || !toRemove.has(definition.extendedFrom),
          "Cannot remove ancestor definition"
        );
        definitions.set(definition.id, definition);
      }
    }
    return BiscuitTray.checkedCreate(
      this.attributes,
      id,
      meta,
      undefined,
      definitions
    );
  }

  extendAs(
    id: BiomesId,
    meta: TrayMetadata,
    ...definitions: BiscuitDefinition[]
  ): BiscuitTray {
    const child = BiscuitTray.checkedCreate(this.attributes, id, meta, this);
    child.set(...definitions);
    return child;
  }

  rebaseAs(onto: BiscuitTray, id: BiomesId, meta: TrayMetadata): BiscuitTray {
    const rebased = onto.extendAs(id, meta);
    rebased.set(...this.definitions.values());
    return rebased;
  }

  static async deserialize(
    attributes: AnyBakedBikkieAttributes,
    provider: TrayProvider,
    data: unknown,
    attributeMapper?: (id: number) => number
  ): Promise<BiscuitTray> {
    const {
      id,
      name,
      createdAt,
      createdBy,
      parent: parentId,
      definitions,
    } = zEncodedBiscuitTray.parse(data);
    const parent = parentId ? await provider(parentId) : undefined;

    const prepareDefinitions = <
      T extends BiscuitDefinition | PreparedBiscuitDefinition
    >(
      definitions: T[]
    ) =>
      new Map(
        definitions.map(
          (d) =>
            [
              d.id,
              validateDefinitionAttributeAssignments(
                attributes,
                d,
                attributeMapper
              ),
            ] as [BiomesId, T]
        )
      );

    return this.checkedCreate(
      attributes,
      id,
      { name, createdAt, createdBy },
      parent,
      prepareDefinitions(definitions)
    );
  }

  prepareForZrpc(): z.infer<typeof zEncodedBiscuitTray> {
    // Force preparation.
    this.prepare();
    return {
      id: this.id,
      createdAt: this.meta.createdAt,
      name: this.meta.name,
      createdBy: this.meta.createdBy,
      parent: this.parent?.id || undefined,
      definitions: Array.from(this.definitions.values()),
    };
  }

  has(id: BiomesId): boolean {
    return this.definitions.has(id) || this.parent?.has(id) || false;
  }

  // Get a definition from the POV of this tray. This includes the ParentTray
  // assignment type to suit tooling.
  // Optionally resolve parent definitions.
  get(id: BiomesId): BiscuitDefinition | undefined {
    const parent = this.parent?.get(id);
    const local = this.definitions.get(id);

    if (!local && !parent) {
      return;
    }
    const output = <BiscuitDefinition>{
      ...parent,
      ...local,
      attributes: {},
    };

    if (output.extendedFrom) {
      const extendedFrom = this.get(output.extendedFrom);
      ok(extendedFrom, "Extended from BiscuitDefinition not found");
      for (const key in extendedFrom.attributes) {
        const parent = extendedFrom.attributes[key];
        if (parent === null) {
          continue;
        }
        if (parent.kind === "inherit") {
          output.attributes[key] = parent;
        } else {
          output.attributes[key] = {
            kind: "inherit",
            from: extendedFrom.id,
            value: parent,
          };
        }
      }
    }

    const directAttributes = {};
    if (parent) {
      assign(directAttributes, parent.attributes);
    }
    if (local) {
      assign(directAttributes, local.attributes);
    }
    removeNilishInPlace(directAttributes);
    assign(output.attributes, directAttributes);
    return output;
  }

  // Check the extendedFrom field doesn't form a chain.
  private definitionExtendedFromOk(definition: BiscuitDefinition): boolean {
    const visited = new Set<BiomesId>();
    while (true) {
      if (visited.has(definition.id)) {
        return false;
      }
      visited.add(definition.id);
      if (definition.extendedFrom) {
        const parent = this.get(definition.extendedFrom);
        if (!parent) {
          return false;
        }
        definition = parent;
        continue;
      }
      return true;
    }
  }

  private validateDefinition(definition: BiscuitDefinition) {
    ok(definition.id, "Biscuit definition must have an ID");
    const out: BiscuitDefinition = {
      ...definition,
      attributes: {},
    };
    if (!out.extendedFrom) {
      // Don't permit ID zero.
      delete out.extendedFrom;
    }
    // Validate all attribute types against the schema.
    for (const id in definition.attributes) {
      const expected = this.attributes.byId.get(parseInt(id));
      ok(expected, `Unknown attribute ${id}`);
      const assignment = definition.attributes[id];
      switch (assignment?.kind) {
        case "constant":
          {
            const zodResult = expected.type().safeParse(assignment.value);
            if (zodResult.success) {
              out.attributes[id] = {
                kind: "constant",
                value: zodResult.data,
              };
            } else {
              log.warn(
                `Type mismatch for ${id}/${expected.name}: ${zodResult.error} - ignoring.`
              );
            }
          }
          break;
        case "inherit":
          // Inherited values will be re-computed, so ignore.
          break;
        case "unassign":
          out.attributes[id] = assignment;
          break;
        case undefined:
          out.attributes[id] = null;
          break;
        case "infer":
          out.attributes[id] = assignment;
          break;
        default:
          assertNever(assignment);
      }
    }
    return out;
  }

  // Reduce all definitions to the final output set to suit compilation, this resolves
  // horizontal references as well as parent inheritance.
  // Note: As the inference rules are yet to be implemented, this in-fact is the final
  // biscuit.
  prepare(): Map<BiomesId, PreparedBiscuitDefinition> {
    if (this.prepared !== undefined) {
      return this.prepared;
    }
    this.prepared = new Map<BiomesId, PreparedBiscuitDefinition>(
      this.parent?.prepare() ?? []
    );
    for (const id of this.definitions.keys()) {
      const definition = this.get(id);
      ok(definition, `Missing definition for ${id}`);
      const prepared: PreparedBiscuitDefinition = {
        ...definition,
        attributes: {},
      };
      for (const attributeId in definition.attributes) {
        const assignment = resolveAssignment(
          definition.attributes,
          definition.attributes[attributeId]
        );
        if (assignment) {
          prepared.attributes[attributeId] = assignment;
        }
      }
      this.prepared.set(id, prepared);
    }
    return this.prepared;
  }
}
