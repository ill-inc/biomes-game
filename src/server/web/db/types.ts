import type { ForeignAuthProviderName } from "@/server/shared/auth/providers";
import { zSpecialRoles } from "@/shared/acl_types";
import { zVec3f } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { zVec2f } from "@/shared/math/types";
import { zPostTaggedObject, zShotMetadata } from "@/shared/types";
import { zCloudBucketKey, zImageCloudBundle } from "@/shared/url_types";
import type { ZodStringDef, ZodType } from "zod";
import { z } from "zod";

export const FIREBASE_MAX_WHERE_IN_SIZE = 10;

export type WithId<T, IdT = BiomesId> = T & { id: IdT };

// Users
export const zFirestoreUserData = z.object({
  username: z.string().optional(),

  inviteCode: z.string().optional(),

  numFollowers: z.number(),
  numPhotos: z.number(),
  numFollowing: z.number(),
  //specialRoles: zFirestoreUserRole.array().optional(),

  profilePicCloudBucket: zCloudBucketKey.optional(),
  profilePicCloudImageLocations: zImageCloudBundle.optional(),
  profilePicHash: z.string().optional(),

  homeLocation: zVec3f.optional(),
  createMs: z.number().optional(),

  disabled: z.boolean().optional(),
});

export type FirestoreUserData = z.infer<typeof zFirestoreUserData>;

export const zFirestoreUsernamesData = z.object({
  userId: zBiomesId,
});

export type FirestoreUser = WithId<FirestoreUserData, BiomesId>;

// User sessions
export const zFirestoreSessionData = z.object({
  userId: zBiomesId,
  createMs: z.number(),
  gremlin: z.boolean().default(false),
  roleOverrides: zSpecialRoles.array().optional(),
});

export type FirestoreSessionData = z.infer<typeof zFirestoreSessionData>;

export type FirestoreSession = WithId<FirestoreSessionData, string>;

// User authentication link.
export const zFirestoreUserAuthLinkData = z.object({
  kind: z.string() as ZodType<
    `foreign:${ForeignAuthProviderName}`,
    ZodStringDef
  >,
  userId: zBiomesId,
  profile: z.record(z.union([z.string(), z.boolean()])),
});

export type FirestoreUserAuthLinkData = z.infer<
  typeof zFirestoreUserAuthLinkData
>;

export type FirestoreUserAuthLink = WithId<FirestoreUserAuthLinkData, string>;

export const zFirestoreUserFollow = z.object({
  createMs: z.number(),
});

export type FirestoreUserFollow = z.infer<typeof zFirestoreUserFollow>;

export const zFirestoreUserFollowedBy = z.object({
  createMs: z.number(),
});

export type FirestoreUserFollowedBy = z.infer<typeof zFirestoreUserFollowedBy>;

export const zFirestoreIdGenerator = z.object({
  next: z.number(),
});

export const zFirestoreWebPushToken = z.object({});

// Invite Codes
export const zFirestoreInviteCode = z.object({
  ownerId: zBiomesId.optional(),
  numTimesUsed: z.number(),
  maxUses: z.number().default(1),

  createMemo: z.string().optional(),

  lastUsedAtMs: z.number().optional(),
  lastUsedByUserId: zBiomesId.optional(),
  createdAtMs: z.number(),
});

export type FirestoreInviteCode = z.infer<typeof zFirestoreInviteCode>;

// Feed

export const zFirestoreMedia = z.object({
  cloudBucket: zCloudBucketKey,
  cloudImageLocations: zImageCloudBundle,
  metadata: zShotMetadata.optional(),
  caption: z.string().optional(),
});

export const zFirestoreFeedPost = z.object({
  userId: zBiomesId,
  createMs: z.number(),

  deleted: z.boolean().optional(),
  tagged: zPostTaggedObject.array().optional(),
  media: zFirestoreMedia.array().optional(),

  // Likes
  likes: z.number(),

  // Comments
  comments: z.number(),

  // Warps
  warps: z.number(),
  portalEntityId: zBiomesId.optional(),
});

