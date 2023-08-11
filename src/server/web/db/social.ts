import type { PostStatus } from "@/pages/api/social/curated_posts";
import type { IdGenerator } from "@/server/shared/ids/generator";
import type {
  BDB,
  FirestoreCuratedFeedPostDoc,
  FirestoreFeedPostDoc,
} from "@/server/shared/storage";
import type { DocumentReference } from "@/server/shared/storage/schema";
import type { WorldApi } from "@/server/shared/world/api";
import {
  NUM_PREVIEW_COMMENTS,
  documentComments,
} from "@/server/web/db/comments";
import {
  fetchEnvironmentGroupBundlesById,
  fetchEnvironmentGroupById,
} from "@/server/web/db/environment_groups";
import { simplePaginate } from "@/server/web/db/helpers";
import { batchFindIsLiked } from "@/server/web/db/likes";
import type {
  FirestoreCuratedFeedPost,
  FirestoreDocumentComment,
  FirestoreFeedPost,
  FirestoreUserFollow,
  FirestoreUserFollowedBy,
  WithId,
} from "@/server/web/db/types";
import { fetchUserBundlesByIds } from "@/server/web/db/users_fetch";
import { batchFindIsWarped } from "@/server/web/db/warps";
import { makeCloudImageBundle } from "@/server/web/util/image_resizing";
import { resolveImageUrls } from "@/server/web/util/urls";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId, toStoredEntityId } from "@/shared/ids";
import { createCounter } from "@/shared/metrics/metrics";
import type {
  BatchCommentBundle,
  CuratedFeedPostBundle,
  FeedPostBundle,
  LandBundle,
  MinigameDetail,
  PostTaggedObject,
  PostsFeed,
  ShotMetadata,
  SocialDocumentType,
  TaggedObjectBundle,
} from "@/shared/types";
import { compactMap } from "@/shared/util/collections";
import { dataURLToBase64 } from "@/shared/util/helpers";
import { ok } from "assert";
import { compact, take } from "lodash";

export async function allCuratedFeedPosts(
  db: BDB,
  // Offset into the list of posts.
  offset: number,
  // Max number of posts to fetch.
  limit: number,
  // Approval status of the posts to fetch. Any if none is specified.
  status?: PostStatus
): Promise<[WithId<FirestoreCuratedFeedPost>[], string | undefined]> {
  let couldHaveMorePosts = true;
  const curatedPosts: WithId<FirestoreCuratedFeedPost>[] = [];

  while (curatedPosts.length < limit && couldHaveMorePosts) {
    let query: any = db.collection("currated-feed-posts");

    // Only fetch posts with the desired approval status.
    if (status === "not-approved") {
      query = query.where("approved", "==", false);
    } else if (status === "approved") {
      query = query.where("approved", "==", true);
    }
    const posts = await simplePaginate(
      query,
      "priority",
      "desc",
      offset,
      limit
    );
    offset += posts.length;
    couldHaveMorePosts = posts.length === limit;
    curatedPosts.push(...posts);
  }

  const newPagingToken = couldHaveMorePosts ? offset.toString() : undefined;
  return [curatedPosts, newPagingToken];
}

export async function feedPostById(
  db: BDB,
  id: BiomesId,
  includeDeleted = false
): Promise<WithId<FirestoreFeedPost> | null> {
  const ret = await db.collection("feed-posts").doc(toStoredEntityId(id)).get();
  if (!ret.exists) {
    return null;
  }
  const data = ret.data()!;
  if (data.deleted && !includeDeleted) {
    return null;
  }

  return {
    id: id,
    ...data,
  };
}

export async function feedPostsByIds(
  db: BDB,
  ids: BiomesId[],
  includeDeleted = false
): Promise<WithId<FirestoreFeedPost>[]> {
  const docIds = ids.map((e) =>
    db.collection("feed-posts").doc(toStoredEntityId(e))
  );
  const ret = await db.getAll(...docIds);
  return compactMap(ret, (e) => {
    if (!e.exists) {
      return;
    }
    const data = e.data()!;
    if (data.deleted && !includeDeleted) {
      return;
    }
    return {
      ...data,
      id: parseBiomesId(e.id),
    };
  });
}

