import type { IdGenerator } from "@/server/shared/ids/generator";
import type { BDB, FirestoreFeedPostDoc } from "@/server/shared/storage";
import type { DocumentReference } from "@/server/shared/storage/schema";
import { simplePaginate } from "@/server/web/db/helpers";
import type { FirestoreDocumentComment } from "@/server/web/db/types";
import { fetchUserBundlesByIds } from "@/server/web/db/users_fetch";
import type { BiomesId } from "@/shared/ids";
import { toStoredEntityId } from "@/shared/ids";
import { createCounter } from "@/shared/metrics/metrics";
import type { BatchCommentBundle, CommentBundle } from "@/shared/types";
import { compactMap } from "@/shared/util/collections";
import type { WithId } from "@/shared/util/type_helpers";
import { compact, keyBy, take } from "lodash";
export const NUM_PREVIEW_COMMENTS = 16;

const postsCommented = createCounter({
  name: "biomes_posts_commented",
  help: "Number of posts commented",
});

export async function fetchCommentsBundle(
  db: BDB,
  docRef: DocumentReference<FirestoreFeedPostDoc>
): Promise<BatchCommentBundle> {
  const comments = await documentComments(
    docRef,
    "asc",
    0,
    NUM_PREVIEW_COMMENTS + 1
  );
  const userIdsToFetch = new Set<BiomesId>(comments.map((c) => c.userId));
  const users = compact(
    await fetchUserBundlesByIds(db, ...userIdsToFetch.values())
  );
  const userById = keyBy(users, "id");

  const hasMore = comments.length > NUM_PREVIEW_COMMENTS;
  return {
    comments: take(comments, NUM_PREVIEW_COMMENTS).flatMap((comment) => {
      const userBundle = userById[comment.userId];
      if (userBundle) {
        return {
          user: userBundle,
          comment: comment.comment,
          commentId: comment.id,
        };
      }
      return [];
    }),
    pagingToken: hasMore ? String(NUM_PREVIEW_COMMENTS) : undefined,
  };
}

export async function commentDocument(
  db: BDB,
  idGenerator: IdGenerator,
  userId: BiomesId,
  docRef: DocumentReference<FirestoreFeedPostDoc>,
  comment: string,
  nonce?: number
): Promise<WithId<FirestoreDocumentComment, BiomesId>> {
  const recent = await documentComments(docRef);
  for (const comment of recent) {
    if (comment.userId === userId && comment.comment === comment) {
      return comment;
    }
  }

  const commentId = await idGenerator.next();
  const commentRef = docRef
    .collection("comments")
    .doc(toStoredEntityId(commentId));
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (!doc.exists) {
      throw new Error("Document does not exist");
    }

    const newComments = (doc.data()!.comments ?? 0) + 1;
    const commentData = {
      userId,
      createMs: Date.now(),
      comment,
      nonce,
    };
    transaction.create(commentRef, commentData);
    transaction.update(docRef, {
      comments: newComments,
    });
    return {
      id: commentId,
      ...commentData,
    };
  });
  postsCommented.inc();
  return result;
}
export async function documentComments(
  docRef: DocumentReference<FirestoreFeedPostDoc>,
  direction: "asc" | "desc" = "desc",
  offset = 0,
  limit = 21
) {
  return simplePaginate(
    docRef.collection("comments"),
    "createMs",
    direction,
    offset,
    limit
  );
}

export async function fetchCommentBundles(
  db: BDB,
  comments: WithId<FirestoreDocumentComment, BiomesId>[]
): Promise<CommentBundle[]> {
  const usersToFetch = new Set(comments.map((e) => e.userId));
  const users = new Map(
    compactMap(await fetchUserBundlesByIds(db, ...usersToFetch), (e) =>
      e ? [e.id, e] : undefined
    )
  );

  return comments.flatMap((c) => {
    const user = users.get(c.userId);
    if (user) {
      return [
        {
          user,
          comment: c.comment,
          commentId: c.id,
        },
      ];
    }

    return [];
  });
}
