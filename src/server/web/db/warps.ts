import type { BDB, FirestoreFeedPostDoc } from "@/server/shared/storage";
import type { DocumentReference } from "@/server/shared/storage/schema";
import { simplePaginate } from "@/server/web/db/helpers";
import type { FirestoreDocumentWarp } from "@/server/web/db/types";
import type { BiomesId } from "@/shared/ids";
import { toStoredEntityId } from "@/shared/ids";
import type { WithId } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { zip } from "lodash";

export async function isWarpedByUser(
  userId: BiomesId,
  docRef: DocumentReference<FirestoreFeedPostDoc>
) {
  const likeDoc = await docRef
    .collection("warps")
    .doc(toStoredEntityId(userId))
    .get();
  return likeDoc.exists;
}

export async function batchFindIsWarped(
  db: BDB,
  uid: BiomesId,
  postIds: BiomesId[]
) {
  const warpDocIds = postIds.map((e) =>
    db
      .collection("feed-posts")
      .doc(toStoredEntityId(e))
      .collection("warps")
      .doc(toStoredEntityId(uid))
  );
  const ret = await db.getAll(...warpDocIds);
  ok(ret.length === postIds.length);
  return new Set<BiomesId>(
    zip(postIds, ret)
      .filter((e) => e[1]!.exists)
      .map((e) => e[0]!)
  );
}

export async function warpers(
  docRef: DocumentReference<FirestoreFeedPostDoc>,
  direction: "asc" | "desc" = "desc",
  offset = 0,
  limit = 21
): Promise<WithId<FirestoreDocumentWarp, BiomesId>[]> {
  return simplePaginate(
    docRef.collection("warps"),
    "createMs",
    direction,
    offset,
    limit
  );
}
