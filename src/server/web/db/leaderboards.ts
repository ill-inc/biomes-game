import type { BDB } from "@/server/shared/storage";
import { simplePaginate } from "@/server/web/db/helpers";
import { feedPostsByIds } from "@/server/web/db/social";
import type {
  FirestoreEnvironmentGroup,
  FirestoreFeedPost,
} from "@/server/web/db/types";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId } from "@/shared/ids";
import type { WithId } from "@/shared/util/type_helpers";
import { sortBy } from "lodash";

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export async function topFeedPosts(
  db: BDB,
  count = 50
): Promise<WithId<FirestoreFeedPost, BiomesId>[]> {
  // TODO: optimize me
  const candidates = await db
    .collection("feed-posts")
    .where("createMs", ">=", Date.now() - ONE_WEEK)
    .get();

  const docs = sortBy(candidates.docs, (e) => -e.data().likes).slice(0, count);

  return docs.map((e) => ({
    ...e.data(),
    id: parseBiomesId(e.id),
  }));
}

export async function topEnvironmentGroups(
  db: BDB,
  count = 50
): Promise<WithId<FirestoreEnvironmentGroup, BiomesId>[]> {
  const candidates = await db
    .collection("environment-groups")
    .where("createMs", ">=", Date.now() - ONE_WEEK)
    .get();

  const withCreationPosts = candidates.docs.filter(
    (e) => e.data()?.creationPostId
  );

  const reverseMap = new Map<BiomesId, (typeof candidates.docs)[number]>(
    withCreationPosts.map((e) => [e.data()!.creationPostId!, e])
  );

  const candidatePosts = await feedPostsByIds(
    db,
    withCreationPosts.map((e) => e.data()!.creationPostId!)
  );
  const docs = sortBy(candidatePosts, (e) => -e.likes).slice(0, count);

  return docs.map((e) => ({
    ...reverseMap.get(e.id)!.data(),
    id: parseBiomesId(reverseMap.get(e.id)!.id),
  }));
}

export async function mostFollowed(
  db: BDB,
  direction: "asc" | "desc" = "desc",
  offset = 0,
  limit = 21
) {
  return simplePaginate(
    db.collection("users").where("disabled", "==", false),
    "numFollowers",
    direction,
    offset,
    limit
  );
}
