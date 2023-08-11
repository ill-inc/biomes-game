import { zLifetimeStatsType, zOptionalBiomesId } from "@/shared/ecs/gen/types";
import {
  zAddedToInventoryOverflowEvent,
  zBeginTradeEvent,
  zInvitedToTeamEvent,
  zMailSentEvent,
  zMinigameSimpleRaceFinishEvent,
  zPurchaseEvent,
  zRequestToJoinTeamAcceptedEvent,
  zRequestedToJoinTeamEvent,
  zRobotExpiredEvent,
  zRobotInventoryChangeEvent,
  zRobotTransmissionEvent,
} from "@/shared/firehose/events";
import { zItem } from "@/shared/game/item";
import { zBiomesId } from "@/shared/ids";
import { makeZodType } from "@/shared/zrpc/custom_types";
import { z } from "zod";

export const zTextMessage = z.object({
  kind: z.literal("text"),
  content: z.string(),
});
export type TextMessage = z.infer<typeof zTextMessage>;

export const zErrorMessage = z.object({
  kind: z.literal("error"),
  content: z.string(),
});
export type ErrorMessage = z.infer<typeof zErrorMessage>;

export const zEmoteMessageEmoteType = z.enum([
  "applause",
  "dance",
  "drink",
  "eat",
  "flex",
  "laugh",
  "point",
  "sit",
  "warp",
  "warpHome",
  "wave",
]);
export type EmoteMessageEmoteType = z.infer<typeof zEmoteMessageEmoteType>;

export const zEmoteMessage = z.object({
  kind: z.literal("emote"),
  emote_type: zEmoteMessageEmoteType,
});
export type EmoteMessage = z.infer<typeof zEmoteMessage>;

export const zWarpMessage = z.object({
  kind: z.literal("warp"),
  documentType: z.enum(["post", "environment_group"]),
  documentId: zBiomesId,
});
export type WarpMessage = z.infer<typeof zWarpMessage>;

export const zCatchMessage = z.object({
  kind: z.literal("catch"),
  contentsString: z.string(),
});

export type CatchMessage = z.infer<typeof zCatchMessage>;

// This is distinct (but related to) the DamageSource type so that we can
// resolve references to entity Ids before sending a chat message out.
export const zDeathReason = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("unknown") }),
  z.object({ kind: z.literal("fall"), distance: z.number() }),
  z.object({ kind: z.literal("attack"), attacker: z.string() }),
  z.object({ kind: z.literal("drown") }),
  z.object({ kind: z.literal("suicide") }),
  z.object({ kind: z.literal("fire") }),
  z.object({ kind: z.literal("despawnWand") }),
  z.object({ kind: z.literal("block"), biscuitId: zBiomesId }),
]);
export type DeathReason = z.infer<typeof zDeathReason>;

export const zDeathMessage = z.object({
  kind: z.literal("death"),
  deathReason: zDeathReason.optional(),
});
export type DeathMessage = z.infer<typeof zDeathMessage>;

export const zPhotoMessage = z.object({
  kind: z.literal("photo"),
  postId: zBiomesId,
});
export type PhotoMessage = z.infer<typeof zPhotoMessage>;

export const zGroupMintMessage = z.object({
  kind: z.literal("group_create"),
  groupId: zBiomesId,
});
export type GroupMintMessage = z.infer<typeof zGroupMintMessage>;

export const zTypingMessage = z.object({
  kind: z.literal("typing"),
});
export type TypingMessage = z.infer<typeof zTypingMessage>;

export const zFollowUserMessage = z.object({
  kind: z.literal("follow"),
  targetId: zBiomesId,
});
export type FollowUserMessage = z.infer<typeof zFollowUserMessage>;

export const zLikeMessage = z.object({
  kind: z.literal("like"),
  documentType: z.enum(["post", "environment_group"]),
  documentId: zBiomesId,
});

export type LikeMessage = z.infer<typeof zLikeMessage>;

export const zCommentMessage = z.object({
  kind: z.literal("comment"),
  documentType: z.enum(["post", "environment_group"]),
  documentId: zBiomesId,
  comment: z.string(),
});

export type CommentMessage = z.infer<typeof zCommentMessage>;

export const zTagMessage = z.object({
  kind: z.literal("tag"),
  documentType: z.enum(["post", "environment_group", "land"]),
  documentId: zBiomesId,
});

const zBigInt = makeZodType(BigInt);

export type TagMessage = z.infer<typeof zTagMessage>;
export const zRoyaltyMessage = z.object({
  kind: z.literal("royalty"),
  documentType: z.enum(["post", "environment_group"]),
  documentId: zBiomesId,
  royalty: zBigInt,
});

export type RoyaltyMessage = z.infer<typeof zRoyaltyMessage>;

export const zReadMessage = z.object({
  kind: z.literal("read"),
});

export const zPoppedMessage = z.object({
  kind: z.literal("popped"),
});

export const zWatermarkMessageKinds = z.enum(["read", "popped"]);

export type WatermarkMessageKinds = z.infer<typeof zWatermarkMessageKinds>;

export const WATERMARK_MESSAGE_KINDS = new Set<ChatMessage["kind"]>(
  zWatermarkMessageKinds.options
);

