import { zItemAndCount, zLifetimeStatsType } from "@/shared/ecs/gen/types";
import { zItem } from "@/shared/game/item";
import { zCameraMode } from "@/shared/game/types";
import {
  blueprintIdSymbol,
  cameraModeSymbol,
  itemIdSymbol,
  minigameIdSymbol,
  npcTypeIdSsymbol,
  questGiverSymbol,
  seedIdSymbol,
  shapeStringSymbol,
  zBagAsString,
} from "@/shared/game/zod_symbols";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { zVec3f } from "@/shared/math/types";
import { zPostTaggedObject } from "@/shared/types";
import type { ZodType, ZodTypeAny } from "zod";
import { z } from "zod";

export const firehoseBooleanSymbol = Symbol.for("firehoseBoolean");
export const zFirehoseBoolean = z
  .boolean()
  .annotate(firehoseBooleanSymbol, true);

export function isBooleanTypeSchema(
  schema: ZodTypeAny
): schema is ZodType<boolean> {
  return !!schema.annotations?.[firehoseBooleanSymbol];
}

export const zNewSession = z.object({
  kind: z.literal("newSession"),
  entityId: zBiomesId,
});

export type NewSession = z.infer<typeof zNewSession>;

export const zWarpEvent = z.object({
  kind: z.literal("warp"),
  entityId: zBiomesId,
});

export type WarpEvent = z.infer<typeof zWarpEvent>;

export const zFollowEvent = z.object({
  kind: z.literal("follow"),
  entityId: zBiomesId,
});

export type FollowEvent = z.infer<typeof zFollowEvent>;

export const zLikeEvent = z.object({
  kind: z.literal("like"),
  entityId: zBiomesId,
});

export type LikeEvent = z.infer<typeof zLikeEvent>;

export const zReceiveLikeEvent = z.object({
  kind: z.literal("receiveLike"),
  entityId: zBiomesId,
});

export type ReceiveLikeTrigger = z.infer<typeof zReceiveLikeEvent>;

export const zPostPhotoEvent = z.object({
  kind: z.literal("postPhoto"),
  entityId: zBiomesId,
  people: z.number(),
  groups: z.number(),
  groupIds: zBiomesId.array(),
  lands: z.number(),
  landOwnerIds: zBiomesId.array(),
  taggedObjects: zPostTaggedObject.array(),
  cameraMode: zCameraMode.annotate(cameraModeSymbol, true),
});

export type PostPhotoEvent = z.infer<typeof zPostPhotoEvent>;

export const zInPhotoEvent = z.object({
  kind: z.literal("inPhoto"),
  entityId: zBiomesId,
});

export type InPhotoEvent = z.infer<typeof zInPhotoEvent>;

export const zInspectPlayerEvent = z.object({
  kind: z.literal("inspectPlayer"),
  entityId: zBiomesId,
});

export type InspectPlayerEvent = z.infer<typeof zInspectPlayerEvent>;

export const zDmEvent = z.object({
  kind: z.literal("dm"),
  entityId: zBiomesId,
});

export type DmEvent = z.infer<typeof zDmEvent>;

export const zCollectEvent = z.object({
  kind: z.literal("collect"),
  entityId: zBiomesId,
  mined: zFirehoseBoolean.default(false),
  bag: zBagAsString,
});

export type CollectEvent = z.infer<typeof zCollectEvent>;

export const zCraftEvent = z.object({
  kind: z.literal("craft"),
  entityId: zBiomesId,
  bag: zBagAsString,
  station: zBiomesId.annotate(itemIdSymbol, true).optional(), // This is the station 'type id' (item id)
  stationEntityId: zBiomesId.optional(),
  royaltyAmount: z.bigint().optional(),
  royaltyTo: zBiomesId.optional(),
});

export type CraftEvent = z.infer<typeof zCraftEvent>;

export const zSkillLevelUpEvent = z.object({
  kind: z.literal("skillLevelUp"),
  entityId: zBiomesId,
  skill: z.string(),
  level: z.number(),
});

export type SkillLevelUpEvent = z.infer<typeof zSkillLevelUpEvent>;

export const zCompleteQuestStepAtEntityEvent = z.object({
  kind: z.literal("completeQuestStepAtEntity"),
  entityId: zBiomesId,
  challenge: zBiomesId,
  stepId: zBiomesId.optional(),
  chosenRewardIndex: z.number().optional(),
  claimFromEntityId: zBiomesId.annotate(questGiverSymbol, true),
});

