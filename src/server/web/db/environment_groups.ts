import type { IdGenerator } from "@/server/shared/ids/generator";
import type { BDB } from "@/server/shared/storage";
import type { WorldApi } from "@/server/shared/world/api";
import { uploadToBucket } from "@/server/web/cloud_storage/cloud_storage";
import { fetchCommentsBundle } from "@/server/web/db/comments";
import { isLikedByUser } from "@/server/web/db/likes";
import type {
  FirestoreEnvironmentGroup,
  FirestoreFeedPost,
  GroupState,
  WithId,
} from "@/server/web/db/types";
import { fetchUserBundlesByIds } from "@/server/web/db/users_fetch";
import { isWarpedByUser } from "@/server/web/db/warps";
import { makeCloudImageBundle } from "@/server/web/util/image_resizing";
import { absoluteBucketURL, resolveImageUrls } from "@/server/web/util/urls";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import type { Box } from "@/shared/ecs/gen/components";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId, toStoredEntityId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { Vec2, Vec3 } from "@/shared/math/types";
import type {
  EnvironmentGroupBundle,
  EnvironmentGroupBundleFeed,
  GroupDetailBundle,
} from "@/shared/types";
import type { CloudBucketKey } from "@/shared/url_types";
import { compactMap } from "@/shared/util/collections";
import { compact, keyBy } from "lodash";
import { v4 as uuid } from "uuid";

interface EnvironmentGroupMetadata {
  name: string;
  terrainCounts: Map<TerrainID, number>;
  description?: string;
}

export async function createEnvironmentGroupInDB(
  db: BDB,
  idGenerator: IdGenerator,
  groupId: BiomesId,
  creatorId: BiomesId,
  gltfJSON: string,
  pngBlob: Buffer,
  allowWarping: boolean,
  { name, terrainCounts, description }: EnvironmentGroupMetadata
) {
  const folderKey = uuid();
  const bucketName: CloudBucketKey = "biomes-static";
  const gltfStoragePath = `/group-builds/${folderKey}/voxels.gltf`;
  const imageStorageBase = `/group-builds/${folderKey}`;
  const [_unused0, cloudImageLocations] = await Promise.all([
    uploadToBucket(bucketName, gltfStoragePath, gltfJSON, "model/gltf+json"),
    makeCloudImageBundle(bucketName, pngBlob, imageStorageBase),
  ]);

  const createMs = Date.now();
  const creationPostId = await idGenerator.next();
  const creationPost: FirestoreFeedPost = {
    userId: creatorId,
    createMs,
    deleted: false,
    tagged: [
      {
        kind: "environment_group",
        id: groupId,
      },
    ],
    media: [],
    comments: 0,
    likes: 0,
    warps: 0,
    portalEntityId: allowWarping ? groupId : undefined,
  };

  const environmentGroup: FirestoreEnvironmentGroup = {
    creatorId,
    createMs,
    deleted: false,
    state: "unconfirmed",
    name,
    creationPostId,
    materialIndexes: Array.from(terrainCounts.keys()),
    materialCounts: Array.from(terrainCounts.values()),
    cloudBucket: bucketName,
    cloudGLTFPath: gltfStoragePath,
    cloudImageLocations,
    description,
  };

  await db.runTransaction(async (transaction) => {
    transaction.create(
      db.collection("feed-posts").doc(toStoredEntityId(creationPostId)),
      creationPost
    );
    transaction.create(
      db.collection("environment-groups").doc(toStoredEntityId(groupId)),
      environmentGroup
    );
  });

  return {
    id: groupId,
    ...environmentGroup,
  } as WithId<FirestoreEnvironmentGroup>;
}

export async function fetchEnvironmentGroupById(
  db: BDB,
  id: BiomesId
): Promise<WithId<FirestoreEnvironmentGroup> | undefined> {
  const doc = await db
    .collection("environment-groups")
    .doc(toStoredEntityId(id))
    .get();
  if (!doc.exists) {
    log.warn(`Group ${id} not found in the DB`);
    return;
  }
  return {
    id,
    ...doc.data()!,
  };
}

