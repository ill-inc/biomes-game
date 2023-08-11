import { zMinigameType } from "@/shared/ecs/gen/types";
import {
  bagAsStringSymbol,
  defaultSchemaPathSymbol,
  entityIdSymbol,
  itemIdSymbol,
} from "@/shared/game/zod_symbols";
import { zBiomesId } from "@/shared/ids";
import { zBox, zVec2f, zVec3f } from "@/shared/math/types";
import { zImageUrls } from "@/shared/url_types";
import { z } from "zod";

export const zShotMetadata = z.object({
  coordinates: zVec3f,
  cameraLookAt: zVec3f.optional(),
  shotInMinigameId: zBiomesId.optional(),
  shotInMinigameInstanceId: zBiomesId.optional(),
  shotInMinigameType: zMinigameType.optional(),
});

export type ShotMetadata = z.infer<typeof zShotMetadata>;

export const zUserBundle = z.object({
  username: z.string().optional(),
  id: zBiomesId,
  createMs: z.number(),
  profilePicImageUrls: zImageUrls,
  numFollowers: z.number(),
  numFollowing: z.number(),
  numPhotos: z.number(),
  disabled: z.boolean(),
});

export type UserBundle = z.infer<typeof zUserBundle>;

export const zInviteCodeBundle = z.object({
  code: z.string(),
  uses: z.number(),
  maxUses: z.number(),
  lastUser: zUserBundle.optional(),
});

export type InviteCodeBundle = z.infer<typeof zInviteCodeBundle>;

export const zUserEntityStatus = z.object({
  id: zBiomesId,
  label: z.string(),
  position: zVec3f,
  orientation: zVec2f,
  online: z.boolean(),
});

export const zMinigameDetail = z.object({
  id: zBiomesId,
  label: z.string().optional(),
  minigameType: zMinigameType,
});
export type MinigameDetail = z.infer<typeof zMinigameDetail>;

export const zEnvironmentGroupBundle = z.object({
  id: zBiomesId,
  creatorId: zBiomesId,
  name: z.string(),
  description: z.string().optional(),
  imageUrls: zImageUrls.optional(),
  gltfURL: z.string().optional(),
  tensor: z.string().optional(),
  box: zBox.optional(),
  placeableIds: zBiomesId.array().optional(),
  deleted: z.boolean().optional(),
  iced: z.boolean().optional(),
});

export type EnvironmentGroupBundle = z.infer<typeof zEnvironmentGroupBundle>;

export const zEnvironmentGroupBundleFeed = z.object({
  environmentGroupBundles: zEnvironmentGroupBundle.array(),
  pagingToken: z.string().optional(),
});

export type EnvironmentGroupBundleFeed = z.infer<
  typeof zEnvironmentGroupBundleFeed
>;

export const zTaggedUserBundle = z.object({
  kind: z.literal("user"),
  bundle: zUserBundle,
  ndcCoordinates: zVec3f.optional(),
  imageCoordinates: zVec3f.optional(),
  position: zVec3f.optional(),
});

export type TaggedUserBundle = z.infer<typeof zTaggedUserBundle>;

export const zTaggedEnvironmentGroupBundle = z.object({
  kind: z.literal("environment_group"),
  bundle: zEnvironmentGroupBundle,
});

export const zLandBundle = z.object({
  id: zBiomesId,
  creatorId: zBiomesId,
  robotId: zBiomesId,
});
export type LandBundle = z.infer<typeof zLandBundle>;

export type TaggedEnvironmentGroupBundle = z.infer<
  typeof zTaggedEnvironmentGroupBundle
>;

export const zTaggedLandBundle = z.object({
  kind: z.literal("land"),
  bundle: zLandBundle,
});

export type TaggedLandBundle = z.infer<typeof zTaggedLandBundle>;

export const zCommentBundle = z.object({
  user: zUserBundle,
  comment: z.string(),
  commentId: zBiomesId,
});

export type CommentBundle = z.infer<typeof zCommentBundle>;

export const zBatchCommentBundle = z.object({
  comments: zCommentBundle.array(),
  pagingToken: z.string().optional(),
});

export type BatchCommentBundle = z.infer<typeof zBatchCommentBundle>;

export const zSocialBundle = z.object({
  commentBundle: zBatchCommentBundle,
  numComments: z.number(),
  numLikes: z.number(),
  isLikedByQuerier: z.boolean(),
});

export const zSocialDocumentType = z.enum(["post", "environment_group"]);

export type SocialDocumentType = z.infer<typeof zSocialDocumentType>;

export const zTaggedObjectBundle = z.discriminatedUnion("kind", [
  zTaggedUserBundle,
  zTaggedEnvironmentGroupBundle,
  zTaggedLandBundle,
]);
export type TaggedObjectBundle = z.infer<typeof zTaggedObjectBundle>;