export type CompleteQuestStepAtEntityEvent = z.infer<
  typeof zCompleteQuestStepAtEntityEvent
>;

export const zCompleteQuestStepAtMyRobot = z.object({
  kind: z.literal("completeQuestStepAtMyRobot"),
  entityId: zBiomesId,
  challenge: zBiomesId,
  stepId: zBiomesId.optional(),
  chosenRewardIndex: z.number().optional(),
});

export type CompleteQuestStepAtMyRobotEvent = z.infer<
  typeof zCompleteQuestStepAtMyRobot
>;

export const zChallengeUnlockedEvent = z.object({
  kind: z.literal("challengeUnlocked"),
  entityId: zBiomesId,
  challenge: zBiomesId,
});

export type ChallengeUnlockedEvent = z.infer<typeof zChallengeUnlockedEvent>;

export const zChallengeCompletedEvent = z.object({
  kind: z.literal("challengeCompleted"),
  entityId: zBiomesId,
  challenge: zBiomesId,
  teamId: zBiomesId.optional(),
});

export type ChallengeCompletedEvent = z.infer<typeof zChallengeCompletedEvent>;

export const zRecipeUnlockedEvent = z.object({
  kind: z.literal("recipeUnlocked"),
  entityId: zBiomesId,
  recipe: zItem,
});

export type RecipeUnlockedEvent = z.infer<typeof zRecipeUnlockedEvent>;

export const zWearingEvent = z.object({
  kind: z.literal("wearing"),
  entityId: zBiomesId,
  bag: zBagAsString,
});

export type WearingEvent = z.infer<typeof zWearingEvent>;

export const zShapeBlockEvent = z.object({
  kind: z.literal("shapeBlock"),
  entityId: zBiomesId,
  shapeName: z.string().annotate(shapeStringSymbol, true),
  position: zVec3f,
});

export type ShapeBlockEvent = z.infer<typeof zShapeBlockEvent>;

export const zBlockDestroyEvent = z.object({
  kind: z.literal("blockDestroy"),
  entityId: zBiomesId,
  block: zItem,
  position: zVec3f,
  tool: zItem.optional(),
});

export type BlockDestroyEvent = z.infer<typeof zBlockDestroyEvent>;

export const zPlaceEvent = z.object({
  kind: z.literal("place"),
  entityId: zBiomesId,
  item: zItem,
  position: zVec3f,
});

export type PlaceEvent = z.infer<typeof zPlaceEvent>;

export const zNpcKilledEvent = z.object({
  kind: z.literal("npcKilled"),
  entityId: zBiomesId,
  npcTypeId: zBiomesId
    .annotate(itemIdSymbol, true)
    .annotate(npcTypeIdSsymbol, true),
});

export type NpcKilledEvent = z.infer<typeof zNpcKilledEvent>;

export const zBlueprintBuiltEvent = z.object({
  kind: z.literal("blueprintBuilt"),
  entityId: zBiomesId,
  blueprint: zBiomesId
    .annotate(itemIdSymbol, true)
    .annotate(blueprintIdSymbol, true),
  position: zVec3f,
});

export type BlueprintBuiltEvent = z.infer<typeof zBlueprintBuiltEvent>;

export const zPurchaseEvent = z.object({
  kind: z.literal("purchase"),
  entityId: zBiomesId,
  seller: zBiomesId.annotate(questGiverSymbol, true),
  bag: zBagAsString,
  payment: zBagAsString,
});

export type PurchaseEvent = z.infer<typeof zPurchaseEvent>;

export const zMapBeamRemoveEvent = z.object({
  kind: z.literal("mapBeamRemove"),
  entityId: zBiomesId,
  entityLocation: zVec3f,
  clientBeamId: z.number(),
});

export type MapBeamRemoveEvent = z.infer<typeof zMapBeamRemoveEvent>;

export const zRobotInventoryChangeEvent = z.object({
  kind: z.literal("robotInventoryChanged"),
  entityId: zBiomesId, // Robot id
  itemsGained: z.array(zItemAndCount),
  itemsLost: z.array(zItemAndCount),
});

export type RobotInventoryChangeEvent = z.infer<
  typeof zRobotInventoryChangeEvent
>;

export const zRobotFeedEvent = z.object({
  kind: z.literal("robotFeed"),
  entityId: zBiomesId,
  position: zVec3f,
  amount: z.bigint(),
});