export function dedupeNearbyPhotos<E>(
  docs: WithId<FirestoreFeedPost, E>[],
  radius: number,
  limit?: number
) {
  const results: WithId<FirestoreFeedPost, E>[] = [];
  for (const candidate of docs) {
    if (limit && results.length >= limit) {
      break;
    }

    const pos = (candidate.media && candidate.media[0])?.metadata?.coordinates;
    if (!pos) {
      continue;
    }

    let isAllowed = true;
    for (const other of results) {
      const otherPos = other.media![0].metadata!.coordinates;
      const dist2d = Math.sqrt(
        (pos[0] - otherPos[0]) ** 2 + (pos[2] - otherPos[2]) ** 2
      );

      if (dist2d < radius) {
        isAllowed = false;
        break;
      }
    }

    if (!isAllowed) {
      continue;
    }

    results.push(candidate);
  }

  return results;
}

export async function recentFeedPosts(
  db: BDB,
  count = 50
): Promise<WithId<FirestoreFeedPost>[]> {
  const ret = await db
    .collection("feed-posts")
    .orderBy("createMs", "desc")
    .limit(count)
    .get();
  return ret.docs.map((e) => ({
    ...e.data(),
    id: parseBiomesId(e.id),
  }));
}

const photosPosted = createCounter({
  name: "biomes_photos_posted",
  help: "Number of photos posted",
});

const photosTaggedUsers = createCounter({
  name: "biomes_photos_tagged_users",
  help: "Number of users tagged in photos",
});

export async function handleFeedPostPhoto(
  db: BDB,
  idGenerator: IdGenerator,
  userId: BiomesId,
  dataURI: string,
  tagged: PostTaggedObject[],
  caption: string | undefined = undefined,
  metadata: ShotMetadata
): Promise<WithId<FirestoreFeedPost>> {
  const b64 = dataURLToBase64(dataURI);

  const basePath = `${userId}/posts`;
  const image = Buffer.from(b64, "base64");
  const [cloudBundle, feedPostId] = await Promise.all([
    makeCloudImageBundle("biomes-social", image, basePath),
    idGenerator.next(),
  ]);

  const userDocRef = db.collection("users").doc(toStoredEntityId(userId)); // For post count
  const feedPostDocRef = db
    .collection("feed-posts")
    .doc(toStoredEntityId(feedPostId));
  const createTime = Date.now();
  const curatedPostDocRef = db
    .collection("currated-feed-posts")
    .doc(toStoredEntityId(feedPostId));
  const feedPostDocData: FirestoreFeedPost = {
    userId,
    createMs: createTime,
    tagged,
    media: [
      {
        cloudBucket: "biomes-social",
        cloudImageLocations: cloudBundle,
        metadata,
        caption,
      },
    ],
    comments: 0,
    likes: 0,
    warps: 0,
    deleted: false,
  };

  const result = await db.runTransaction(async (transaction) => {
    return transaction.get(userDocRef).then((userDoc) => {
      ok(userDoc.exists, "Uploading but no user?");
      transaction.create(curatedPostDocRef, {
        approved: false,
        priority: createTime,
      });
      transaction.create(feedPostDocRef, feedPostDocData);
      transaction.update(userDocRef, {
        numPhotos: (userDoc.data()?.numPhotos ?? 0) + 1,
      });

      return {
        id: feedPostId,
        ...feedPostDocData,
      };
    });
  });
  photosPosted.inc();
  photosTaggedUsers.inc(
    tagged.reduce((acc, val) => (val.kind === "user" ? acc + 1 : acc), 0)
  );
  return result;
}

const usersFollowed = createCounter({
  name: "biomes_user_followed",
  help: "Number of users followed",
});

