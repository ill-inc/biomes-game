import type { BDB, FirestoreFeedPostDoc } from "@/server/shared/storage";
import type { DocumentReference } from "@/server/shared/storage/schema";
import { simplePaginate } from "@/server/web/db/helpers";
import type {
  FirestoreDocumentLike,
  FirestoreFeedPost,
  WithId,
} from "@/server/web/db/types";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId, toStoredEntityId } from "@/shared/ids";
import { createCounter } from "@/shared/metrics/metrics";
import { ok } from "assert";
import { zip } from "lodash";

const postsLiked = createCounter({
  name: "biomes_posts_liked",
  help: "Number of posts liked",
});

export async function isLikedByUser(
  userId: BiomesId,
  docRef: DocumentReference<FirestoreFeedPostDoc>
) {
  const likeDoc = await docRef
    .collection("likes")
    .doc(toStoredEntityId(userId))
    .get();
  return likeDoc.exists;
}

export async function batchFindIsLiked(
  db: BDB,
  uid: BiomesId,
  postIds: BiomesId[]
) {
  const likeDocIds = postIds.map((e) =>
    db
      .collection("feed-posts")
      .doc(toStoredEntityId(e))
      .collection("likes")
      .doc(toStoredEntityId(uid))
  );
  const ret = await db.getAll(...likeDocIds);
  ok(ret.length === postIds.length);
  return new Set<BiomesId>(
    zip(postIds, ret)
      .filter((e) => e[1]!.exists)
      .map((e) => e[0]!)
  );
}

export async function setLikeDocument(
  db: BDB,
  userId: BiomesId,
  docRef: DocumentReference<FirestoreFeedPostDoc>,
  isLiked: boolean
): Promise<WithId<FirestoreFeedPost>> {
  const likeRef = docRef.collection("likes").doc(toStoredEntityId(userId));
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (!doc.exists) {
      throw new Error(`Document ${docRef.id} does not exist`);
    }

    if (isLiked) {
      const newLikes = (doc.data()!.likes ?? 0) + 1;
      transaction.create(likeRef, {
        createMs: Date.now(),
      });
      transaction.update(docRef, {
        likes: newLikes,
      });
      return {
        ...doc.data()!,
        id: parseBiomesId(docRef.id),
        likes: newLikes,
      };
    } else {
      const newLikes = Math.max(0, (doc.data()!.likes ?? 0) - 1);
      transaction.delete(likeRef);
      transaction.update(docRef, {
        likes: newLikes,
      });

      return {
        ...doc.data()!,
        id: parseBiomesId(docRef.id),
        likes: newLikes,
      };
    }
  });
  if (isLiked) {
    postsLiked.inc();
  }
  return result;
}

export async function likers(
  docRef: DocumentReference<FirestoreFeedPostDoc>,
  direction: "asc" | "desc" = "desc",
  offset = 0,
  limit = 21
): Promise<WithId<FirestoreDocumentLike, BiomesId>[]> {
  return simplePaginate(
    docRef.collection("likes"),
    "createMs",
    direction,
    offset,
    limit
  );
}