export type FirestoreFeedPost = z.infer<typeof zFirestoreFeedPost>;

// Curated feed posts.
export const zFirestoreCuratedFeedPost = z.object({
  priority: z.number(),
  approved: z.boolean(),
});

export type FirestoreCuratedFeedPost = z.infer<
  typeof zFirestoreCuratedFeedPost
>;

export const zFirestoreDocumentComment = z.object({
  userId: zBiomesId,
  createMs: z.number(),
  comment: z.string(),
  nonce: z.number().optional(),
});

export type FirestoreDocumentComment = z.infer<
  typeof zFirestoreDocumentComment
>;

export const zFirestoreDocumentLike = z.object({
  createMs: z.number(),
});

export type FirestoreDocumentLike = z.infer<typeof zFirestoreDocumentLike>;

export const zFirestoreDocumentWarp = z.object({
  createMs: z.number(),
});

export type FirestoreDocumentWarp = z.infer<typeof zFirestoreDocumentWarp>;

// Environment Group

export const zGroupState = z.enum(["unconfirmed", "confirmed", "failed"]);

export type GroupState = z.infer<typeof zGroupState>;

export const zFirestoreEnvironmentGroup = z.object({
  creatorId: zBiomesId,
  createMs: z.number(),
  state: zGroupState.optional(),

  name: z.string(),
  description: z.string().optional(),
  deleted: z.boolean().optional(),

  creationPostId: zBiomesId.optional(),

  cloudBucket: zCloudBucketKey,
  cloudGLTFPath: z.string(),
  cloudImageLocations: zImageCloudBundle.optional(), // TODO: run migration and make required

  materialIndexes: z.number().array().optional(),
  materialCounts: z.number().array().optional(),
});

export type FirestoreEnvironmentGroup = z.infer<
  typeof zFirestoreEnvironmentGroup
>;

// World Map

export const zFirestoreWorldMap = z.object({
  version: z.number(),
  updatedAt: z.number(),

  boundsStart: zVec2f,
  boundsEnd: zVec2f,

  cloudBucket: zCloudBucketKey,
  webPFullKey: z.string(),
  webPFullTileKey: z.string(),
  webPFullWidth: z.number(),
  webPFullHeight: z.number(),

  materialCounts: z.record(z.string(), z.number()).optional(),

  socialBlobUpdatedAt: z.number().optional(),
  socialBlobVersion: z.number().optional(),
  socialBlob: z.string().optional(),

  tileWebPTemplateKey: z.string(),
  tileMinZoomLevel: z.number(),
  tileMaxZoomLevel: z.number(),
  tileSize: z.number(),
});

export type FirestoreWorldMap = z.infer<typeof zFirestoreWorldMap>;

// Server Running Tasks

export const zFirestoreServerTask = z.object({
  id: z.string(),

  originUserId: zBiomesId.optional(),

  taskNodeName: z.string(),
  taskNodeFailureCount: z.number(),
  taskNodeAvailableStartTime: z.number(),
  taskNodeSerializedState: z.string(),
  taskNodeStartTime: z.number(),

  createdAt: z.number(),
  finished: z.boolean(),
  finishReason: z.enum([
    "none",
    "fail_too_many_retries",
    "fail_permanent",
    "success",
  ]),

  processorId: z.string().optional(),
  processorExpiry: z.number(),
});

export type FirestoreServerTask = z.infer<typeof zFirestoreServerTask>;

export const zFirestoreServerTaskLogItem = z.object({
  kind: z.enum(["attempt_start", "attempt_error", "task_failure", "finished"]),
  memo: z.string().optional(),
  attemptNumber: z.number().optional(),

  taskNodeName: z.string(),
  taskSerializedState: z.string().optional(),

  processorId: z.string().optional(),
  timestamp: z.number(),
});

export type FirestoreServerTaskLogItem = z.infer<
  typeof zFirestoreServerTaskLogItem
>;

// Tweaks.

export const zTweakBlob = z.object({
  blob: z.string(),
});

export type TweakBlob = z.infer<typeof zTweakBlob>;