export type RobotFeedEvent = z.infer<typeof zRobotFeedEvent>;

export const zRobotExpiredEvent = z.object({
  kind: z.literal("robotExpired"),
  entityId: zBiomesId,
  robotId: zBiomesId,
});

export type RobotExpiredEvent = z.infer<typeof zRobotExpiredEvent>;

export const zRobotTransmissionEvent = z.object({
  kind: z.literal("robotTransmission"),
  entityId: zBiomesId,
  count: z.number(),
});

export type RobotTransmissionEvent = z.infer<typeof zRobotTransmissionEvent>;

export const zPickupHandlerEvent = z.object({
  kind: z.literal("pickupHandler"),
  entityId: zBiomesId,
  dropId: zBiomesId,
  bag: zBagAsString,
});

export type PickupHandlerEvent = z.infer<typeof zPickupHandlerEvent>;

export const zChangePictureFrameContents = z.object({
  placerId: zBiomesId.optional(),
  photoId: zBiomesId.optional(),
  minigameId: zBiomesId.optional(),
});
export type ChangePictureFrameContents = z.infer<
  typeof zChangePictureFrameContents
>;

export const zChangePictureFrameContentsEvent = z.object({
  kind: z.literal("changePictureFrameContents"),
  entityId: zBiomesId,
  frameEntityId: zBiomesId,
  position: zVec3f,
  old: zChangePictureFrameContents,
  new: zChangePictureFrameContents,
});

export type ChangePictureFrameEvent = z.infer<
  typeof zChangePictureFrameContentsEvent
>;

export const zWarpHomeDestination = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("starter_location"),
  }),
  z.object({
    kind: z.literal("robot"),
    robotId: zBiomesId,
  }),
  z.object({
    kind: z.literal("minigame"),
    minigameId: zBiomesId.optional(),
  }),
]);

export type WarpHomeDestination = z.infer<typeof zWarpHomeDestination>;

export const zUseHomestoneEvent = z.object({
  kind: z.literal("useHomestone"),
  entityId: zBiomesId,
  destination: zWarpHomeDestination,
});

export type UseHomestoneEvent = z.infer<typeof zUseHomestoneEvent>;

export const zWarpPostEvent = z.object({
  kind: z.literal("warpPost"),
  entityId: zBiomesId,
  postId: zBiomesId,
});

export type WarpPostEvent = z.infer<typeof zWarpPostEvent>;

export const zFireHealEvent = z.object({
  kind: z.literal("fireHeal"),
  entityId: zBiomesId,
});

export type FireHealEvent = z.infer<typeof zFireHealEvent>;

export const zFishedEvent = z.object({
  kind: z.literal("fished"),
  entityId: zBiomesId,
  bag: zBagAsString,
});
export type FishedEvent = z.infer<typeof zFishedEvent>;

export const zMinigameSimpleRaceFinishEvent = z.object({
  kind: z.literal("minigame_simple_race_finish"),
  entityId: zBiomesId,
  minigameCreatorId: zBiomesId,
  minigameId: zBiomesId.annotate(minigameIdSymbol, true),
  minigameInstanceId: zBiomesId,
  startTime: z.number(),
  finishTime: z.number(),
  duration: z.number(),
});

export type MinigameSimpleRaceFinish = z.infer<
  typeof zMinigameSimpleRaceFinishEvent
>;

export const zConsumeEvent = z.object({
  kind: z.literal("consume"),
  entityId: zBiomesId,
  item: zItem,
});

export type ConsumeEvent = z.infer<typeof zConsumeEvent>;

export const zWaterPlantEvent = z.object({
  kind: z.literal("waterPlant"),
  entityId: zBiomesId,
  seed: zBiomesId.annotate(itemIdSymbol, true).annotate(seedIdSymbol, true),
  amount: z.number(),
});

export type WaterPlantEvent = z.infer<typeof zWaterPlantEvent>;

export const zPlantSeedEvent = z.object({
  kind: z.literal("plantSeed"),
  entityId: zBiomesId,
  seed: zBiomesId.annotate(itemIdSymbol, true).annotate(seedIdSymbol, true),
});

export type PlantSeedEvent = z.infer<typeof zPlantSeedEvent>;

export const zSellToEntityEvent = z.object({
  kind: z.literal("sell_to_entity"),
  entityId: zBiomesId,
  buyerId: zBiomesId.annotate(questGiverSymbol, true),
  bag: zBagAsString,
});