export const zChallengeUnlockMessage = z.object({
  kind: z.literal("challenge_unlock"),
  challengeId: zBiomesId,
});

export type ChallengeUnlockMessage = z.infer<typeof zChallengeUnlockMessage>;

export const zChallengeCompleteMessage = z.object({
  kind: z.literal("challenge_complete"),
  challengeId: zBiomesId,
});

export type ChallengeCompleteMessage = z.infer<
  typeof zChallengeCompleteMessage
>;

export const zRecipeUnlockMessage = z.object({
  kind: z.literal("recipe_unlock"),
  recipe: zItem,
});

export const zPurchaseMessage = zPurchaseEvent;
export type PurchaseMessage = z.infer<typeof zPurchaseMessage>;

export const zMinigameJoinMessage = z.object({
  kind: z.literal("minigame_join"),
  minigameId: zBiomesId,
});
export type MinigameJoinMessage = z.infer<typeof zMinigameJoinMessage>;

export const zMinigameSimpleRaceFinishMessage = zMinigameSimpleRaceFinishEvent;
export type MinigameSimpleRaceFinishMessage = z.infer<
  typeof zMinigameSimpleRaceFinishMessage
>;

export const zNewSessionMessage = z.object({
  kind: z.literal("new_session"),
});
export type NewSessionMessage = z.infer<typeof zNewSessionMessage>;

export const zMetaquestPointsMessage = z.object({
  kind: z.literal("metaquest_points"),
  points: z.number(),
  player: zBiomesId,
  team: zOptionalBiomesId,
  metaquest: zBiomesId,
});
export type MetaquestPointsMessage = z.infer<typeof zMetaquestPointsMessage>;

export const zItemDiscoveryMessage = z.object({
  kind: z.literal("discovery"),
  statsType: zLifetimeStatsType,
  items: zItem.array(),
});
export type ItemDiscoveryMessage = z.infer<typeof zItemDiscoveryMessage>;

export const zEnterMyRobotMessage = z.object({
  kind: z.literal("enter_my_robot"),
  visitorId: zBiomesId,
});
export type EnterMyRobotMessage = z.infer<typeof zEnterMyRobotMessage>;

export const zRobotVisitorMessage = z.object({
  kind: z.literal("robotVisitorMessage"),
  robotId: zBiomesId,
  visitorId: zBiomesId,
  message: z.string(),
});
export type RobotVisitorMessage = z.infer<typeof zRobotVisitorMessage>;

export const zJoinedMyTeamMessage = z.object({
  kind: z.literal("joined_my_team"),
  player: zBiomesId,
  teamId: zBiomesId,
});
export type JoinedMyTeamMessage = z.infer<typeof zJoinedMyTeamMessage>;

export const zCraftingStationRoyaltyMessage = z.object({
  kind: z.literal("crafting_station_royalty"),
  crafterId: zBiomesId,
  craftingStationId: zBiomesId,
  royalty: zBigInt,
});
export type CraftingStationRoyaltyMessage = z.infer<
  typeof zCraftingStationRoyaltyMessage
>;

export const zMinigameRoyaltyMessage = z.object({
  kind: z.literal("minigame_royalty"),
  joinerId: zBiomesId,
  minigameId: zBiomesId,
  royalty: zBigInt,
});
export type MinigameRoyaltyMessage = z.infer<typeof zMinigameRoyaltyMessage>;

export const zMailReceivedMessage = z.object({
  kind: z.literal("mailReceived"),
  sender: zBiomesId,
});
export type MailReceivedMessage = z.infer<typeof zMailReceivedMessage>;

export const zChatMessage = z.discriminatedUnion("kind", [
  zTextMessage,
  zErrorMessage,
  zEmoteMessage,
  zWarpMessage,
  zDeathMessage,
  zPhotoMessage,
  zGroupMintMessage,
  zTypingMessage,
  zFollowUserMessage,
  zLikeMessage,
  zCommentMessage,
  zTagMessage,
  zRoyaltyMessage,
  zReadMessage,
  zPoppedMessage,
  zChallengeUnlockMessage,
  zChallengeCompleteMessage,
  zRecipeUnlockMessage,
  zPurchaseMessage,
  zNewSessionMessage,
  zCatchMessage,
  zMinigameSimpleRaceFinishMessage,
  zMinigameJoinMessage,
  zMetaquestPointsMessage,
  zItemDiscoveryMessage,
  zEnterMyRobotMessage,
  zRobotVisitorMessage,
  zJoinedMyTeamMessage,
  zCraftingStationRoyaltyMessage,
  zMinigameRoyaltyMessage,
  zMailReceivedMessage,

  // Firehose forwarding
  zInvitedToTeamEvent,
  zRobotInventoryChangeEvent,
  zRobotExpiredEvent,
  zRobotTransmissionEvent,
  zRequestToJoinTeamAcceptedEvent,
  zBeginTradeEvent,
  zRequestedToJoinTeamEvent,
  zAddedToInventoryOverflowEvent,
  zMailSentEvent,
]);

export type ChatMessage = z.infer<typeof zChatMessage>;

export const TRANSIENT_MESSAGE_KINDS = new Set<ChatMessage["kind"]>(["typing"]);
