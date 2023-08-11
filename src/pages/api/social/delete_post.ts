import { feedPostById } from "@/server/web/db/social";
import type { FirestoreFeedPost, WithId } from "@/server/web/db/types";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { toStoredEntityId, zBiomesId } from "@/shared/ids";
import { ok } from "assert";
import { z } from "zod";

export const zDeletePostRequest = z.object({
  postId: zBiomesId,
});

export type DeletePostRequest = z.infer<typeof zDeletePostRequest>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zDeletePostRequest,
  },
  async ({ context: { db, chatApi }, auth: { userId }, body: { postId } }) => {
    const feedPost: WithId<FirestoreFeedPost> | null = await feedPostById(
      db,
      postId
    );
    okOrAPIError(feedPost, "not_found", `Photo ${postId} not found`);
    okOrAPIError(feedPost.userId === userId, "unauthorized");

    const feedPostDocRef = db
      .collection("feed-posts")
      .doc(toStoredEntityId(postId));
    const userDocRef = db.collection("users").doc(toStoredEntityId(userId));

    // TODO(akarpenko): Maybe also remove it from chats?
    await Promise.all([
      db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        ok(userDoc.exists);
        transaction.update(feedPostDocRef, {
          deleted: true,
        });
        transaction.update(userDocRef, {
          numPhotos: (userDoc.data()?.numPhotos ?? 0) - 1,
        });
      }),
      chatApi.deleteEntity(feedPost.id),
    ]);
  }
);
