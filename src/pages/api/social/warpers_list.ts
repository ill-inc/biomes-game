import { documentTypeToDocRef } from "@/server/web/db/social";
import { fetchUserBundlesByIds } from "@/server/web/db/users_fetch";
import { warpers } from "@/server/web/db/warps";
import { okOrAPIError } from "@/server/web/errors";
import {
  biomesApiHandler,
  zQueryBiomesId,
} from "@/server/web/util/api_middleware";
import type { BiomesId } from "@/shared/ids";
import { zSocialDocumentType, zUserBundle } from "@/shared/types";
import { compact, take } from "lodash";
import { z } from "zod";

export const zWarpersListRequest = z.object({
  documentId: zQueryBiomesId,
  documentType: zSocialDocumentType,
  pagingToken: z.string().optional(),
});

export const zWarpersListResponse = z.object({
  users: z.array(zUserBundle),
  pagingToken: z.string().optional(),
});

export type WarpersListResponse = z.infer<typeof zWarpersListResponse>;

export default biomesApiHandler(
  {
    auth: "optional",
    query: zWarpersListRequest,
    response: zWarpersListResponse,
  },
  async ({
    context: { db },
    query: { documentId, documentType, pagingToken },
  }) => {
    const offset = pagingToken !== undefined ? parseInt(pagingToken) : 0;
    const numToFetch = 21;

    const docRef = await documentTypeToDocRef(db, documentType, documentId);
    okOrAPIError(docRef, "bad_param", `Unknown document type ${documentType}`);

    let userIds: BiomesId[] = (
      await warpers(docRef, "desc", offset, numToFetch + 1)
    ).map((e) => e.id);

    const newPagingToken =
      userIds.length > numToFetch ? String(offset + numToFetch) : undefined;
    userIds = take(userIds, numToFetch);

    const userBundles = await fetchUserBundlesByIds(db, ...userIds);
    return {
      users: compact(userBundles),
      pagingToken: newPagingToken,
    };
  }
);
