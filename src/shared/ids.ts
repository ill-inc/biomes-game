import { biomesIdSymbol } from "@/shared/game/zod_symbols";
import type { ZodType } from "zod";
import { z, ZodIssueCode } from "zod";

export type BiomesId = number & { readonly "": unique symbol };
export type ReadonlyBiomesId = BiomesId;

export const INVALID_BIOMES_ID = 0 as BiomesId;

export const MAX_ID = (2 ^ 53) - 5;

export const zBiomesId = (z.number() as unknown as ZodType<BiomesId>).annotate(
  biomesIdSymbol,
  true
);

export function safeParseBiomesId(id: unknown): BiomesId | undefined {
  if (typeof id === "number") {
    return id as BiomesId;
  } else if (typeof id === "bigint") {
    return Number(id) as BiomesId;
  } else if (typeof id !== "string") {
    return;
  }
  const match = /^(b:)?([0-9]+)$/.exec(id);
  if (match === null) {
    return;
  }
  return parseInt(match[2], 10) as BiomesId;
}

export function parseBiomesId(id: any): BiomesId {
  const result = safeParseBiomesId(id);
  if (result === undefined) {
    throw new Error(`Invalid BiomesId: ${id} [${typeof id}]`);
  }
  return result;
}

export function isBiomesId(id: any): id is BiomesId {
  return typeof id === "number" && id >= 0;
}

export type StoredEntityId = string & { readonly "": unique symbol };

export const zStoredEntityId = z
  .string()
  .transform<StoredEntityId>((val, ctx) => {
    const match = /^b:([0-9]+)$/.exec(val);
    if (match === null) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: `Not StoredEntityId: ${val}`,
        fatal: true,
      });
      return "" as StoredEntityId;
    }
    return val as StoredEntityId;
  });

export function toStoredEntityId(id: BiomesId): StoredEntityId {
  return `b:${id}` as StoredEntityId;
}

export function fromStoredEntityId(id: StoredEntityId): BiomesId {
  return parseBiomesId(id);
}

declare global {
  // eslint-disable-next-line no-var
  var LEGACY_ID_MAPPING: { [key: string]: BiomesId | undefined } | undefined;
}

export function legacyIdOrBiomesId(
  val: string | BiomesId | undefined
): BiomesId | undefined {
  if (val === undefined) {
    return;
  }
  if (typeof val === "number") {
    return val;
  }
  if (global.LEGACY_ID_MAPPING !== undefined) {
    const mapping = global.LEGACY_ID_MAPPING[val];
    if (mapping !== undefined) {
      return mapping;
    }
  }
  return safeParseBiomesId(val);
}

export const zLegacyIdOrBiomesId = z
  .union([zBiomesId, z.string()])
  .transform<BiomesId>((val, ctx) => {
    const ret = legacyIdOrBiomesId(val);
    if (ret === undefined) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: `Not BiomesId: ${val}`,
        fatal: true,
      });
      return INVALID_BIOMES_ID;
    }
    return ret;
  });

export type LegacyIdOrBiomesId = z.infer<typeof zLegacyIdOrBiomesId>;

export const zUsernameOrAnyId = z.union([zLegacyIdOrBiomesId, z.string()]);
export type UsernameOrAnyId = z.infer<typeof zUsernameOrAnyId>;