export const zWarpInfo = z.object({
  destination: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("entity"),
      entityId: zBiomesId,
    }),
    z.object({
      kind: z.literal("coordinates"),
      coordinates: zVec3f,
    }),
  ]),
});

export type WarpInfo = z.infer<typeof zWarpInfo>;

export const zFeedPostBundle = zSocialBundle.extend({
  id: zBiomesId,
  userId: zBiomesId,
  author: zUserBundle,
  imageUrls: zImageUrls,
  createMs: z.number(),
  metadata: zShotMetadata.optional(),
  caption: z.string().optional(),
  taggedObjects: zTaggedObjectBundle.array(),
  allowWarping: z.boolean(),
  numWarps: z.number(),
  isWarpedByQuerier: z.boolean(),
  warpInfo: zWarpInfo.optional(),
  minigame: zMinigameDetail.optional(),
});

export type FeedPostBundle = z.infer<typeof zFeedPostBundle>;

export const zPostsFeed = z.object({
  posts: zFeedPostBundle.array(),
  pagingToken: z.string().optional(),
});

export type PostsFeed = z.infer<typeof zPostsFeed>;

export const zCuratedFeedPostBundle = z.object({
  id: zBiomesId,
  approved: z.boolean(),
  priority: z.number(),
  post: zFeedPostBundle,
});

export type CuratedFeedPostBundle = z.infer<typeof zCuratedFeedPostBundle>;

export const zCuratedPostsFeed = z.object({
  posts: zCuratedFeedPostBundle.array(),
  pagingToken: z.string().optional(),
});

export type CuratedPostsFeed = z.infer<typeof zCuratedPostsFeed>;

export const zGroupDetailBundle = zSocialBundle.extend({
  id: zBiomesId,
  name: z.string().optional(),
  description: z.string().optional(),
  imageUrls: zImageUrls,
  ownerBiomesUser: zUserBundle.optional(),
  warpPosition: zVec3f.optional(),
  warpOrientation: zVec2f.optional(),
  allowWarping: z.boolean(),
  numWarps: z.number(),
  isWarpedByQuerier: z.boolean(),
  warpInfo: zWarpInfo.optional(),
  tensor: z.string().optional(),
  placeableIds: zBiomesId.array().optional(),
  createMs: z.number(),
  gltfURL: z.string().optional(),
});

export type GroupDetailBundle = z.infer<typeof zGroupDetailBundle>;

export const zBasePostTaggedObject = z.object({
  ndcCoordinates: zVec3f.optional(),
  imageCoordinates: zVec3f.optional(),
  position: zVec3f.optional(),
});

export const zPostTaggedUser = zBasePostTaggedObject.extend({
  id: zBiomesId.annotate(entityIdSymbol, true),
  kind: z.literal("user"),
  wearing: z.string().annotate(bagAsStringSymbol, true).optional(),
});

export const zPostTaggedLand = zBasePostTaggedObject.extend({
  id: zBiomesId.annotate(entityIdSymbol, true),
  kind: z.literal("land"),
  creatorId: zBiomesId,
  robotId: zBiomesId,
});

export const zPostTaggedEntity = zBasePostTaggedObject.extend({
  id: zBiomesId.annotate(entityIdSymbol, true),
  kind: z.literal("entity"),
  biscuitId: zBiomesId
    .annotate(itemIdSymbol, true)
    .annotate(defaultSchemaPathSymbol, "/")
    .optional(),
  wearing: z.string().annotate(bagAsStringSymbol, true).optional(),
});

export const zPostTaggedBuild = zBasePostTaggedObject.extend({
  id: zBiomesId,
  kind: z.literal("environment_group"),
});

export const zPostTaggedObject = z.discriminatedUnion("kind", [
  zPostTaggedUser,
  zPostTaggedBuild,
  zPostTaggedEntity,
  zPostTaggedLand,
]);

export type PostTaggedObject = z.infer<typeof zPostTaggedObject>;

export const zMapSocialData = z.object({
  recentPhotoPositions: z.array(z.tuple([zBiomesId, zVec3f])).optional(),
});

export type MapSocialData = z.infer<typeof zMapSocialData>;

export const zWorldMapMetadataResponse = z.object({
  id: z.string(),
  version: z.string(),
  fullImageURL: z.string(),
  fullImageWidth: z.number(),
  fullImageHeight: z.number(),
  fullTileImageURL: z.string(),
  boundsStart: z.tuple([z.number(), z.number()]),
  boundsEnd: z.tuple([z.number(), z.number()]),
  socialData: zMapSocialData,

  tileImageTemplateURL: z.string(),
  tileMaxZoomLevel: z.number(),
  tileMinZoomLevel: z.number(),
  tileSize: z.number(),

  versionIndex: z.record(z.string(), z.number()),
});

export type WorldMapMetadataResponse = z.infer<
  typeof zWorldMapMetadataResponse
>;
