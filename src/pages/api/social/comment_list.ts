import {
  documentComments,
  fetchCommentBundles,
} from "@/server/web/db/comments";
import { documentTypeToDocRef } from "@/server/web/db/social";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { zCommentBundle, zSocialDocumentType } from "@/shared/types";
import { take } from "lodash";
import { z } from "zod";

export const zCommentListRequest = z.object({
  documentId: zBiomesId,
  documentType: zSocialDocumentType,
  pagingToken: z.string().optional(),
});

export const zCommentListResponse = z.object({
  comments: z.array(zCommentBundle),
  pagingToken: z.string().optional(),
});

export type CommentListResponse = z.infer<typeof zCommentListResponse>;

export default biomesApiHandler(
  {
    auth: "optional",
    query: zCommentListRequest,
    response: zCommentListResponse,
  },
  async ({
    context: { db },
    query: { documentId, documentType, pagingToken },
  }) => {
    const offset = pagingToken !== undefined ? parseInt(pagingToken) : 0;
    const numToFetch = 21;

    const docRef = await documentTypeToDocRef(db, documentType, documentId);
    okOrAPIError(docRef, "bad_param", `Unknown document type ${documentType}`);

    const cmnts = await documentComments(docRef, "asc", offset, numToFetch + 2);
    const hasMore = cmnts.length > numToFetch;
    const commentBundles = await fetchCommentBundles(
      db,
      take(cmnts, numToFetch)
    );

    return {
      comments: commentBundles,
      pagingToken: hasMore ? String(offset + numToFetch) : undefined,
    };
  }
);