export async function setFollow(
  db: BDB,
  sourceId: BiomesId,
  targetId: BiomesId,
  isFollow: boolean
) {
  if (sourceId === targetId) {
    return;
  }
  const sourceDocRef = db.collection("users").doc(toStoredEntityId(sourceId));
  const targetDocRef = db.collection("users").doc(toStoredEntityId(targetId));

  const sourceFollowDocRef = sourceDocRef
    .collection("follows")
    .doc(toStoredEntityId(targetId));
  const targetFollowedByDocRef = targetDocRef
    .collection("followed-by")
    .doc(toStoredEntityId(sourceId));

  const result = await db.runTransaction(async (transaction) => {
    const [sourceDoc, targetDoc, sourceToTarget, targetToSource] =
      await Promise.all([
        transaction.get(sourceDocRef),
        transaction.get(targetDocRef),
        transaction.get(sourceFollowDocRef),
        transaction.get(targetFollowedByDocRef),
      ]);

    if (!sourceDoc.exists || !targetDoc.exists) {
      // Cleanup any stale links.
      if (sourceToTarget.exists) {
        transaction.delete(sourceFollowDocRef);
      }
      if (targetToSource.exists) {
        transaction.delete(targetFollowedByDocRef);
      }
      throw new Error(
        sourceDoc.exists
          ? "You must exist to be followed"
          : "You must exist to follow"
      );
    }

    let followDelta = 0;
    if (isFollow) {
      if (!sourceToTarget.exists && !targetToSource.exists) {
        // Neither exists, assume counter is correct.
        followDelta = 1;
      }
      if (!sourceToTarget.exists) {
        transaction.create(sourceFollowDocRef, {
          createMs: Date.now(),
        });
      }
      if (!targetToSource.exists) {
        transaction.create(targetFollowedByDocRef, {
          createMs: Date.now(),
        });
      }
    } else {
      if (sourceToTarget.exists && targetToSource.exists) {
        // Both exist, assume counter is correct.
        followDelta = -1;
      }
      if (sourceToTarget.exists) {
        transaction.delete(sourceFollowDocRef);
      }
      if (targetToSource.exists) {
        transaction.delete(targetFollowedByDocRef);
      }
    }

    transaction.update(sourceDocRef, {
      numFollowing: (sourceDoc.data()?.numFollowing ?? 0) + followDelta,
    });
    transaction.update(targetDocRef, {
      numFollowers: (targetDoc.data()?.numFollowers ?? 0) + followDelta,
    });
  });

  if (isFollow) {
    usersFollowed.inc();
  }

  return result;
}

export async function isFollowing(
  db: BDB,
  sourceId: BiomesId,
  targetId: BiomesId
) {
  const sourceDocRef = db.collection("users").doc(toStoredEntityId(sourceId));
  const sourceFollowDocRef = sourceDocRef
    .collection("follows")
    .doc(toStoredEntityId(targetId));
  return (await sourceFollowDocRef.get()).exists;
}

export async function isFollowingMany(
  db: BDB,
  sourceId: BiomesId,
  targetIds: BiomesId[]
) {
  const sourceDocRef = db.collection("users").doc(toStoredEntityId(sourceId));
  const sourceFollowDocRefs = targetIds.map((e) =>
    sourceDocRef.collection("follows").doc(toStoredEntityId(e))
  );
  return (await db.getAll(...sourceFollowDocRefs)).map((e) =>
    Boolean(e?.exists)
  );
}

export async function followers(
  db: BDB,
  userId: BiomesId,
  direction: "asc" | "desc" = "desc",
  offset: number = 0,
  limit = 21
): Promise<WithId<FirestoreUserFollowedBy, BiomesId>[]> {
  return simplePaginate(
    db
      .collection("users")
      .doc(toStoredEntityId(userId))
      .collection("followed-by"),
    "createMs",
    direction,
    offset,
    limit
  );
}

export async function followTargets(
  db: BDB,
  userId: BiomesId,
  direction: "asc" | "desc" = "desc",
  offset: number = 0,
  limit = 21
): Promise<WithId<FirestoreUserFollow, BiomesId>[]> {
  return simplePaginate(
    db.collection("users").doc(toStoredEntityId(userId)).collection("follows"),
    "createMs",
    direction,
    offset,
    limit
  );
}

export async function allFollowIds(
  db: BDB,
  userId: BiomesId
): Promise<BiomesId[]> {
  const result = await db
    .collection("users")
    .doc(toStoredEntityId(userId))
    .collection("follows")
    .get();
  return result.docs.map((e) => parseBiomesId(e.id));
}