export async function fetchAllEnvironmentGroupsById(
  db: BDB,
  ids: BiomesId[]
): Promise<WithId<FirestoreEnvironmentGroup, BiomesId>[]> {
  const docIds = ids.map((e) =>
    db.collection("environment-groups").doc(toStoredEntityId(e))
  );
  const ret = await db.getAll(...docIds);
  return compactMap(ret, (e) =>
    e.exists
      ? {
          ...e.data()!,
          id: parseBiomesId(e.id),
        }
      : undefined
  );
}

export async function fetchEnvironmentGroupBundle(
  worldApi: WorldApi,
  data: WithId<FirestoreEnvironmentGroup>
): Promise<EnvironmentGroupBundle | undefined> {
  const groupEntity = await worldApi.get(data.id);
  return {
    id: data.id,
    creatorId: data.creatorId,
    imageUrls: resolveImageUrls(
      data.cloudBucket,
      data.cloudImageLocations ?? {},
      (data as any).cloudPngPath
        ? absoluteBucketURL(data.cloudBucket, (data as any).cloudPngPath)
        : undefined
    ),
    gltfURL: data.cloudGLTFPath
      ? absoluteBucketURL(data.cloudBucket, data.cloudGLTFPath)
      : undefined,
    name: data.name,
    description: data.description,
    tensor: groupEntity?.groupComponent()?.tensor,
    box: groupEntity?.box() as Box,
    placeableIds: groupEntity?.groupedEntities()?.ids as BiomesId[],
    deleted: data.deleted,
    iced: !!groupEntity?.iced,
  };
}

export async function fetchEnvironmentGroupBundles(
  worldApi: WorldApi,
  data: WithId<FirestoreEnvironmentGroup>[]
): Promise<(EnvironmentGroupBundle | undefined)[]> {
  return Promise.all(data.map((e) => fetchEnvironmentGroupBundle(worldApi, e)));
}

export async function fetchEnvironmentGroupBundleById(
  db: BDB,
  worldApi: WorldApi,
  id: BiomesId
) {
  const data = await fetchEnvironmentGroupById(db, id);
  if (!data) {
    return;
  }
  return fetchEnvironmentGroupBundle(worldApi, data);
}

export async function fetchEnvironmentGroupBundlesById(
  db: BDB,
  worldApi: WorldApi,
  ...environmentGroupIds: BiomesId[]
): Promise<(EnvironmentGroupBundle | undefined)[]> {
  const environmentGroupBundles = await fetchEnvironmentGroupBundles(
    worldApi,
    await fetchAllEnvironmentGroupsById(db, environmentGroupIds)
  );
  const retMap = keyBy(environmentGroupBundles, "id");

  return environmentGroupIds.map((uid) => retMap[uid]);
}

export type GroupOwner = {
  ownerBiomesUserId?: BiomesId;
};

export async function fetchGroupOwner(
  db: BDB,
  group?: FirestoreEnvironmentGroup
): Promise<GroupOwner> {
  return {
    ownerBiomesUserId: group?.creatorId,
  };
}

export async function fetchGroupDetailBundlesByIds(
  db: BDB,
  worldApi: WorldApi,
  groupIds: BiomesId[],
  extraOptions: {
    queryingUserId?: BiomesId;
    knownOwnerId?: BiomesId;
  }
): Promise<GroupDetailBundle[]> {
  return compact(
    await Promise.all(
      groupIds.map((e) => fetchGroupDetailBundle(db, worldApi, e, extraOptions))
    )
  );
}

