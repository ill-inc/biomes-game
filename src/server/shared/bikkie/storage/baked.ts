import type { BakedBiscuitTray } from "@/server/shared/bikkie/registry";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID, zBiomesId } from "@/shared/ids";
import { compactMap } from "@/shared/util/collections";
import { ok } from "assert";
import { memoize } from "lodash";
import type { ZodType } from "zod";
import { z } from "zod";

export function emptyBakedTray(): BakedBiscuitTray {
  return {
    id: INVALID_BIOMES_ID,
    contents: new Map(),
    hashes: new Map(),
  };
}

// Normally Biscuit attributes are used by-name for ease of use. However this is
// problematic when storing them as it can create a dependency on attribute names.
// So instead we have a 'stored biscuit' which uses the attribute-IDs for fields
// which are considered stable over time.
export type StoredBiscuit = {
  id: BiomesId;
  name?: string;
} & Record<number, unknown>;

export const zStoredBiscuit = z.lazy(
  memoize(
    () =>
      z.object({
        id: zBiomesId,
        name: z.string().optional(),
        ...(Object.fromEntries(
          compactMap(attribs.all, (attrib) =>
            "type" in attrib ? [attrib.id, attrib.type().optional()] : undefined
          )
        ) as Record<string | number, ZodType<unknown>>),
      }) as unknown as ZodType<StoredBiscuit>
  )
);

export function toStoredBiscuit(biscuit: Biscuit): StoredBiscuit {
  const out: StoredBiscuit = { id: biscuit.id, name: biscuit.name };
  for (const attrib of attribs.all) {
    const key = attrib.name as keyof Biscuit;
    if ("id" in attrib && biscuit[key] !== undefined) {
      out[attrib.id] = biscuit[key];
    }
  }
  return out;
}

export function fromStoredBiscuit(stored: StoredBiscuit): Biscuit {
  const out: any = { id: stored.id, name: stored.name };
  for (const attrib of attribs.all) {
    if ("id" in attrib && stored[attrib.id] !== undefined) {
      out[attrib.name] = stored[attrib.id];
    }
  }
  return out as Biscuit;
}

export const zStoredBakedTray = z.object({
  id: zBiomesId,
  biscuits: z.tuple([zStoredBiscuit, z.string()]).array().optional(),
});

export type StoredBakedTray = z.infer<typeof zStoredBakedTray>;

export function toStoredBakedTray(tray: BakedBiscuitTray): StoredBakedTray {
  const biscuits: [StoredBiscuit, string][] = [];
  for (const [id, biscuit] of tray.contents) {
    const hash = tray.hashes.get(id);
    ok(hash !== undefined);
    biscuits.push([toStoredBiscuit(biscuit), hash]);
  }
  return { id: tray.id, biscuits };
}

export function fromStoredBakedTray(tray: StoredBakedTray): BakedBiscuitTray {
  const contents = new Map<BiomesId, Biscuit>();
  const hashes = new Map<BiomesId, string>();
  if (tray.biscuits) {
    for (const [biscuit, hash] of tray.biscuits) {
      contents.set(biscuit.id, fromStoredBiscuit(biscuit));
      hashes.set(biscuit.id, hash);
    }
  }
  return {
    id: tray.id,
    contents,
    hashes,
  };
}

// We do two level encoding to save on decode cost.
export const zStoredBakedBiscuit = z.tuple([
  zBiomesId,
  z.string(),
  z.instanceof(Uint8Array), // Encoded zStoredBiscuit.
]);