const postsWarped = createCounter({
  name: "biomes_posts_warped",
  help: "Number of posts warped",
});

export async function setWarpToDocument(
  db: BDB,
  userId: BiomesId,
  docRef: DocumentReference<FirestoreFeedPostDoc>
): Promise<WithId<FirestoreFeedPost, BiomesId>> {
  const warpRef = docRef.collection("warps").doc(toStoredEntityId(userId));
  const result = await db.runTransaction(async (transaction) => {
    const postDoc = await transaction.get(docRef);
    if (!postDoc.exists) {
      throw new Error(`Document ${docRef.id} does not exist`);
    }
    const warpData = await transaction.get(warpRef);
    if (warpData.exists) {
      return {
        ...postDoc.data()!,
        id: parseBiomesId(docRef.id),
      };
    }

    const newWarps = (postDoc.data()!.warps ?? 0) + 1;
    transaction.create(warpRef, {
      createMs: Date.now(),
    });
    transaction.update(docRef, {
      warps: newWarps,
    });
    return {
      ...postDoc.data()!,
      id: parseBiomesId(docRef.id),
      warps: newWarps,
    };
  });
  postsWarped.inc();
  return result;
}

export async function feedPostsByUser(
  db: BDB,
  userId: BiomesId,
  offset = 0,
  limit = 20
): Promise<WithId<FirestoreFeedPost, BiomesId>[]> {
  const docs = await db
    .collection("feed-posts")
    .where("userId", "==", userId)
    .where("deleted", "==", false)
    .orderBy("createMs", "desc")
    .offset(offset)
    .limit(limit)
    .get();

  return docs.docs.map((e) => ({
    id: parseBiomesId(e.id),
    ...e.data(),
  }));
}

export async function fetchFeedPostBundleById(
  db: BDB,
  worldApi: WorldApi,
  postId: BiomesId,
  queryUserId?: BiomesId
) {
  const fp = await feedPostById(db, postId);
  if (!fp) {
    return undefined;
  }

  return fetchFeedPostBundle(db, worldApi, fp, queryUserId);
}
export async function fetchFeedPostBundlesByIds(
  db: BDB,
  worldApi: WorldApi,
  postIds: BiomesId[],
  queryUserId?: BiomesId
): Promise<Array<FeedPostBundle | undefined>> {
  const fps = await feedPostsByIds(db, postIds);
  return fetchFeedPostBundles(db, worldApi, queryUserId, ...fps);
}

export async function fetchFeedPostBundle(
  db: BDB,
  worldApi: WorldApi,
  post: WithId<FirestoreFeedPost, BiomesId>,
  queryUserId?: BiomesId
) {
  const ret = (await fetchFeedPostBundles(db, worldApi, queryUserId, post))[0];
  ok(ret);
  return ret;
}

export async function fetchUserFeed(
  db: BDB,
  worldApi: WorldApi,
  userId: BiomesId,
  pagingToken?: string,
  queryUserId?: BiomesId
): Promise<PostsFeed> {
  const numToFetch = 21;
  const offset = pagingToken ? parseInt(pagingToken) : 0;
  let feedPosts = await feedPostsByUser(db, userId, offset, numToFetch + 1);

  const hasMore = feedPosts.length > numToFetch;
  feedPosts = feedPosts.slice(0, numToFetch);

  const bundles = await fetchFeedPostBundles(
    db,
    worldApi,
    queryUserId,
    ...feedPosts
  );
  const postsFeed = {
    posts: compact(bundles),
    pagingToken: hasMore ? String(offset + feedPosts.length) : undefined,
  };
  return postsFeed;
}

export async function fetchMinigameDetails(
  worldApi: WorldApi,
  ids: BiomesId[]
): Promise<Array<MinigameDetail | undefined>> {
  const minigames = await worldApi.get(ids);
  return minigames.map((minigame) => {
    const component = minigame?.minigameComponent();
    if (!minigame || !component) {
      return undefined;
    }

    return <MinigameDetail>{
      id: minigame.id,
      minigameType: component.metadata.kind,
      label: minigame.label()?.text,
    };
  });
}