export type SellToEntityEvent = z.infer<typeof zSellToEntityEvent>;

export const zGrowSeedEvent = z.object({
  kind: z.literal("growSeed"),
  entityId: zBiomesId,
  seed: zBiomesId.annotate(itemIdSymbol, true).annotate(seedIdSymbol, true),
  plant: zBiomesId,
});

export type GrowSeedEvent = z.infer<typeof zGrowSeedEvent>;

export const zUpdateRobotNameEvent = z.object({
  kind: z.literal("updateRobotName"),
  entityId: zBiomesId,
  robotId: zBiomesId,
  newName: z.string().optional(),
});

export type UpdateRobotNameEvent = z.infer<typeof zUpdateRobotNameEvent>;

export const zAdminExecuteEvent = z.object({
  kind: z
    .literal("adminExecute")
    .describe("Event not intended to be fired. Used for testing."),
  entityId: zBiomesId,
});
export type AdminExecuteEvent = z.infer<typeof zAdminExecuteEvent>;

export const zInvitedToTeamEvent = z.object({
  kind: z.literal("invitedToTeam"),
  entityId: zBiomesId,
  teamId: zBiomesId,
  inviterId: zBiomesId,
});

export type InvitedToTeamEvent = z.infer<typeof zInvitedToTeamEvent>;

export const zRequestToJoinTeamEvent = z.object({
  kind: z.literal("requestToJoinTeam"),
  entityId: zBiomesId,
  teamId: zBiomesId,
});

export type RequestToJoinTeamEvent = z.infer<typeof zRequestToJoinTeamEvent>;

export const zRequestedToJoinTeamEvent = z.object({
  kind: z.literal("requestedToJoinTeam"),
  entityId: zBiomesId,
  teamId: zBiomesId,
});

export type RequestedToJoinTeamEvent = z.infer<
  typeof zRequestedToJoinTeamEvent
>;

export const zCancelRequestToJoinTeamEvent = z.object({
  kind: z.literal("cancelRequestToJoinTeam"),
  entityId: zBiomesId,
  teamId: zBiomesId,
});

export type CancelRequestToJoinTeamEvent = z.infer<
  typeof zCancelRequestToJoinTeamEvent
>;

export const zRespondToJoinTeamRequestEvent = z.object({
  kind: z.literal("respondToJoinTeamRequest"),
  entityId: zBiomesId,
  teamId: zBiomesId,
  response: z.literal("accept").or(z.literal("decline")),
});

export type RespondToJoinTeamRequestEvent = z.infer<
  typeof zRespondToJoinTeamRequestEvent
>;

export const zRequestToJoinTeamAcceptedEvent = z.object({
  kind: z.literal("requestToJoinTeamAccepted"),
  entityId: zBiomesId,
  teamId: zBiomesId,
});

export type RequestToJoinTeamAcceptedEvent = z.infer<
  typeof zRequestToJoinTeamAcceptedEvent
>;

export const zInviteeAcceptedInviteEvent = z.object({
  kind: z.literal("inviteeAcceptedInvite"),
  entityId: zBiomesId,
  teamId: zBiomesId,
  inviteeId: zBiomesId,
});

export type InviteeAcceptedInviteEvent = z.infer<
  typeof zInviteeAcceptedInviteEvent
>;

export const zPlayerJoinedTeamEvent = z.object({
  kind: z.literal("joinedTeam"),
  entityId: zBiomesId,
  teamId: zBiomesId,
});

export type PlayerJoinedTeamEvent = z.infer<typeof zPlayerJoinedTeamEvent>;

export const zMetaquestPointsEvent = z.object({
  kind: z.literal("metaquestPoints"),
  entityId: zBiomesId,
  teamId: zBiomesId.optional(),
  metaquestId: zBiomesId,
  points: z.number(),
});
export type MetaquestPointsEvent = z.infer<typeof zMetaquestPointsEvent>;

export const zBeginTradeEvent = z.object({
  kind: z.literal("beginTrade"),
  entityId: zBiomesId,
  tradeId: zBiomesId,
  entity2Id: zBiomesId,
});

export type BeginTradeEvent = z.infer<typeof zBeginTradeEvent>;

export const zUserCompletedTrade = z.object({
  kind: z.literal("userCompletedTrade"),
  entityId: zBiomesId,
  tradeId: zBiomesId,
  otherEntityId: zBiomesId,
  sentItems: zBagAsString,
  receivedItems: zBagAsString,
});
export type UserCompletedTrade = z.infer<typeof zUserCompletedTrade>;

