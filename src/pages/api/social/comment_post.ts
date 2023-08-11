import { commentDocument, fetchCommentBundles } from "@/server/web/db/comments";
import { documentTypeToDocRef } from "@/server/web/db/social";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { postCommentToDiscord } from "@/server/web/util/discord";
import { zBiomesId } from "@/shared/ids";
import { zCommentBundle, zSocialDocumentType } from "@/shared/types";
import { containsProfanity } from "@/shared/util/profanity";
import { z } from "zod";

export const zCommentPostResponse = z.object({
  comment: zCommentBundle,
});

export type CommentPostResponse = z.infer<typeof zCommentPostResponse>;

export const zCommentPostRequest = z.object({
  documentId: zBiomesId,
  documentType: zSocialDocumentType,
  to: zBiomesId.optional(),
  comment: z.string().min(1),
  nonce: z.number().optional(),
});

export type CommentPostRequest = z.infer<typeof zCommentPostRequest>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zCommentPostRequest,
    response: zCommentPostResponse,
  },
  async ({
    context,
    auth: { userId },
    body: { documentId, documentType, to, comment, nonce },
  }) => {
    const { db, idGenerator, chatApi } = context;
    const docRef = await documentTypeToDocRef(db, documentType, documentId);
    okOrAPIError(docRef, "bad_param", `Unknown document type ${documentType}`);
    okOrAPIError(
      !containsProfanity(comment),
      "bad_param",
      "Comment contains profanity"
    );

    const commentDoc = await commentDocument(
      db,
      idGenerator,
      userId,
      docRef,
      comment,
      nonce
    );

    // Send notifications
    if (to && (to !== userId || CONFIG.allowPushForSelfActivity)) {
      await chatApi.sendMessage({
        channel: "activity",
        to,
        from: userId,
        message: {
          kind: "comment",
          documentType,
          documentId,
          comment,
        },
      });
      if (documentType === "post") {
        void postCommentToDiscord(context, userId, documentId, comment);
      }
    }

    const commentBundle = (await fetchCommentBundles(db, [commentDoc]))[0];
    return { comment: commentBundle };
  }
);