export async function fetchCuratedFeedPostBundles(
  db: BDB,
  worldApi: WorldApi,
  ...curatedPosts: WithId<FirestoreCuratedFeedPost, BiomesId>[]
): Promise<CuratedFeedPostBundle[]> {
  if (curatedPosts.length === 0) {
    return [];
  }

  const postIds = curatedPosts.map((e) => e.id);
  const posts: FeedPostBundle[] = compact(
    await fetchFeedPostBundlesByIds(db, worldApi, postIds)
  );
  const curatedPostsById = new Map(curatedPosts.map((e) => [e.id, e]));
  const postsById = new Map(
    posts.map((e) => {
      e.taggedObjects = [];
      return [e.id, e];
    })
  );
  const bundles = [];

  for (const id of postIds) {
    const post = postsById.get(id);
    const data = curatedPostsById.get(id);

    if (post && data) {
      bundles.push({
        post,
        ...data,
      });
    }
  }

  return bundles as CuratedFeedPostBundle[];
}

export async function fetchFeedPostBundles(
  db: BDB,
  worldApi: WorldApi,
  queryUserId?: BiomesId,
  ...posts: WithId<FirestoreFeedPost, BiomesId>[]
): Promise<(FeedPostBundle | undefined)[]> {
  if (posts.length === 0) {
    return [];
  }

  const postIds = posts.map((e) => e.id);

  const postIdToComments = new Map(
    await Promise.all(
      postIds.map(
        async (e) =>
          [
            e,
            await documentComments(
              db.collection("feed-posts").doc(toStoredEntityId(e)),
              "asc",
              0,
              NUM_PREVIEW_COMMENTS + 1
            ),
          ] as [BiomesId, WithId<FirestoreDocumentComment>[]]
      )
    )
  );

  const [
    likedSet,
    warpedSet,
    userBundleById,
    environmentGroupBundleById,
    landBundleById,
    minigameBundlesById,
  ] = await Promise.all([
    (async () => {
      return queryUserId
        ? batchFindIsLiked(db, queryUserId, postIds)
        : new Set<BiomesId>();
    })(),

    (async () => {
      return queryUserId
        ? batchFindIsWarped(db, queryUserId, postIds)
        : new Set<BiomesId>();
    })(),

    (async () => {
      const userIdsToFetch = new Set<BiomesId>(
        posts.flatMap((e) => [
          e.userId,
          ...(e.tagged?.flatMap((e) => (e.kind === "user" ? [e.id] : [])) ??
            []),
        ])
      );

      for (const comments of postIdToComments.values()) {
        for (const comment of comments) {
          userIdsToFetch.add(comment.userId);
        }
      }

      const userBundles = compact(
        await fetchUserBundlesByIds(db, ...userIdsToFetch.values())
      );
      const userById = new Map(userBundles.map((e) => [e.id, e]));
      return userById;
    })(),
    (async () => {
      const environmentGroupIdsToFetch = new Set<BiomesId>(
        posts.flatMap((post) => {
          if (!post.tagged) {
            return [];
          }
          return post.tagged.flatMap((e) =>
            e.kind === "environment_group" ? [e.id] : []
          );
        })
      );

      const environmentGroupBundles = compact(
        await fetchEnvironmentGroupBundlesById(
          db,
          worldApi,
          ...environmentGroupIdsToFetch.values()
        )
      );
      const environmentGroupBundleById = new Map(
        environmentGroupBundles.map((e) => [e.id, e])
      );
      return environmentGroupBundleById;
    })(),
    (async () => {
      const landBundles: LandBundle[] = posts.flatMap((post) => {
        if (!post.tagged) {
          return [];
        }

        return post.tagged.flatMap((tagged) => {
          if (tagged.kind !== "land") {
            return [];
          }

          return [
            {
              id: tagged.id,
              creatorId: tagged.creatorId,
              robotId: tagged.robotId,
            },
          ];
        });
      });

      const landBundleById = new Map(landBundles.map((e) => [e.id, e]));
      return landBundleById;
    })(),
    (async () => {
      const minigameIdsToFetch = new Set<BiomesId>(
        compact(
          posts.flatMap((post) => {
            return post.media?.map((m) => m.metadata?.shotInMinigameId) ?? [];
          })
        )
      );

      const minigameDetails = compact(
        await fetchMinigameDetails(worldApi, [...minigameIdsToFetch.values()])
      );
      const minigameDetailById = new Map(minigameDetails.map((e) => [e.id, e]));
      return minigameDetailById;
    })(),
  ]);

  return posts.map((post) => {
    if (!post.media?.length) {
      return undefined;
    }

    const author = userBundleById.get(post.userId);
    if (!author) {
      return undefined;
    }
    const taggedObjectBundles: TaggedObjectBundle[] = [];
    post.tagged?.forEach((to) => {
      switch (to.kind) {
        case "user":
          const ub = userBundleById.get(to.id);
          if (ub) {
            taggedObjectBundles.push({
              kind: "user",
              bundle: ub,
              ndcCoordinates: to.ndcCoordinates,
              imageCoordinates: to.imageCoordinates,
              position: to.position,
            });
          }
          break;
        case "environment_group":
          const eb = environmentGroupBundleById.get(to.id);
          if (eb) {
            taggedObjectBundles.push({
              kind: "environment_group",
              bundle: eb,
            });
          }
          break;
        case "land":
          const bundle = landBundleById.get(to.id);
          if (bundle) {
            taggedObjectBundles.push({
              kind: "land",
              bundle,
            });
          }
      }
    });

    const comments = postIdToComments.get(post.id)!;
    const hasMore = comments.length > NUM_PREVIEW_COMMENTS;
    const commentBundle: BatchCommentBundle = {
      comments: take(comments, NUM_PREVIEW_COMMENTS).flatMap((comment) => {
        const userBundle = userBundleById.get(comment.userId);
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

    const media = post.media[0];
    const allowWarping = Boolean(media.metadata?.coordinates);
    return {
      id: post.id,
      userId: post.userId,
      author,
      createMs: post.createMs,
      imageUrls: resolveImageUrls(media.cloudBucket, media.cloudImageLocations),
      taggedObjects: taggedObjectBundles,
      metadata: media.metadata,
      caption: media.caption,
      commentBundle,
      allowWarping,
      warpInfo: allowWarping
        ? {
            destination: {
              kind: "coordinates",
              coordinates: media.metadata?.coordinates,
            },
          }
        : undefined,
      numComments: post.comments ?? 0,
      numLikes: post.likes ?? 0,
      numWarps: post.warps ?? 0,
      isLikedByQuerier: queryUserId ? likedSet.has(post.id) : false,
      isWarpedByQuerier: queryUserId ? warpedSet.has(post.id) : false,
      minigame:
        media.metadata?.shotInMinigameId &&
        minigameBundlesById.get(media.metadata.shotInMinigameId),
    };
  }) as (FeedPostBundle | undefined)[];
}

export async function documentTypeToDocRef(
  db: BDB,
  documentType: SocialDocumentType,
  documentId: BiomesId
): Promise<DocumentReference<FirestoreFeedPostDoc> | undefined> {
  switch (documentType) {
    case "post":
      return db.collection("feed-posts").doc(toStoredEntityId(documentId));
    case "environment_group":
      const group = await fetchEnvironmentGroupById(db, documentId);
      if (group && group.creationPostId) {
        return db
          .collection("feed-posts")
          .doc(toStoredEntityId(group.creationPostId));
      }
      return;
    default:
      return;
  }
}

export async function fetchCuratedFeedPostDocRef(
  db: BDB,
  documentId: BiomesId,
  options?: {
    createIfMissing: boolean;
    // Priority of the post, if it is created.
    priority: number;
  }
): Promise<DocumentReference<FirestoreCuratedFeedPostDoc> | undefined> {
  const doc = db
    .collection("currated-feed-posts")
    .doc(toStoredEntityId(documentId));
  const value = await doc.get();
  if (!value.exists) {
    if (options?.createIfMissing) {
      await doc.set({
        priority: options.priority,
        approved: false,
      });
    } else {
      return undefined;
    }
  }

  return doc;
}