export const zEnterRobotFieldEvent = z.object({
  kind: z.literal("enterRobotField"),
  entityId: zBiomesId,
  robotId: zBiomesId,
  robotCreatorId: zBiomesId,
});

export type EnterRobotFieldEvent = z.infer<typeof zEnterRobotFieldEvent>;

export const zAddedToInventoryOverflowEvent = z.object({
  kind: z.literal("overflowedToInbox"),
  entityId: zBiomesId,
  bag: zBagAsString,
});
export type AddedToInventoryOverflowEvent = z.infer<
  typeof zAddedToInventoryOverflowEvent
>;

export const zJoinedMinigameEvent = z.object({
  kind: z.literal("joinedMinigameEvent"),
  entityId: zBiomesId,
  minigameId: zBiomesId,
  royaltyAmount: z.bigint().optional(),
  royaltyTo: zBiomesId.optional(),
});
export type JoinedMinigameEvent = z.infer<typeof zJoinedMinigameEvent>;

export const zDiscoveredEvent = z.object({
  kind: z.literal("discovered"),
  entityId: zBiomesId,
  contents: z.tuple([zLifetimeStatsType, zBiomesId.array()]).array(),
});
export type DiscoveredEvent = z.infer<typeof zDiscoveredEvent>;

export const zAdminProgressQuestStepEvent = z.object({
  kind: z.literal("adminProgressQuestStep"),
  entityId: zBiomesId,
  questId: zBiomesId,
});
export type AdminProgressQuestStepEvent = z.infer<
  typeof zAdminProgressQuestStepEvent
>;

export const zMailSentEvent = z.object({
  kind: z.literal("mailSent"),
  entityId: zBiomesId,
  targetId: zBiomesId,
  bag: zBagAsString,
  isGift: z.boolean().optional(),
});
export type MailSentEvent = z.infer<typeof zMailSentEvent>;

export const zFirehoseEvent = z.discriminatedUnion("kind", [
  // Event types.
  zBlockDestroyEvent,
  zBlueprintBuiltEvent,
  zCompleteQuestStepAtEntityEvent,
  zCompleteQuestStepAtMyRobot,
  zChallengeCompletedEvent,
  zChallengeUnlockedEvent,
  zChangePictureFrameContentsEvent,
  zCollectEvent,
  zCraftEvent,
  zDmEvent,
  zConsumeEvent,
  zFireHealEvent,
  zFishedEvent,
  zFollowEvent,
  zInPhotoEvent,
  zInspectPlayerEvent,
  zLikeEvent,
  zMapBeamRemoveEvent,
  zMinigameSimpleRaceFinishEvent,
  zNewSession,
  zNpcKilledEvent,
  zPickupHandlerEvent,
  zPlaceEvent,
  zPostPhotoEvent,
  zPurchaseEvent,
  zReceiveLikeEvent,
  zRecipeUnlockedEvent,
  zRequestToJoinTeamEvent,
  zRequestedToJoinTeamEvent,
  zRequestToJoinTeamAcceptedEvent,
  zCancelRequestToJoinTeamEvent,
  zRespondToJoinTeamRequestEvent,
  zRobotExpiredEvent,
  zRobotFeedEvent,
  zRobotInventoryChangeEvent,
  zRobotTransmissionEvent,
  zShapeBlockEvent,
  zSkillLevelUpEvent,
  zUseHomestoneEvent,
  zWarpEvent,
  zWarpPostEvent,
  zWearingEvent,
  zWaterPlantEvent,
  zPlantSeedEvent,
  zSellToEntityEvent,
  zGrowSeedEvent,
  zUpdateRobotNameEvent,
  zAdminExecuteEvent,
  zInvitedToTeamEvent,
  zInviteeAcceptedInviteEvent,
  zPlayerJoinedTeamEvent,
  zMetaquestPointsEvent,
  zBeginTradeEvent,
  zUserCompletedTrade,
  zEnterRobotFieldEvent,
  zAddedToInventoryOverflowEvent,
  zJoinedMinigameEvent,
  zDiscoveredEvent,
  zAdminProgressQuestStepEvent,
  zMailSentEvent,
]);

export type FirehoseEvent = z.infer<typeof zFirehoseEvent>;

// All events need an entityId property.
0 as unknown as FirehoseEvent satisfies { entityId: BiomesId };
