import type { BiscuitState } from "@/client/components/admin/bikkie/unsaved";
import { UnsavedBiscuit } from "@/client/components/admin/bikkie/unsaved";
import {
  zBiscuitAttributeAssignment,
  zBiscuitDefinition,
} from "@/shared/bikkie/tray";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { compactMap } from "@/shared/util/collections";
import { jsonPost, zjsonPost } from "@/shared/util/fetch_helpers";
import { z } from "zod";

export const zGetBiscuitResponse = z
  .object({
    name: z.string(),
    iconUrl: z.string(),
    definition: zBiscuitDefinition,
  })
  .optional()
  .array();

export async function fetchBiscuit(
  ids: BiomesId,
  signal?: AbortSignal
): Promise<UnsavedBiscuit | undefined>;
export async function fetchBiscuit(
  ids: BiomesId[],
  signal?: AbortSignal
): Promise<UnsavedBiscuit[]>;
export async function fetchBiscuit(
  ids: BiomesId | BiomesId[],
  signal?: AbortSignal
): Promise<UnsavedBiscuit[] | UnsavedBiscuit | undefined> {
  let single = false;
  if (!Array.isArray(ids)) {
    single = true;
    ids = [ids];
  }
  const current = compactMap(
    await zjsonPost("/api/admin/bikkie/get", ids, zGetBiscuitResponse, {
      signal,
    }),
    (result, i) => {
      if (!result) {
        return;
      }
      const id = (ids as BiomesId[])[i];
      const { name, iconUrl, definition } = result;
      return new UnsavedBiscuit(id, iconUrl, <BiscuitState>{
        name,
        extendedFrom: definition.extendedFrom,
        attributes: definition.attributes,
      });
    }
  );
  return single ? current[0] : current;
}

export const zBikkieSearchRequest = z.object({
  id: zBiomesId.optional(),
  query: z.string().optional(),
  schemaPath: z.string().optional(),
});

export type BikkieSearchRequest = z.infer<typeof zBikkieSearchRequest>;

export const zBikkieSearchResult = z.object({
  id: zBiomesId,
  name: z.string(),
  displayName: z.string().optional(),
  iconUrl: z.string(),
  schemas: z.string().array(),
});

export type BikkieSearchResult = z.infer<typeof zBikkieSearchResult>;

export function sendSearchRequest(
  request: BikkieSearchRequest,
  signal?: AbortSignal
): Promise<BikkieSearchResult[]> {
  return jsonPost<BikkieSearchResult[], BikkieSearchRequest>(
    "/api/admin/bikkie/search",
    request,
    { signal }
  );
}

export const zBiscuitUpdate = z.object({
  id: zBiomesId,
  name: z.string().optional(),
  extendedFrom: zBiomesId.optional(),
  attributes: z.record(zBiscuitAttributeAssignment).optional(),
});

export type BiscuitUpdate = z.infer<typeof zBiscuitUpdate>;

export const zSaveBiscuitsRequest = z.object({
  trayName: z.string(),
  updates: zBiscuitUpdate.array(),
});

export type SaveBiscuitsRequest = z.infer<typeof zSaveBiscuitsRequest>;

export const zCreateBiscuitRequest = z.object({
  proposedName: z.string().optional(),
  schemaPath: z.string().optional(),
});

export type CreateBiscuitRequest = z.infer<typeof zCreateBiscuitRequest>;

export const zCreateBiscuitResponse = z.object({
  name: z.string(),
  id: zBiomesId,
});

export type CreateBiscuitResponse = z.infer<typeof zCreateBiscuitResponse>;