// TODO (akarpenko): Combine with fetchEnvironmentGroupBundleById()
export async function fetchGroupDetailBundle(
  db: BDB,
  worldApi: WorldApi,
  groupId: BiomesId,
  extraOptions: {
    queryingUserId?: BiomesId;
    knownOwnerId?: BiomesId;
  }
): Promise<GroupDetailBundle | undefined> {
  const [group, groupEntity] = await Promise.all([
    fetchEnvironmentGroupById(db, groupId),
    worldApi.get(groupId),
  ]);
  if (!group) {
    return;
  }

  const creationPostRef = group.creationPostId
    ? db.collection("feed-posts").doc(toStoredEntityId(group.creationPostId))
    : undefined;
  const creationPost = (await creationPostRef?.get())?.data();

  const commentBundle =
    creationPost && creationPostRef
      ? await fetchCommentsBundle(db, creationPostRef)
      : undefined;

  let ownerBiomesUserId = extraOptions.knownOwnerId;
  if (!ownerBiomesUserId) {
    ({ ownerBiomesUserId } = await fetchGroupOwner(db, group));
  }

  const ownerBiomesUserBundle =
    ownerBiomesUserId &&
    (await fetchUserBundlesByIds(db, ownerBiomesUserId))[0];

  return {
    id: groupId,
    name: group.name,
    description: group.description,
    imageUrls: resolveImageUrls(
      group.cloudBucket,
      group.cloudImageLocations ?? {},
      (group as any).cloudPngPath
        ? absoluteBucketURL(group.cloudBucket, (group as any).cloudPngPath)
        : undefined
    ),
    gltfURL: group.cloudGLTFPath
      ? absoluteBucketURL(group.cloudBucket, group.cloudGLTFPath)
      : undefined,
    ownerBiomesUser: ownerBiomesUserBundle,
    warpPosition: groupEntity?.warpable()?.warp_to as Vec3,
    warpOrientation: groupEntity?.warpable()?.orientation as Vec2,
    allowWarping: !!groupEntity?.hasWarpable(),
    warpInfo: groupEntity?.hasWarpable()
      ? {
          destination: {
            kind: "entity",
            entityId: groupEntity.id,
          },
        }
      : undefined,
    numWarps: creationPost?.warps ?? 0,
    numLikes: creationPost?.likes ?? 0,
    isLikedByQuerier:
      extraOptions.queryingUserId !== undefined &&
      creationPostRef !== undefined &&
      (await isLikedByUser(extraOptions.queryingUserId, creationPostRef)),
    isWarpedByQuerier:
      extraOptions.queryingUserId !== undefined &&
      creationPostRef !== undefined &&
      (await isWarpedByUser(extraOptions.queryingUserId, creationPostRef)),
    numComments: creationPost?.comments ?? 0,
    commentBundle: commentBundle ?? { comments: [] },
    tensor: groupEntity?.groupComponent()?.tensor,
    placeableIds: groupEntity?.groupedEntities()?.ids as BiomesId[],
    createMs: group.createMs ?? 0,
  };
}

export async function environmentGroupsByCreator(
  db: BDB,
  userId: BiomesId,
  state?: GroupState,
  offset = 0,
  limit = 20,
  includeDeleted = false
): Promise<WithId<FirestoreEnvironmentGroup, BiomesId>[]> {
  let query = db
    .collection("environment-groups")
    .where("creatorId", "==", userId);
  if (state) {
    query = query.where("state", "==", state);
  }
  const docs = await query
    .orderBy("createMs", "desc")
    .offset(offset)
    .limit(limit)
    .get();

  return docs.docs
    .filter((e) => e.exists && (includeDeleted || e.data().deleted != true))
    .map((e) => ({
      id: parseBiomesId(e.id),
      ...e.data(),
    }));
}

export async function fetchEnvironmentGroupsCreatorFeed(
  db: BDB,
  worldApi: WorldApi,
  userId: BiomesId,
  pagingToken?: string
): Promise<EnvironmentGroupBundleFeed> {
  const numToFetch = 21;
  const offset = pagingToken ? parseInt(pagingToken) : 0;
  let groups = await environmentGroupsByCreator(
    db,
    userId,
    "confirmed",
    offset,
    numToFetch + 1
  );
  const hasMore = groups.length > numToFetch;
  groups = groups.slice(0, numToFetch);

  const bundles = compact(await fetchEnvironmentGroupBundles(worldApi, groups));

  const feed = {
    environmentGroupBundles: bundles,
    pagingToken: hasMore ? String(offset + bundles.length) : undefined,
  };
  return feed;
}
