// GENERATED: This file is generated from events.ts.j2. Do not modify directly.
// Content Hash: 20d2d168938b16b056b754e62d7c71e8

import * as t from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";

export interface EventSet {
  readonly disconnectPlayerEvent?: DisconnectPlayerEvent[];
  readonly moveEvent?: MoveEvent[];
  readonly idleChangeEvent?: IdleChangeEvent[];
  readonly enterRobotFieldEvent?: EnterRobotFieldEvent[];
  readonly warpEvent?: WarpEvent[];
  readonly warpHomeEvent?: WarpHomeEvent[];
  readonly editEvent?: EditEvent[];
  readonly shapeEvent?: ShapeEvent[];
  readonly farmingEvent?: FarmingEvent[];
  readonly dumpWaterEvent?: DumpWaterEvent[];
  readonly scoopWaterEvent?: ScoopWaterEvent[];
  readonly inventoryCombineEvent?: InventoryCombineEvent[];
  readonly inventorySplitEvent?: InventorySplitEvent[];
  readonly inventorySortEvent?: InventorySortEvent[];
  readonly inventorySwapEvent?: InventorySwapEvent[];
  readonly robotInventorySwapEvent?: RobotInventorySwapEvent[];
  readonly inventoryThrowEvent?: InventoryThrowEvent[];
  readonly inventoryDestroyEvent?: InventoryDestroyEvent[];
  readonly dyeBlockEvent?: DyeBlockEvent[];
  readonly unmuckerEvent?: UnmuckerEvent[];
  readonly internalInventorySetEvent?: InternalInventorySetEvent[];
  readonly inventoryCraftEvent?: InventoryCraftEvent[];
  readonly inventoryDyeEvent?: InventoryDyeEvent[];
  readonly inventoryCookEvent?: InventoryCookEvent[];
  readonly inventoryCompostEvent?: InventoryCompostEvent[];
  readonly inventoryChangeSelectionEvent?: InventoryChangeSelectionEvent[];
  readonly changeCameraModeEvent?: ChangeCameraModeEvent[];
  readonly overflowMoveToInventoryEvent?: OverflowMoveToInventoryEvent[];
  readonly inventoryMoveToOverflowEvent?: InventoryMoveToOverflowEvent[];
  readonly appearanceChangeEvent?: AppearanceChangeEvent[];
  readonly hairTransplantEvent?: HairTransplantEvent[];
  readonly emoteEvent?: EmoteEvent[];
  readonly startPlaceableAnimationEvent?: StartPlaceableAnimationEvent[];
  readonly placePlaceableEvent?: PlacePlaceableEvent[];
  readonly destroyPlaceableEvent?: DestroyPlaceableEvent[];
  readonly changePictureFrameContentsEvent?: ChangePictureFrameContentsEvent[];
  readonly changeTextSignContentsEvent?: ChangeTextSignContentsEvent[];
  readonly updateVideoSettingsEvent?: UpdateVideoSettingsEvent[];
  readonly sellInContainerEvent?: SellInContainerEvent[];
  readonly purchaseFromContainerEvent?: PurchaseFromContainerEvent[];
  readonly updateRobotNameEvent?: UpdateRobotNameEvent[];
  readonly placeRobotEvent?: PlaceRobotEvent[];
  readonly endPlaceRobotEvent?: EndPlaceRobotEvent[];
  readonly pickUpRobotEvent?: PickUpRobotEvent[];
  readonly updateProjectedRestorationEvent?: UpdateProjectedRestorationEvent[];
  readonly labelChangeEvent?: LabelChangeEvent[];
  readonly createGroupEvent?: CreateGroupEvent[];
  readonly placeBlueprintEvent?: PlaceBlueprintEvent[];
  readonly destroyBlueprintEvent?: DestroyBlueprintEvent[];
  readonly createCraftingStationEvent?: CreateCraftingStationEvent[];
  readonly feedRobotEvent?: FeedRobotEvent[];
  readonly placeGroupEvent?: PlaceGroupEvent[];
  readonly cloneGroupEvent?: CloneGroupEvent[];
  readonly destroyGroupEvent?: DestroyGroupEvent[];
  readonly captureGroupEvent?: CaptureGroupEvent[];
  readonly unGroupEvent?: UnGroupEvent[];
  readonly repairGroupEvent?: RepairGroupEvent[];
  readonly updateGroupPreviewEvent?: UpdateGroupPreviewEvent[];
  readonly deleteGroupPreviewEvent?: DeleteGroupPreviewEvent[];
  readonly restoreGroupEvent?: RestoreGroupEvent[];
  readonly restorePlaceableEvent?: RestorePlaceableEvent[];
  readonly createPhotoPortalEvent?: CreatePhotoPortalEvent[];
  readonly consumptionEvent?: ConsumptionEvent[];
  readonly removeBuffEvent?: RemoveBuffEvent[];
  readonly adminInventoryGroupEvent?: AdminInventoryGroupEvent[];
  readonly adminResetChallengesEvent?: AdminResetChallengesEvent[];
  readonly adminResetRecipeEvent?: AdminResetRecipeEvent[];
  readonly adminResetInventoryEvent?: AdminResetInventoryEvent[];
  readonly adminSetInfiniteCapacityContainerEvent?: AdminSetInfiniteCapacityContainerEvent[];
  readonly adminGiveItemEvent?: AdminGiveItemEvent[];
  readonly adminRemoveItemEvent?: AdminRemoveItemEvent[];
  readonly adminDeleteEvent?: AdminDeleteEvent[];
  readonly adminIceEvent?: AdminIceEvent[];
  readonly playerInitEvent?: PlayerInitEvent[];
  readonly updatePlayerHealthEvent?: UpdatePlayerHealthEvent[];
  readonly updateNpcHealthEvent?: UpdateNpcHealthEvent[];
  readonly pickUpEvent?: PickUpEvent[];
  readonly removeMapBeamEvent?: RemoveMapBeamEvent[];
  readonly setNUXStatusEvent?: SetNUXStatusEvent[];
  readonly acceptChallengeEvent?: AcceptChallengeEvent[];
  readonly completeQuestStepAtEntityEvent?: CompleteQuestStepAtEntityEvent[];
  readonly resetChallengeEvent?: ResetChallengeEvent[];
  readonly expireBuffsEvent?: ExpireBuffsEvent[];
  readonly expireRobotEvent?: ExpireRobotEvent[];
  readonly adminEditPresetEvent?: AdminEditPresetEvent[];
  readonly adminSavePresetEvent?: AdminSavePresetEvent[];
  readonly adminLoadPresetEvent?: AdminLoadPresetEvent[];
  readonly tillSoilEvent?: TillSoilEvent[];
  readonly plantSeedEvent?: PlantSeedEvent[];
  readonly waterPlantsEvent?: WaterPlantsEvent[];
  readonly fertilizePlantEvent?: FertilizePlantEvent[];
  readonly adminDestroyPlantEvent?: AdminDestroyPlantEvent[];
  readonly fishingClaimEvent?: FishingClaimEvent[];
  readonly fishingCaughtEvent?: FishingCaughtEvent[];
  readonly fishingFailedEvent?: FishingFailedEvent[];
  readonly fishingConsumeBaitEvent?: FishingConsumeBaitEvent[];
  readonly treasureRollEvent?: TreasureRollEvent[];
  readonly createOrJoinSpleefEvent?: CreateOrJoinSpleefEvent[];
  readonly joinDeathmatchEvent?: JoinDeathmatchEvent[];
  readonly finishSimpleRaceMinigameEvent?: FinishSimpleRaceMinigameEvent[];
  readonly startSimpleRaceMinigameEvent?: StartSimpleRaceMinigameEvent[];
  readonly reachStartSimpleRaceMinigameEvent?: ReachStartSimpleRaceMinigameEvent[];
  readonly reachCheckpointSimpleRaceMinigameEvent?: ReachCheckpointSimpleRaceMinigameEvent[];
  readonly restartSimpleRaceMinigameEvent?: RestartSimpleRaceMinigameEvent[];
  readonly tagMinigameHitPlayerEvent?: TagMinigameHitPlayerEvent[];
  readonly quitMinigameEvent?: QuitMinigameEvent[];
  readonly giveMinigameKitEvent?: GiveMinigameKitEvent[];
  readonly touchMinigameStatsEvent?: TouchMinigameStatsEvent[];
  readonly editMinigameMetadataEvent?: EditMinigameMetadataEvent[];
  readonly minigameInstanceTickEvent?: MinigameInstanceTickEvent[];
  readonly expireMinigameInstanceEvent?: ExpireMinigameInstanceEvent[];
  readonly associateMinigameElementEvent?: AssociateMinigameElementEvent[];
  readonly createMinigameThroughAssocationEvent?: CreateMinigameThroughAssocationEvent[];
  readonly ackWarpEvent?: AckWarpEvent[];
  readonly replenishWateringCanEvent?: ReplenishWateringCanEvent[];
  readonly spaceClipboardWandCutEvent?: SpaceClipboardWandCutEvent[];
  readonly spaceClipboardWandCopyEvent?: SpaceClipboardWandCopyEvent[];
  readonly spaceClipboardWandPasteEvent?: SpaceClipboardWandPasteEvent[];
  readonly spaceClipboardWandDiscardEvent?: SpaceClipboardWandDiscardEvent[];
  readonly negaWandRestoreEvent?: NegaWandRestoreEvent[];
  readonly placerWandEvent?: PlacerWandEvent[];
  readonly clearPlacerEvent?: ClearPlacerEvent[];
  readonly despawnWandEvent?: DespawnWandEvent[];
  readonly sellToEntityEvent?: SellToEntityEvent[];
  readonly setNPCPositionEvent?: SetNPCPositionEvent[];
  readonly adminUpdateInspectionTweaksEvent?: AdminUpdateInspectionTweaksEvent[];
  readonly adminECSDeleteComponentEvent?: AdminECSDeleteComponentEvent[];
  readonly adminECSAddComponentEvent?: AdminECSAddComponentEvent[];
  readonly adminECSUpdateComponentEvent?: AdminECSUpdateComponentEvent[];
  readonly createTeamEvent?: CreateTeamEvent[];
  readonly updateTeamMetadataEvent?: UpdateTeamMetadataEvent[];
  readonly invitePlayerToTeamEvent?: InvitePlayerToTeamEvent[];
  readonly requestToJoinTeamEvent?: RequestToJoinTeamEvent[];
  readonly requestedToJoinTeamEvent?: RequestedToJoinTeamEvent[];
  readonly cancelRequestToJoinTeamEvent?: CancelRequestToJoinTeamEvent[];
  readonly respondToJoinTeamRequestEvent?: RespondToJoinTeamRequestEvent[];
  readonly requestToJoinTeamAcceptedEvent?: RequestToJoinTeamAcceptedEvent[];
  readonly joinTeamEvent?: JoinTeamEvent[];
  readonly cancelTeamInviteEvent?: CancelTeamInviteEvent[];
  readonly kickTeamMemberEvent?: KickTeamMemberEvent[];
  readonly declineTeamInviteEvent?: DeclineTeamInviteEvent[];
  readonly quitTeamEvent?: QuitTeamEvent[];
  readonly beginTradeEvent?: BeginTradeEvent[];
  readonly acceptTradeEvent?: AcceptTradeEvent[];
  readonly changeTradeOfferEvent?: ChangeTradeOfferEvent[];
  readonly expireTradeEvent?: ExpireTradeEvent[];
  readonly giveGiftEvent?: GiveGiftEvent[];
  readonly giveMailboxItemEvent?: GiveMailboxItemEvent[];
  readonly unwrapWrappedItemEvent?: UnwrapWrappedItemEvent[];
  readonly pokePlantEvent?: PokePlantEvent[];
  readonly addToOutfitEvent?: AddToOutfitEvent[];
  readonly equipOutfitEvent?: EquipOutfitEvent[];
}

interface SuperEventSet {
  readonly disconnectPlayerEvent: DisconnectPlayerEvent[];
  readonly moveEvent: MoveEvent[];
  readonly idleChangeEvent: IdleChangeEvent[];
  readonly enterRobotFieldEvent: EnterRobotFieldEvent[];
  readonly warpEvent: WarpEvent[];
  readonly warpHomeEvent: WarpHomeEvent[];
  readonly editEvent: EditEvent[];
  readonly shapeEvent: ShapeEvent[];
  readonly farmingEvent: FarmingEvent[];
  readonly dumpWaterEvent: DumpWaterEvent[];
  readonly scoopWaterEvent: ScoopWaterEvent[];
  readonly inventoryCombineEvent: InventoryCombineEvent[];
  readonly inventorySplitEvent: InventorySplitEvent[];
  readonly inventorySortEvent: InventorySortEvent[];
  readonly inventorySwapEvent: InventorySwapEvent[];
  readonly robotInventorySwapEvent: RobotInventorySwapEvent[];
  readonly inventoryThrowEvent: InventoryThrowEvent[];
  readonly inventoryDestroyEvent: InventoryDestroyEvent[];
  readonly dyeBlockEvent: DyeBlockEvent[];
  readonly unmuckerEvent: UnmuckerEvent[];
  readonly internalInventorySetEvent: InternalInventorySetEvent[];
  readonly inventoryCraftEvent: InventoryCraftEvent[];
  readonly inventoryDyeEvent: InventoryDyeEvent[];
  readonly inventoryCookEvent: InventoryCookEvent[];
  readonly inventoryCompostEvent: InventoryCompostEvent[];
  readonly inventoryChangeSelectionEvent: InventoryChangeSelectionEvent[];
  readonly changeCameraModeEvent: ChangeCameraModeEvent[];
  readonly overflowMoveToInventoryEvent: OverflowMoveToInventoryEvent[];
  readonly inventoryMoveToOverflowEvent: InventoryMoveToOverflowEvent[];
  readonly appearanceChangeEvent: AppearanceChangeEvent[];
  readonly hairTransplantEvent: HairTransplantEvent[];
  readonly emoteEvent: EmoteEvent[];
  readonly startPlaceableAnimationEvent: StartPlaceableAnimationEvent[];
  readonly placePlaceableEvent: PlacePlaceableEvent[];
  readonly destroyPlaceableEvent: DestroyPlaceableEvent[];
  readonly changePictureFrameContentsEvent: ChangePictureFrameContentsEvent[];
  readonly changeTextSignContentsEvent: ChangeTextSignContentsEvent[];
  readonly updateVideoSettingsEvent: UpdateVideoSettingsEvent[];
  readonly sellInContainerEvent: SellInContainerEvent[];
  readonly purchaseFromContainerEvent: PurchaseFromContainerEvent[];
  readonly updateRobotNameEvent: UpdateRobotNameEvent[];
  readonly placeRobotEvent: PlaceRobotEvent[];
  readonly endPlaceRobotEvent: EndPlaceRobotEvent[];
  readonly pickUpRobotEvent: PickUpRobotEvent[];
  readonly updateProjectedRestorationEvent: UpdateProjectedRestorationEvent[];
  readonly labelChangeEvent: LabelChangeEvent[];
  readonly createGroupEvent: CreateGroupEvent[];
  readonly placeBlueprintEvent: PlaceBlueprintEvent[];
  readonly destroyBlueprintEvent: DestroyBlueprintEvent[];
  readonly createCraftingStationEvent: CreateCraftingStationEvent[];
  readonly feedRobotEvent: FeedRobotEvent[];
  readonly placeGroupEvent: PlaceGroupEvent[];
  readonly cloneGroupEvent: CloneGroupEvent[];
  readonly destroyGroupEvent: DestroyGroupEvent[];
  readonly captureGroupEvent: CaptureGroupEvent[];
  readonly unGroupEvent: UnGroupEvent[];
  readonly repairGroupEvent: RepairGroupEvent[];
  readonly updateGroupPreviewEvent: UpdateGroupPreviewEvent[];
  readonly deleteGroupPreviewEvent: DeleteGroupPreviewEvent[];
  readonly restoreGroupEvent: RestoreGroupEvent[];
  readonly restorePlaceableEvent: RestorePlaceableEvent[];
  readonly createPhotoPortalEvent: CreatePhotoPortalEvent[];
  readonly consumptionEvent: ConsumptionEvent[];
  readonly removeBuffEvent: RemoveBuffEvent[];
  readonly adminInventoryGroupEvent: AdminInventoryGroupEvent[];
  readonly adminResetChallengesEvent: AdminResetChallengesEvent[];
  readonly adminResetRecipeEvent: AdminResetRecipeEvent[];
  readonly adminResetInventoryEvent: AdminResetInventoryEvent[];
  readonly adminSetInfiniteCapacityContainerEvent: AdminSetInfiniteCapacityContainerEvent[];
  readonly adminGiveItemEvent: AdminGiveItemEvent[];
  readonly adminRemoveItemEvent: AdminRemoveItemEvent[];
  readonly adminDeleteEvent: AdminDeleteEvent[];
  readonly adminIceEvent: AdminIceEvent[];
  readonly playerInitEvent: PlayerInitEvent[];
  readonly updatePlayerHealthEvent: UpdatePlayerHealthEvent[];
  readonly updateNpcHealthEvent: UpdateNpcHealthEvent[];
  readonly pickUpEvent: PickUpEvent[];
  readonly removeMapBeamEvent: RemoveMapBeamEvent[];
  readonly setNUXStatusEvent: SetNUXStatusEvent[];
  readonly acceptChallengeEvent: AcceptChallengeEvent[];
  readonly completeQuestStepAtEntityEvent: CompleteQuestStepAtEntityEvent[];
  readonly resetChallengeEvent: ResetChallengeEvent[];
  readonly expireBuffsEvent: ExpireBuffsEvent[];
  readonly expireRobotEvent: ExpireRobotEvent[];
  readonly adminEditPresetEvent: AdminEditPresetEvent[];
  readonly adminSavePresetEvent: AdminSavePresetEvent[];
  readonly adminLoadPresetEvent: AdminLoadPresetEvent[];
  readonly tillSoilEvent: TillSoilEvent[];
  readonly plantSeedEvent: PlantSeedEvent[];
  readonly waterPlantsEvent: WaterPlantsEvent[];
  readonly fertilizePlantEvent: FertilizePlantEvent[];
  readonly adminDestroyPlantEvent: AdminDestroyPlantEvent[];
  readonly fishingClaimEvent: FishingClaimEvent[];
  readonly fishingCaughtEvent: FishingCaughtEvent[];
  readonly fishingFailedEvent: FishingFailedEvent[];
  readonly fishingConsumeBaitEvent: FishingConsumeBaitEvent[];
  readonly treasureRollEvent: TreasureRollEvent[];
  readonly createOrJoinSpleefEvent: CreateOrJoinSpleefEvent[];
  readonly joinDeathmatchEvent: JoinDeathmatchEvent[];
  readonly finishSimpleRaceMinigameEvent: FinishSimpleRaceMinigameEvent[];
  readonly startSimpleRaceMinigameEvent: StartSimpleRaceMinigameEvent[];
  readonly reachStartSimpleRaceMinigameEvent: ReachStartSimpleRaceMinigameEvent[];
  readonly reachCheckpointSimpleRaceMinigameEvent: ReachCheckpointSimpleRaceMinigameEvent[];
  readonly restartSimpleRaceMinigameEvent: RestartSimpleRaceMinigameEvent[];
  readonly tagMinigameHitPlayerEvent: TagMinigameHitPlayerEvent[];
  readonly quitMinigameEvent: QuitMinigameEvent[];
  readonly giveMinigameKitEvent: GiveMinigameKitEvent[];
  readonly touchMinigameStatsEvent: TouchMinigameStatsEvent[];
  readonly editMinigameMetadataEvent: EditMinigameMetadataEvent[];
  readonly minigameInstanceTickEvent: MinigameInstanceTickEvent[];
  readonly expireMinigameInstanceEvent: ExpireMinigameInstanceEvent[];
  readonly associateMinigameElementEvent: AssociateMinigameElementEvent[];
  readonly createMinigameThroughAssocationEvent: CreateMinigameThroughAssocationEvent[];
  readonly ackWarpEvent: AckWarpEvent[];
  readonly replenishWateringCanEvent: ReplenishWateringCanEvent[];
  readonly spaceClipboardWandCutEvent: SpaceClipboardWandCutEvent[];
  readonly spaceClipboardWandCopyEvent: SpaceClipboardWandCopyEvent[];
  readonly spaceClipboardWandPasteEvent: SpaceClipboardWandPasteEvent[];
  readonly spaceClipboardWandDiscardEvent: SpaceClipboardWandDiscardEvent[];
  readonly negaWandRestoreEvent: NegaWandRestoreEvent[];
  readonly placerWandEvent: PlacerWandEvent[];
  readonly clearPlacerEvent: ClearPlacerEvent[];
  readonly despawnWandEvent: DespawnWandEvent[];
  readonly sellToEntityEvent: SellToEntityEvent[];
  readonly setNPCPositionEvent: SetNPCPositionEvent[];
  readonly adminUpdateInspectionTweaksEvent: AdminUpdateInspectionTweaksEvent[];
  readonly adminECSDeleteComponentEvent: AdminECSDeleteComponentEvent[];
  readonly adminECSAddComponentEvent: AdminECSAddComponentEvent[];
  readonly adminECSUpdateComponentEvent: AdminECSUpdateComponentEvent[];
  readonly createTeamEvent: CreateTeamEvent[];
  readonly updateTeamMetadataEvent: UpdateTeamMetadataEvent[];
  readonly invitePlayerToTeamEvent: InvitePlayerToTeamEvent[];
  readonly requestToJoinTeamEvent: RequestToJoinTeamEvent[];
  readonly requestedToJoinTeamEvent: RequestedToJoinTeamEvent[];
  readonly cancelRequestToJoinTeamEvent: CancelRequestToJoinTeamEvent[];
  readonly respondToJoinTeamRequestEvent: RespondToJoinTeamRequestEvent[];
  readonly requestToJoinTeamAcceptedEvent: RequestToJoinTeamAcceptedEvent[];
  readonly joinTeamEvent: JoinTeamEvent[];
  readonly cancelTeamInviteEvent: CancelTeamInviteEvent[];
  readonly kickTeamMemberEvent: KickTeamMemberEvent[];
  readonly declineTeamInviteEvent: DeclineTeamInviteEvent[];
  readonly quitTeamEvent: QuitTeamEvent[];
  readonly beginTradeEvent: BeginTradeEvent[];
  readonly acceptTradeEvent: AcceptTradeEvent[];
  readonly changeTradeOfferEvent: ChangeTradeOfferEvent[];
  readonly expireTradeEvent: ExpireTradeEvent[];
  readonly giveGiftEvent: GiveGiftEvent[];
  readonly giveMailboxItemEvent: GiveMailboxItemEvent[];
  readonly unwrapWrappedItemEvent: UnwrapWrappedItemEvent[];
  readonly pokePlantEvent: PokePlantEvent[];
  readonly addToOutfitEvent: AddToOutfitEvent[];
  readonly equipOutfitEvent: EquipOutfitEvent[];
}

export type EventSetWith<C extends keyof EventSet> = Pick<SuperEventSet, C>;

export interface Event {
  readonly kind: string;
}

export interface HandlerDisconnectPlayerEvent {
  readonly kind: "disconnectPlayerEvent";
  readonly id: BiomesId;
}

export class DisconnectPlayerEvent implements Event {
  readonly kind = "disconnectPlayerEvent";
  readonly id: BiomesId;

  constructor({ id = t.defaultBiomesId }: { id?: BiomesId }) {
    this.id = id;
  }
}

export interface HandlerMoveEvent {
  readonly kind: "moveEvent";
  readonly id: BiomesId;
  position: t.OptionalVec3f;
  velocity: t.OptionalVec3f;
  orientation: t.OptionalVec2f;
}

export class MoveEvent implements Event {
  readonly kind = "moveEvent";
  readonly id: BiomesId;
  position: t.ReadonlyOptionalVec3f;
  velocity: t.ReadonlyOptionalVec3f;
  orientation: t.ReadonlyOptionalVec2f;

  constructor({
    id = t.defaultBiomesId,
    position = t.defaultOptionalVec3f,
    velocity = t.defaultOptionalVec3f,
    orientation = t.defaultOptionalVec2f,
  }: {
    id?: BiomesId;
    position?: t.ReadonlyOptionalVec3f;
    velocity?: t.ReadonlyOptionalVec3f;
    orientation?: t.ReadonlyOptionalVec2f;
  }) {
    this.id = id;
    this.position = position;
    this.velocity = velocity;
    this.orientation = orientation;
  }
}

export interface HandlerIdleChangeEvent {
  readonly kind: "idleChangeEvent";
  readonly id: BiomesId;
  idle: t.Bool;
}

export class IdleChangeEvent implements Event {
  readonly kind = "idleChangeEvent";
  readonly id: BiomesId;
  idle: t.ReadonlyBool;

  constructor({
    id = t.defaultBiomesId,
    idle = t.defaultBool,
  }: {
    id?: BiomesId;
    idle?: t.ReadonlyBool;
  }) {
    this.id = id;
    this.idle = idle;
  }
}

export interface HandlerEnterRobotFieldEvent {
  readonly kind: "enterRobotFieldEvent";
  readonly id: BiomesId;
  readonly robot_id: BiomesId;
}

export class EnterRobotFieldEvent implements Event {
  readonly kind = "enterRobotFieldEvent";
  readonly id: BiomesId;
  readonly robot_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    robot_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    robot_id?: BiomesId;
  }) {
    this.id = id;
    this.robot_id = robot_id;
  }
}

export interface HandlerWarpEvent {
  readonly kind: "warpEvent";
  readonly id: BiomesId;
  position: t.Vec3f;
  orientation: t.OptionalVec2f;
  cost: t.U64;
  royalty: t.U64;
  royaltyTarget: t.OptionalBiomesId;
}

export class WarpEvent implements Event {
  readonly kind = "warpEvent";
  readonly id: BiomesId;
  position: t.ReadonlyVec3f;
  orientation: t.ReadonlyOptionalVec2f;
  cost: t.ReadonlyU64;
  royalty: t.ReadonlyU64;
  royaltyTarget: t.ReadonlyOptionalBiomesId;

  constructor({
    id = t.defaultBiomesId,
    position = t.defaultVec3f(),
    orientation = t.defaultOptionalVec2f,
    cost = t.defaultU64,
    royalty = t.defaultU64,
    royaltyTarget = t.defaultOptionalBiomesId,
  }: {
    id?: BiomesId;
    position?: t.ReadonlyVec3f;
    orientation?: t.ReadonlyOptionalVec2f;
    cost?: t.ReadonlyU64;
    royalty?: t.ReadonlyU64;
    royaltyTarget?: t.ReadonlyOptionalBiomesId;
  }) {
    this.id = id;
    this.position = position;
    this.orientation = orientation;
    this.cost = cost;
    this.royalty = royalty;
    this.royaltyTarget = royaltyTarget;
  }
}

export interface HandlerWarpHomeEvent {
  readonly kind: "warpHomeEvent";
  readonly id: BiomesId;
  position: t.Vec3f;
  orientation: t.Vec2f;
  reason: t.WarpHomeReason;
}

export class WarpHomeEvent implements Event {
  readonly kind = "warpHomeEvent";
  readonly id: BiomesId;
  position: t.ReadonlyVec3f;
  orientation: t.ReadonlyVec2f;
  reason: t.ReadonlyWarpHomeReason;

  constructor({
    id = t.defaultBiomesId,
    position = t.defaultVec3f(),
    orientation = t.defaultVec2f(),
    reason = t.defaultWarpHomeReason,
  }: {
    id?: BiomesId;
    position?: t.ReadonlyVec3f;
    orientation?: t.ReadonlyVec2f;
    reason?: t.ReadonlyWarpHomeReason;
  }) {
    this.id = id;
    this.position = position;
    this.orientation = orientation;
    this.reason = reason;
  }
}

export interface HandlerEditEvent {
  readonly kind: "editEvent";
  readonly id: BiomesId;
  position: t.Vec3i;
  value: t.U32;
  readonly user_id: BiomesId;
  tool_ref: t.OwnedItemReference;
  blueprint_entity_id: t.OptionalBiomesId;
  blueprint_completed: t.OptionalBool;
}

export class EditEvent implements Event {
  readonly kind = "editEvent";
  readonly id: BiomesId;
  position: t.ReadonlyVec3i;
  value: t.ReadonlyU32;
  readonly user_id: BiomesId;
  tool_ref: t.ReadonlyOwnedItemReference;
  blueprint_entity_id: t.ReadonlyOptionalBiomesId;
  blueprint_completed: t.ReadonlyOptionalBool;

  constructor({
    id = t.defaultBiomesId,
    position = t.defaultVec3i(),
    value = t.defaultU32,
    user_id = t.defaultBiomesId,
    tool_ref = t.defaultOwnedItemReference(),
    blueprint_entity_id = t.defaultOptionalBiomesId,
    blueprint_completed = t.defaultOptionalBool,
  }: {
    id?: BiomesId;
    position?: t.ReadonlyVec3i;
    value?: t.ReadonlyU32;
    user_id?: BiomesId;
    tool_ref?: t.ReadonlyOwnedItemReference;
    blueprint_entity_id?: t.ReadonlyOptionalBiomesId;
    blueprint_completed?: t.ReadonlyOptionalBool;
  }) {
    this.id = id;
    this.position = position;
    this.value = value;
    this.user_id = user_id;
    this.tool_ref = tool_ref;
    this.blueprint_entity_id = blueprint_entity_id;
    this.blueprint_completed = blueprint_completed;
  }
}

export interface HandlerShapeEvent {
  readonly kind: "shapeEvent";
  readonly id: BiomesId;
  position: t.Vec3i;
  isomorphism: t.U32;
  readonly user_id: BiomesId;
  tool_ref: t.OwnedItemReference;
  blueprint_entity_id: t.OptionalBiomesId;
  blueprint_completed: t.OptionalBool;
}

export class ShapeEvent implements Event {
  readonly kind = "shapeEvent";
  readonly id: BiomesId;
  position: t.ReadonlyVec3i;
  isomorphism: t.ReadonlyU32;
  readonly user_id: BiomesId;
  tool_ref: t.ReadonlyOwnedItemReference;
  blueprint_entity_id: t.ReadonlyOptionalBiomesId;
  blueprint_completed: t.ReadonlyOptionalBool;

  constructor({
    id = t.defaultBiomesId,
    position = t.defaultVec3i(),
    isomorphism = t.defaultU32,
    user_id = t.defaultBiomesId,
    tool_ref = t.defaultOwnedItemReference(),
    blueprint_entity_id = t.defaultOptionalBiomesId,
    blueprint_completed = t.defaultOptionalBool,
  }: {
    id?: BiomesId;
    position?: t.ReadonlyVec3i;
    isomorphism?: t.ReadonlyU32;
    user_id?: BiomesId;
    tool_ref?: t.ReadonlyOwnedItemReference;
    blueprint_entity_id?: t.ReadonlyOptionalBiomesId;
    blueprint_completed?: t.ReadonlyOptionalBool;
  }) {
    this.id = id;
    this.position = position;
    this.isomorphism = isomorphism;
    this.user_id = user_id;
    this.tool_ref = tool_ref;
    this.blueprint_entity_id = blueprint_entity_id;
    this.blueprint_completed = blueprint_completed;
  }
}

export interface HandlerFarmingEvent {
  readonly kind: "farmingEvent";
  readonly id: BiomesId;
  updates: t.TerrainUpdateList;
}

export class FarmingEvent implements Event {
  readonly kind = "farmingEvent";
  readonly id: BiomesId;
  updates: t.ReadonlyTerrainUpdateList;

  constructor({
    id = t.defaultBiomesId,
    updates = t.defaultTerrainUpdateList(),
  }: {
    id?: BiomesId;
    updates?: t.ReadonlyTerrainUpdateList;
  }) {
    this.id = id;
    this.updates = updates;
  }
}

export interface HandlerDumpWaterEvent {
  readonly kind: "dumpWaterEvent";
  readonly id: BiomesId;
  pos: t.Vec3i;
}

export class DumpWaterEvent implements Event {
  readonly kind = "dumpWaterEvent";
  readonly id: BiomesId;
  pos: t.ReadonlyVec3i;

  constructor({
    id = t.defaultBiomesId,
    pos = t.defaultVec3i(),
  }: {
    id?: BiomesId;
    pos?: t.ReadonlyVec3i;
  }) {
    this.id = id;
    this.pos = pos;
  }
}

export interface HandlerScoopWaterEvent {
  readonly kind: "scoopWaterEvent";
  readonly id: BiomesId;
  pos: t.Vec3i;
}

export class ScoopWaterEvent implements Event {
  readonly kind = "scoopWaterEvent";
  readonly id: BiomesId;
  pos: t.ReadonlyVec3i;

  constructor({
    id = t.defaultBiomesId,
    pos = t.defaultVec3i(),
  }: {
    id?: BiomesId;
    pos?: t.ReadonlyVec3i;
  }) {
    this.id = id;
    this.pos = pos;
  }
}

export interface HandlerInventoryCombineEvent {
  readonly kind: "inventoryCombineEvent";
  readonly player_id: BiomesId;
  readonly src_id: BiomesId;
  src: t.OwnedItemReference;
  dst_id: t.OptionalBiomesId;
  dst: t.OwnedItemReference;
  count: t.U64;
  positions: t.Vec3iList;
}

export class InventoryCombineEvent implements Event {
  readonly kind = "inventoryCombineEvent";
  readonly player_id: BiomesId;
  readonly src_id: BiomesId;
  src: t.ReadonlyOwnedItemReference;
  dst_id: t.ReadonlyOptionalBiomesId;
  dst: t.ReadonlyOwnedItemReference;
  count: t.ReadonlyU64;
  positions: t.ReadonlyVec3iList;

  constructor({
    player_id = t.defaultBiomesId,
    src_id = t.defaultBiomesId,
    src = t.defaultOwnedItemReference(),
    dst_id = t.defaultOptionalBiomesId,
    dst = t.defaultOwnedItemReference(),
    count = t.defaultU64,
    positions = t.defaultVec3iList(),
  }: {
    player_id?: BiomesId;
    src_id?: BiomesId;
    src?: t.ReadonlyOwnedItemReference;
    dst_id?: t.ReadonlyOptionalBiomesId;
    dst?: t.ReadonlyOwnedItemReference;
    count?: t.ReadonlyU64;
    positions?: t.ReadonlyVec3iList;
  }) {
    this.player_id = player_id;
    this.src_id = src_id;
    this.src = src;
    this.dst_id = dst_id;
    this.dst = dst;
    this.count = count;
    this.positions = positions;
  }
}

export interface HandlerInventorySplitEvent {
  readonly kind: "inventorySplitEvent";
  readonly player_id: BiomesId;
  readonly src_id: BiomesId;
  src: t.OwnedItemReference;
  dst_id: t.OptionalBiomesId;
  dst: t.OwnedItemReference;
  count: t.U64;
  positions: t.Vec3iList;
}

export class InventorySplitEvent implements Event {
  readonly kind = "inventorySplitEvent";
  readonly player_id: BiomesId;
  readonly src_id: BiomesId;
  src: t.ReadonlyOwnedItemReference;
  dst_id: t.ReadonlyOptionalBiomesId;
  dst: t.ReadonlyOwnedItemReference;
  count: t.ReadonlyU64;
  positions: t.ReadonlyVec3iList;

  constructor({
    player_id = t.defaultBiomesId,
    src_id = t.defaultBiomesId,
    src = t.defaultOwnedItemReference(),
    dst_id = t.defaultOptionalBiomesId,
    dst = t.defaultOwnedItemReference(),
    count = t.defaultU64,
    positions = t.defaultVec3iList(),
  }: {
    player_id?: BiomesId;
    src_id?: BiomesId;
    src?: t.ReadonlyOwnedItemReference;
    dst_id?: t.ReadonlyOptionalBiomesId;
    dst?: t.ReadonlyOwnedItemReference;
    count?: t.ReadonlyU64;
    positions?: t.ReadonlyVec3iList;
  }) {
    this.player_id = player_id;
    this.src_id = src_id;
    this.src = src;
    this.dst_id = dst_id;
    this.dst = dst;
    this.count = count;
    this.positions = positions;
  }
}

export interface HandlerInventorySortEvent {
  readonly kind: "inventorySortEvent";
  readonly id: BiomesId;
}

export class InventorySortEvent implements Event {
  readonly kind = "inventorySortEvent";
  readonly id: BiomesId;

  constructor({ id = t.defaultBiomesId }: { id?: BiomesId }) {
    this.id = id;
  }
}

export interface HandlerInventorySwapEvent {
  readonly kind: "inventorySwapEvent";
  readonly player_id: BiomesId;
  readonly src_id: BiomesId;
  src: t.OwnedItemReference;
  dst_id: t.OptionalBiomesId;
  dst: t.OwnedItemReference;
  positions: t.Vec3iList;
}

export class InventorySwapEvent implements Event {
  readonly kind = "inventorySwapEvent";
  readonly player_id: BiomesId;
  readonly src_id: BiomesId;
  src: t.ReadonlyOwnedItemReference;
  dst_id: t.ReadonlyOptionalBiomesId;
  dst: t.ReadonlyOwnedItemReference;
  positions: t.ReadonlyVec3iList;

  constructor({
    player_id = t.defaultBiomesId,
    src_id = t.defaultBiomesId,
    src = t.defaultOwnedItemReference(),
    dst_id = t.defaultOptionalBiomesId,
    dst = t.defaultOwnedItemReference(),
    positions = t.defaultVec3iList(),
  }: {
    player_id?: BiomesId;
    src_id?: BiomesId;
    src?: t.ReadonlyOwnedItemReference;
    dst_id?: t.ReadonlyOptionalBiomesId;
    dst?: t.ReadonlyOwnedItemReference;
    positions?: t.ReadonlyVec3iList;
  }) {
    this.player_id = player_id;
    this.src_id = src_id;
    this.src = src;
    this.dst_id = dst_id;
    this.dst = dst;
    this.positions = positions;
  }
}

export interface HandlerRobotInventorySwapEvent {
  readonly kind: "robotInventorySwapEvent";
  readonly id: BiomesId;
  src: t.OwnedItemReference;
  dst: t.OwnedItemReference;
  readonly dst_id: BiomesId;
}

export class RobotInventorySwapEvent implements Event {
  readonly kind = "robotInventorySwapEvent";
  readonly id: BiomesId;
  src: t.ReadonlyOwnedItemReference;
  dst: t.ReadonlyOwnedItemReference;
  readonly dst_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    src = t.defaultOwnedItemReference(),
    dst = t.defaultOwnedItemReference(),
    dst_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    src?: t.ReadonlyOwnedItemReference;
    dst?: t.ReadonlyOwnedItemReference;
    dst_id?: BiomesId;
  }) {
    this.id = id;
    this.src = src;
    this.dst = dst;
    this.dst_id = dst_id;
  }
}

export interface HandlerInventoryThrowEvent {
  readonly kind: "inventoryThrowEvent";
  readonly id: BiomesId;
  src: t.OwnedItemReference;
  count: t.OptionalU64;
  position: t.Vec3f;
}

export class InventoryThrowEvent implements Event {
  readonly kind = "inventoryThrowEvent";
  readonly id: BiomesId;
  src: t.ReadonlyOwnedItemReference;
  count: t.ReadonlyOptionalU64;
  position: t.ReadonlyVec3f;

  constructor({
    id = t.defaultBiomesId,
    src = t.defaultOwnedItemReference(),
    count = t.defaultOptionalU64,
    position = t.defaultVec3f(),
  }: {
    id?: BiomesId;
    src?: t.ReadonlyOwnedItemReference;
    count?: t.ReadonlyOptionalU64;
    position?: t.ReadonlyVec3f;
  }) {
    this.id = id;
    this.src = src;
    this.count = count;
    this.position = position;
  }
}

export interface HandlerInventoryDestroyEvent {
  readonly kind: "inventoryDestroyEvent";
  readonly id: BiomesId;
  src: t.OwnedItemReference;
  count: t.OptionalU64;
}

export class InventoryDestroyEvent implements Event {
  readonly kind = "inventoryDestroyEvent";
  readonly id: BiomesId;
  src: t.ReadonlyOwnedItemReference;
  count: t.ReadonlyOptionalU64;

  constructor({
    id = t.defaultBiomesId,
    src = t.defaultOwnedItemReference(),
    count = t.defaultOptionalU64,
  }: {
    id?: BiomesId;
    src?: t.ReadonlyOwnedItemReference;
    count?: t.ReadonlyOptionalU64;
  }) {
    this.id = id;
    this.src = src;
    this.count = count;
  }
}

export interface HandlerDyeBlockEvent {
  readonly kind: "dyeBlockEvent";
  readonly id: BiomesId;
  dye: t.U8;
  position: t.Vec3i;
  readonly user_id: BiomesId;
}

export class DyeBlockEvent implements Event {
  readonly kind = "dyeBlockEvent";
  readonly id: BiomesId;
  dye: t.ReadonlyU8;
  position: t.ReadonlyVec3i;
  readonly user_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    dye = t.defaultU8,
    position = t.defaultVec3i(),
    user_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    dye?: t.ReadonlyU8;
    position?: t.ReadonlyVec3i;
    user_id?: BiomesId;
  }) {
    this.id = id;
    this.dye = dye;
    this.position = position;
    this.user_id = user_id;
  }
}

export interface HandlerUnmuckerEvent {
  readonly kind: "unmuckerEvent";
  readonly id: BiomesId;
  unmucker: t.OptionalBool;
}

export class UnmuckerEvent implements Event {
  readonly kind = "unmuckerEvent";
  readonly id: BiomesId;
  unmucker: t.ReadonlyOptionalBool;

  constructor({
    id = t.defaultBiomesId,
    unmucker = t.defaultOptionalBool,
  }: {
    id?: BiomesId;
    unmucker?: t.ReadonlyOptionalBool;
  }) {
    this.id = id;
    this.unmucker = unmucker;
  }
}

export interface HandlerInternalInventorySetEvent {
  readonly kind: "internalInventorySetEvent";
  readonly id: BiomesId;
  dst: t.OwnedItemReference;
  item: t.OptionalItemAndCount;
}

export class InternalInventorySetEvent implements Event {
  readonly kind = "internalInventorySetEvent";
  readonly id: BiomesId;
  dst: t.ReadonlyOwnedItemReference;
  item: t.ReadonlyOptionalItemAndCount;

  constructor({
    id = t.defaultBiomesId,
    dst = t.defaultOwnedItemReference(),
    item = t.defaultOptionalItemAndCount,
  }: {
    id?: BiomesId;
    dst?: t.ReadonlyOwnedItemReference;
    item?: t.ReadonlyOptionalItemAndCount;
  }) {
    this.id = id;
    this.dst = dst;
    this.item = item;
  }
}

export interface HandlerInventoryCraftEvent {
  readonly kind: "inventoryCraftEvent";
  readonly id: BiomesId;
  recipe: t.Item;
  slot_refs: t.OwnedItemReferenceList;
  readonly stationEntityId: BiomesId;
}

export class InventoryCraftEvent implements Event {
  readonly kind = "inventoryCraftEvent";
  readonly id: BiomesId;
  recipe: t.ReadonlyItem;
  slot_refs: t.ReadonlyOwnedItemReferenceList;
  readonly stationEntityId: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    recipe = t.defaultItem(),
    slot_refs = t.defaultOwnedItemReferenceList(),
    stationEntityId = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    recipe?: t.ReadonlyItem;
    slot_refs?: t.ReadonlyOwnedItemReferenceList;
    stationEntityId?: BiomesId;
  }) {
    this.id = id;
    this.recipe = recipe;
    this.slot_refs = slot_refs;
    this.stationEntityId = stationEntityId;
  }
}

export interface HandlerInventoryDyeEvent {
  readonly kind: "inventoryDyeEvent";
  readonly id: BiomesId;
  src: t.OwnedItemReference;
  dst: t.OwnedItemReference;
}

export class InventoryDyeEvent implements Event {
  readonly kind = "inventoryDyeEvent";
  readonly id: BiomesId;
  src: t.ReadonlyOwnedItemReference;
  dst: t.ReadonlyOwnedItemReference;

  constructor({
    id = t.defaultBiomesId,
    src = t.defaultOwnedItemReference(),
    dst = t.defaultOwnedItemReference(),
  }: {
    id?: BiomesId;
    src?: t.ReadonlyOwnedItemReference;
    dst?: t.ReadonlyOwnedItemReference;
  }) {
    this.id = id;
    this.src = src;
    this.dst = dst;
  }
}

export interface HandlerInventoryCookEvent {
  readonly kind: "inventoryCookEvent";
  readonly id: BiomesId;
  src: t.InventoryAssignmentPattern;
  readonly stationEntityId: BiomesId;
}

export class InventoryCookEvent implements Event {
  readonly kind = "inventoryCookEvent";
  readonly id: BiomesId;
  src: t.ReadonlyInventoryAssignmentPattern;
  readonly stationEntityId: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    src = t.defaultInventoryAssignmentPattern(),
    stationEntityId = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    src?: t.ReadonlyInventoryAssignmentPattern;
    stationEntityId?: BiomesId;
  }) {
    this.id = id;
    this.src = src;
    this.stationEntityId = stationEntityId;
  }
}

export interface HandlerInventoryCompostEvent {
  readonly kind: "inventoryCompostEvent";
  readonly id: BiomesId;
  src: t.InventoryAssignmentPattern;
  readonly stationEntityId: BiomesId;
}

export class InventoryCompostEvent implements Event {
  readonly kind = "inventoryCompostEvent";
  readonly id: BiomesId;
  src: t.ReadonlyInventoryAssignmentPattern;
  readonly stationEntityId: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    src = t.defaultInventoryAssignmentPattern(),
    stationEntityId = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    src?: t.ReadonlyInventoryAssignmentPattern;
    stationEntityId?: BiomesId;
  }) {
    this.id = id;
    this.src = src;
    this.stationEntityId = stationEntityId;
  }
}

export interface HandlerInventoryChangeSelectionEvent {
  readonly kind: "inventoryChangeSelectionEvent";
  readonly id: BiomesId;
  ref: t.OwnedItemReference;
}

export class InventoryChangeSelectionEvent implements Event {
  readonly kind = "inventoryChangeSelectionEvent";
  readonly id: BiomesId;
  ref: t.ReadonlyOwnedItemReference;

  constructor({
    id = t.defaultBiomesId,
    ref = t.defaultOwnedItemReference(),
  }: {
    id?: BiomesId;
    ref?: t.ReadonlyOwnedItemReference;
  }) {
    this.id = id;
    this.ref = ref;
  }
}

export interface HandlerChangeCameraModeEvent {
  readonly kind: "changeCameraModeEvent";
  readonly id: BiomesId;
  mode: t.CameraMode;
}

export class ChangeCameraModeEvent implements Event {
  readonly kind = "changeCameraModeEvent";
  readonly id: BiomesId;
  mode: t.ReadonlyCameraMode;

  constructor({
    id = t.defaultBiomesId,
    mode = t.defaultCameraMode,
  }: {
    id?: BiomesId;
    mode?: t.ReadonlyCameraMode;
  }) {
    this.id = id;
    this.mode = mode;
  }
}

export interface HandlerOverflowMoveToInventoryEvent {
  readonly kind: "overflowMoveToInventoryEvent";
  readonly id: BiomesId;
  payload: t.ItemBag;
  dst: t.OptionalOwnedItemReference;
}

export class OverflowMoveToInventoryEvent implements Event {
  readonly kind = "overflowMoveToInventoryEvent";
  readonly id: BiomesId;
  payload: t.ReadonlyItemBag;
  dst: t.ReadonlyOptionalOwnedItemReference;

  constructor({
    id = t.defaultBiomesId,
    payload = t.defaultItemBag(),
    dst = t.defaultOptionalOwnedItemReference,
  }: {
    id?: BiomesId;
    payload?: t.ReadonlyItemBag;
    dst?: t.ReadonlyOptionalOwnedItemReference;
  }) {
    this.id = id;
    this.payload = payload;
    this.dst = dst;
  }
}

export interface HandlerInventoryMoveToOverflowEvent {
  readonly kind: "inventoryMoveToOverflowEvent";
  readonly id: BiomesId;
  src: t.OwnedItemReference;
  count: t.U64;
}

export class InventoryMoveToOverflowEvent implements Event {
  readonly kind = "inventoryMoveToOverflowEvent";
  readonly id: BiomesId;
  src: t.ReadonlyOwnedItemReference;
  count: t.ReadonlyU64;

  constructor({
    id = t.defaultBiomesId,
    src = t.defaultOwnedItemReference(),
    count = t.defaultU64,
  }: {
    id?: BiomesId;
    src?: t.ReadonlyOwnedItemReference;
    count?: t.ReadonlyU64;
  }) {
    this.id = id;
    this.src = src;
    this.count = count;
  }
}

export interface HandlerAppearanceChangeEvent {
  readonly kind: "appearanceChangeEvent";
  readonly id: BiomesId;
  appearance: t.Appearance;
}

export class AppearanceChangeEvent implements Event {
  readonly kind = "appearanceChangeEvent";
  readonly id: BiomesId;
  appearance: t.ReadonlyAppearance;

  constructor({
    id = t.defaultBiomesId,
    appearance = t.defaultAppearance(),
  }: {
    id?: BiomesId;
    appearance?: t.ReadonlyAppearance;
  }) {
    this.id = id;
    this.appearance = appearance;
  }
}

export interface HandlerHairTransplantEvent {
  readonly kind: "hairTransplantEvent";
  readonly id: BiomesId;
  newHairId: t.OptionalBiomesId;
}

export class HairTransplantEvent implements Event {
  readonly kind = "hairTransplantEvent";
  readonly id: BiomesId;
  newHairId: t.ReadonlyOptionalBiomesId;

  constructor({
    id = t.defaultBiomesId,
    newHairId = t.defaultOptionalBiomesId,
  }: {
    id?: BiomesId;
    newHairId?: t.ReadonlyOptionalBiomesId;
  }) {
    this.id = id;
    this.newHairId = newHairId;
  }
}

export interface HandlerEmoteEvent {
  readonly kind: "emoteEvent";
  readonly id: BiomesId;
  emote_type: t.OptionalEmoteType;
  nonce: t.OptionalF64;
  rich_emote_components: t.OptionalRichEmoteComponents;
  start_time: t.OptionalF64;
  expiry_time: t.OptionalF64;
}

export class EmoteEvent implements Event {
  readonly kind = "emoteEvent";
  readonly id: BiomesId;
  emote_type: t.ReadonlyOptionalEmoteType;
  nonce: t.ReadonlyOptionalF64;
  rich_emote_components: t.ReadonlyOptionalRichEmoteComponents;
  start_time: t.ReadonlyOptionalF64;
  expiry_time: t.ReadonlyOptionalF64;

  constructor({
    id = t.defaultBiomesId,
    emote_type = t.defaultOptionalEmoteType,
    nonce = t.defaultOptionalF64,
    rich_emote_components = t.defaultOptionalRichEmoteComponents,
    start_time = t.defaultOptionalF64,
    expiry_time = t.defaultOptionalF64,
  }: {
    id?: BiomesId;
    emote_type?: t.ReadonlyOptionalEmoteType;
    nonce?: t.ReadonlyOptionalF64;
    rich_emote_components?: t.ReadonlyOptionalRichEmoteComponents;
    start_time?: t.ReadonlyOptionalF64;
    expiry_time?: t.ReadonlyOptionalF64;
  }) {
    this.id = id;
    this.emote_type = emote_type;
    this.nonce = nonce;
    this.rich_emote_components = rich_emote_components;
    this.start_time = start_time;
    this.expiry_time = expiry_time;
  }
}

export interface HandlerStartPlaceableAnimationEvent {
  readonly kind: "startPlaceableAnimationEvent";
  readonly id: BiomesId;
  animation_type: t.PlaceableAnimationType;
}

export class StartPlaceableAnimationEvent implements Event {
  readonly kind = "startPlaceableAnimationEvent";
  readonly id: BiomesId;
  animation_type: t.ReadonlyPlaceableAnimationType;

  constructor({
    id = t.defaultBiomesId,
    animation_type = t.defaultPlaceableAnimationType,
  }: {
    id?: BiomesId;
    animation_type?: t.ReadonlyPlaceableAnimationType;
  }) {
    this.id = id;
    this.animation_type = animation_type;
  }
}

export interface HandlerPlacePlaceableEvent {
  readonly kind: "placePlaceableEvent";
  readonly id: BiomesId;
  placeable_item: t.Item;
  inventory_item: t.Item;
  inventory_ref: t.OwnedItemReference;
  position: t.Vec3f;
  orientation: t.Vec2f;
  minigame_id: t.OptionalBiomesId;
  existing_placeable: t.OptionalBiomesId;
}

export class PlacePlaceableEvent implements Event {
  readonly kind = "placePlaceableEvent";
  readonly id: BiomesId;
  placeable_item: t.ReadonlyItem;
  inventory_item: t.ReadonlyItem;
  inventory_ref: t.ReadonlyOwnedItemReference;
  position: t.ReadonlyVec3f;
  orientation: t.ReadonlyVec2f;
  minigame_id: t.ReadonlyOptionalBiomesId;
  existing_placeable: t.ReadonlyOptionalBiomesId;

  constructor({
    id = t.defaultBiomesId,
    placeable_item = t.defaultItem(),
    inventory_item = t.defaultItem(),
    inventory_ref = t.defaultOwnedItemReference(),
    position = t.defaultVec3f(),
    orientation = t.defaultVec2f(),
    minigame_id = t.defaultOptionalBiomesId,
    existing_placeable = t.defaultOptionalBiomesId,
  }: {
    id?: BiomesId;
    placeable_item?: t.ReadonlyItem;
    inventory_item?: t.ReadonlyItem;
    inventory_ref?: t.ReadonlyOwnedItemReference;
    position?: t.ReadonlyVec3f;
    orientation?: t.ReadonlyVec2f;
    minigame_id?: t.ReadonlyOptionalBiomesId;
    existing_placeable?: t.ReadonlyOptionalBiomesId;
  }) {
    this.id = id;
    this.placeable_item = placeable_item;
    this.inventory_item = inventory_item;
    this.inventory_ref = inventory_ref;
    this.position = position;
    this.orientation = orientation;
    this.minigame_id = minigame_id;
    this.existing_placeable = existing_placeable;
  }
}

export interface HandlerDestroyPlaceableEvent {
  readonly kind: "destroyPlaceableEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  tool_ref: t.OwnedItemReference;
  expired: t.OptionalBool;
}

export class DestroyPlaceableEvent implements Event {
  readonly kind = "destroyPlaceableEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  tool_ref: t.ReadonlyOwnedItemReference;
  expired: t.ReadonlyOptionalBool;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
    tool_ref = t.defaultOwnedItemReference(),
    expired = t.defaultOptionalBool,
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
    tool_ref?: t.ReadonlyOwnedItemReference;
    expired?: t.ReadonlyOptionalBool;
  }) {
    this.id = id;
    this.user_id = user_id;
    this.tool_ref = tool_ref;
    this.expired = expired;
  }
}

export interface HandlerChangePictureFrameContentsEvent {
  readonly kind: "changePictureFrameContentsEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  photo_id: t.OptionalBiomesId;
  minigame_id: t.OptionalBiomesId;
}

export class ChangePictureFrameContentsEvent implements Event {
  readonly kind = "changePictureFrameContentsEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  photo_id: t.ReadonlyOptionalBiomesId;
  minigame_id: t.ReadonlyOptionalBiomesId;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
    photo_id = t.defaultOptionalBiomesId,
    minigame_id = t.defaultOptionalBiomesId,
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
    photo_id?: t.ReadonlyOptionalBiomesId;
    minigame_id?: t.ReadonlyOptionalBiomesId;
  }) {
    this.id = id;
    this.user_id = user_id;
    this.photo_id = photo_id;
    this.minigame_id = minigame_id;
  }
}

export interface HandlerChangeTextSignContentsEvent {
  readonly kind: "changeTextSignContentsEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  text: t.Strings;
}

export class ChangeTextSignContentsEvent implements Event {
  readonly kind = "changeTextSignContentsEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  text: t.ReadonlyStrings;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
    text = t.defaultStrings(),
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
    text?: t.ReadonlyStrings;
  }) {
    this.id = id;
    this.user_id = user_id;
    this.text = text;
  }
}

export interface HandlerUpdateVideoSettingsEvent {
  readonly kind: "updateVideoSettingsEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  video_url: t.OptionalString;
  muted: t.Bool;
}

export class UpdateVideoSettingsEvent implements Event {
  readonly kind = "updateVideoSettingsEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  video_url: t.ReadonlyOptionalString;
  muted: t.ReadonlyBool;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
    video_url = t.defaultOptionalString,
    muted = t.defaultBool,
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
    video_url?: t.ReadonlyOptionalString;
    muted?: t.ReadonlyBool;
  }) {
    this.id = id;
    this.user_id = user_id;
    this.video_url = video_url;
    this.muted = muted;
  }
}

export interface HandlerSellInContainerEvent {
  readonly kind: "sellInContainerEvent";
  readonly id: BiomesId;
  readonly seller_id: BiomesId;
  src: t.OwnedItemReference;
  sell_item: t.ItemAndCount;
  dst_slot: t.OwnedItemReference;
  dst_price: t.ItemAndCount;
}

export class SellInContainerEvent implements Event {
  readonly kind = "sellInContainerEvent";
  readonly id: BiomesId;
  readonly seller_id: BiomesId;
  src: t.ReadonlyOwnedItemReference;
  sell_item: t.ReadonlyItemAndCount;
  dst_slot: t.ReadonlyOwnedItemReference;
  dst_price: t.ReadonlyItemAndCount;

  constructor({
    id = t.defaultBiomesId,
    seller_id = t.defaultBiomesId,
    src = t.defaultOwnedItemReference(),
    sell_item = t.defaultItemAndCount(),
    dst_slot = t.defaultOwnedItemReference(),
    dst_price = t.defaultItemAndCount(),
  }: {
    id?: BiomesId;
    seller_id?: BiomesId;
    src?: t.ReadonlyOwnedItemReference;
    sell_item?: t.ReadonlyItemAndCount;
    dst_slot?: t.ReadonlyOwnedItemReference;
    dst_price?: t.ReadonlyItemAndCount;
  }) {
    this.id = id;
    this.seller_id = seller_id;
    this.src = src;
    this.sell_item = sell_item;
    this.dst_slot = dst_slot;
    this.dst_price = dst_price;
  }
}

export interface HandlerPurchaseFromContainerEvent {
  readonly kind: "purchaseFromContainerEvent";
  readonly id: BiomesId;
  readonly purchaser_id: BiomesId;
  readonly seller_id: BiomesId;
  src: t.OwnedItemReference;
  quantity: t.OptionalU32;
}

export class PurchaseFromContainerEvent implements Event {
  readonly kind = "purchaseFromContainerEvent";
  readonly id: BiomesId;
  readonly purchaser_id: BiomesId;
  readonly seller_id: BiomesId;
  src: t.ReadonlyOwnedItemReference;
  quantity: t.ReadonlyOptionalU32;

  constructor({
    id = t.defaultBiomesId,
    purchaser_id = t.defaultBiomesId,
    seller_id = t.defaultBiomesId,
    src = t.defaultOwnedItemReference(),
    quantity = t.defaultOptionalU32,
  }: {
    id?: BiomesId;
    purchaser_id?: BiomesId;
    seller_id?: BiomesId;
    src?: t.ReadonlyOwnedItemReference;
    quantity?: t.ReadonlyOptionalU32;
  }) {
    this.id = id;
    this.purchaser_id = purchaser_id;
    this.seller_id = seller_id;
    this.src = src;
    this.quantity = quantity;
  }
}

export interface HandlerUpdateRobotNameEvent {
  readonly kind: "updateRobotNameEvent";
  readonly id: BiomesId;
  readonly player_id: BiomesId;
  readonly entity_id: BiomesId;
  name: t.String;
}

export class UpdateRobotNameEvent implements Event {
  readonly kind = "updateRobotNameEvent";
  readonly id: BiomesId;
  readonly player_id: BiomesId;
  readonly entity_id: BiomesId;
  name: t.ReadonlyString;

  constructor({
    id = t.defaultBiomesId,
    player_id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
    name = t.defaultString,
  }: {
    id?: BiomesId;
    player_id?: BiomesId;
    entity_id?: BiomesId;
    name?: t.ReadonlyString;
  }) {
    this.id = id;
    this.player_id = player_id;
    this.entity_id = entity_id;
    this.name = name;
  }
}

export interface HandlerPlaceRobotEvent {
  readonly kind: "placeRobotEvent";
  readonly id: BiomesId;
  robot_entity_id: t.OptionalBiomesId;
  inventory_ref: t.OwnedItemReference;
  position: t.Vec3f;
  orientation: t.Vec2f;
  readonly item_id: BiomesId;
}

export class PlaceRobotEvent implements Event {
  readonly kind = "placeRobotEvent";
  readonly id: BiomesId;
  robot_entity_id: t.ReadonlyOptionalBiomesId;
  inventory_ref: t.ReadonlyOwnedItemReference;
  position: t.ReadonlyVec3f;
  orientation: t.ReadonlyVec2f;
  readonly item_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    robot_entity_id = t.defaultOptionalBiomesId,
    inventory_ref = t.defaultOwnedItemReference(),
    position = t.defaultVec3f(),
    orientation = t.defaultVec2f(),
    item_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    robot_entity_id?: t.ReadonlyOptionalBiomesId;
    inventory_ref?: t.ReadonlyOwnedItemReference;
    position?: t.ReadonlyVec3f;
    orientation?: t.ReadonlyVec2f;
    item_id?: BiomesId;
  }) {
    this.id = id;
    this.robot_entity_id = robot_entity_id;
    this.inventory_ref = inventory_ref;
    this.position = position;
    this.orientation = orientation;
    this.item_id = item_id;
  }
}

export interface HandlerEndPlaceRobotEvent {
  readonly kind: "endPlaceRobotEvent";
  readonly id: BiomesId;
  readonly robot_entity_id: BiomesId;
  position: t.Vec3f;
  orientation: t.Vec2f;
}

export class EndPlaceRobotEvent implements Event {
  readonly kind = "endPlaceRobotEvent";
  readonly id: BiomesId;
  readonly robot_entity_id: BiomesId;
  position: t.ReadonlyVec3f;
  orientation: t.ReadonlyVec2f;

  constructor({
    id = t.defaultBiomesId,
    robot_entity_id = t.defaultBiomesId,
    position = t.defaultVec3f(),
    orientation = t.defaultVec2f(),
  }: {
    id?: BiomesId;
    robot_entity_id?: BiomesId;
    position?: t.ReadonlyVec3f;
    orientation?: t.ReadonlyVec2f;
  }) {
    this.id = id;
    this.robot_entity_id = robot_entity_id;
    this.position = position;
    this.orientation = orientation;
  }
}

export interface HandlerPickUpRobotEvent {
  readonly kind: "pickUpRobotEvent";
  readonly id: BiomesId;
  readonly player_id: BiomesId;
  readonly entity_id: BiomesId;
}

export class PickUpRobotEvent implements Event {
  readonly kind = "pickUpRobotEvent";
  readonly id: BiomesId;
  readonly player_id: BiomesId;
  readonly entity_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    player_id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    player_id?: BiomesId;
    entity_id?: BiomesId;
  }) {
    this.id = id;
    this.player_id = player_id;
    this.entity_id = entity_id;
  }
}

export interface HandlerUpdateProjectedRestorationEvent {
  readonly kind: "updateProjectedRestorationEvent";
  readonly id: BiomesId;
  readonly player_id: BiomesId;
  readonly entity_id: BiomesId;
  restore_delay_s: t.OptionalF64;
}

export class UpdateProjectedRestorationEvent implements Event {
  readonly kind = "updateProjectedRestorationEvent";
  readonly id: BiomesId;
  readonly player_id: BiomesId;
  readonly entity_id: BiomesId;
  restore_delay_s: t.ReadonlyOptionalF64;

  constructor({
    id = t.defaultBiomesId,
    player_id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
    restore_delay_s = t.defaultOptionalF64,
  }: {
    id?: BiomesId;
    player_id?: BiomesId;
    entity_id?: BiomesId;
    restore_delay_s?: t.ReadonlyOptionalF64;
  }) {
    this.id = id;
    this.player_id = player_id;
    this.entity_id = entity_id;
    this.restore_delay_s = restore_delay_s;
  }
}

export interface HandlerLabelChangeEvent {
  readonly kind: "labelChangeEvent";
  readonly id: BiomesId;
  text: t.String;
}

export class LabelChangeEvent implements Event {
  readonly kind = "labelChangeEvent";
  readonly id: BiomesId;
  text: t.ReadonlyString;

  constructor({
    id = t.defaultBiomesId,
    text = t.defaultString,
  }: {
    id?: BiomesId;
    text?: t.ReadonlyString;
  }) {
    this.id = id;
    this.text = text;
  }
}

export interface HandlerCreateGroupEvent {
  readonly kind: "createGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  name: t.String;
  warp: t.OptionalWarpTarget;
  tensor: t.TensorBlob;
  box: t.Box2;
  placeable_ids: t.BiomesIdList;
  position: t.Vec3f;
}

export class CreateGroupEvent implements Event {
  readonly kind = "createGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  name: t.ReadonlyString;
  warp: t.ReadonlyOptionalWarpTarget;
  tensor: t.ReadonlyTensorBlob;
  box: t.ReadonlyBox2;
  placeable_ids: t.ReadonlyBiomesIdList;
  position: t.ReadonlyVec3f;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
    name = t.defaultString,
    warp = t.defaultOptionalWarpTarget,
    tensor = t.defaultTensorBlob,
    box = t.defaultBox2(),
    placeable_ids = t.defaultBiomesIdList(),
    position = t.defaultVec3f(),
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
    name?: t.ReadonlyString;
    warp?: t.ReadonlyOptionalWarpTarget;
    tensor?: t.ReadonlyTensorBlob;
    box?: t.ReadonlyBox2;
    placeable_ids?: t.ReadonlyBiomesIdList;
    position?: t.ReadonlyVec3f;
  }) {
    this.id = id;
    this.user_id = user_id;
    this.name = name;
    this.warp = warp;
    this.tensor = tensor;
    this.box = box;
    this.placeable_ids = placeable_ids;
    this.position = position;
  }
}

export interface HandlerPlaceBlueprintEvent {
  readonly kind: "placeBlueprintEvent";
  readonly id: BiomesId;
  inventory_ref: t.OwnedItemReference;
  readonly item: BiomesId;
  position: t.Vec3f;
  orientation: t.Vec2f;
}

export class PlaceBlueprintEvent implements Event {
  readonly kind = "placeBlueprintEvent";
  readonly id: BiomesId;
  inventory_ref: t.ReadonlyOwnedItemReference;
  readonly item: BiomesId;
  position: t.ReadonlyVec3f;
  orientation: t.ReadonlyVec2f;

  constructor({
    id = t.defaultBiomesId,
    inventory_ref = t.defaultOwnedItemReference(),
    item = t.defaultBiomesId,
    position = t.defaultVec3f(),
    orientation = t.defaultVec2f(),
  }: {
    id?: BiomesId;
    inventory_ref?: t.ReadonlyOwnedItemReference;
    item?: BiomesId;
    position?: t.ReadonlyVec3f;
    orientation?: t.ReadonlyVec2f;
  }) {
    this.id = id;
    this.inventory_ref = inventory_ref;
    this.item = item;
    this.position = position;
    this.orientation = orientation;
  }
}

export interface HandlerDestroyBlueprintEvent {
  readonly kind: "destroyBlueprintEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  tool_ref: t.OwnedItemReference;
  position: t.Vec3f;
}

export class DestroyBlueprintEvent implements Event {
  readonly kind = "destroyBlueprintEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  tool_ref: t.ReadonlyOwnedItemReference;
  position: t.ReadonlyVec3f;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
    tool_ref = t.defaultOwnedItemReference(),
    position = t.defaultVec3f(),
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
    tool_ref?: t.ReadonlyOwnedItemReference;
    position?: t.ReadonlyVec3f;
  }) {
    this.id = id;
    this.user_id = user_id;
    this.tool_ref = tool_ref;
    this.position = position;
  }
}

export interface HandlerCreateCraftingStationEvent {
  readonly kind: "createCraftingStationEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
}

export class CreateCraftingStationEvent implements Event {
  readonly kind = "createCraftingStationEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
  }) {
    this.id = id;
    this.user_id = user_id;
  }
}

export interface HandlerFeedRobotEvent {
  readonly kind: "feedRobotEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  amount: t.U64;
}

export class FeedRobotEvent implements Event {
  readonly kind = "feedRobotEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  amount: t.ReadonlyU64;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
    amount = t.defaultU64,
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
    amount?: t.ReadonlyU64;
  }) {
    this.id = id;
    this.user_id = user_id;
    this.amount = amount;
  }
}

export interface HandlerPlaceGroupEvent {
  readonly kind: "placeGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  inventory_ref: t.OwnedItemReference;
  warp: t.WarpTarget;
  box: t.Box2;
  rotation: t.OptionalU32;
  reflection: t.OptionalVec3f;
  tensor: t.TensorBlob;
  name: t.String;
}

export class PlaceGroupEvent implements Event {
  readonly kind = "placeGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  inventory_ref: t.ReadonlyOwnedItemReference;
  warp: t.ReadonlyWarpTarget;
  box: t.ReadonlyBox2;
  rotation: t.ReadonlyOptionalU32;
  reflection: t.ReadonlyOptionalVec3f;
  tensor: t.ReadonlyTensorBlob;
  name: t.ReadonlyString;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
    inventory_ref = t.defaultOwnedItemReference(),
    warp = t.defaultWarpTarget(),
    box = t.defaultBox2(),
    rotation = t.defaultOptionalU32,
    reflection = t.defaultOptionalVec3f,
    tensor = t.defaultTensorBlob,
    name = t.defaultString,
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
    inventory_ref?: t.ReadonlyOwnedItemReference;
    warp?: t.ReadonlyWarpTarget;
    box?: t.ReadonlyBox2;
    rotation?: t.ReadonlyOptionalU32;
    reflection?: t.ReadonlyOptionalVec3f;
    tensor?: t.ReadonlyTensorBlob;
    name?: t.ReadonlyString;
  }) {
    this.id = id;
    this.user_id = user_id;
    this.inventory_ref = inventory_ref;
    this.warp = warp;
    this.box = box;
    this.rotation = rotation;
    this.reflection = reflection;
    this.tensor = tensor;
    this.name = name;
  }
}

export interface HandlerCloneGroupEvent {
  readonly kind: "cloneGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  inventory_ref: t.OwnedItemReference;
  box: t.Box2;
  rotation: t.OptionalU32;
  reflection: t.OptionalVec3f;
  tensor: t.TensorBlob;
}

export class CloneGroupEvent implements Event {
  readonly kind = "cloneGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  inventory_ref: t.ReadonlyOwnedItemReference;
  box: t.ReadonlyBox2;
  rotation: t.ReadonlyOptionalU32;
  reflection: t.ReadonlyOptionalVec3f;
  tensor: t.ReadonlyTensorBlob;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
    inventory_ref = t.defaultOwnedItemReference(),
    box = t.defaultBox2(),
    rotation = t.defaultOptionalU32,
    reflection = t.defaultOptionalVec3f,
    tensor = t.defaultTensorBlob,
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
    inventory_ref?: t.ReadonlyOwnedItemReference;
    box?: t.ReadonlyBox2;
    rotation?: t.ReadonlyOptionalU32;
    reflection?: t.ReadonlyOptionalVec3f;
    tensor?: t.ReadonlyTensorBlob;
  }) {
    this.id = id;
    this.user_id = user_id;
    this.inventory_ref = inventory_ref;
    this.box = box;
    this.rotation = rotation;
    this.reflection = reflection;
    this.tensor = tensor;
  }
}

export interface HandlerDestroyGroupEvent {
  readonly kind: "destroyGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  position: t.Vec3f;
  tool_ref: t.OwnedItemReference;
  rotation: t.OptionalU32;
  placeable_ids: t.BiomesIdList;
}

export class DestroyGroupEvent implements Event {
  readonly kind = "destroyGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  position: t.ReadonlyVec3f;
  tool_ref: t.ReadonlyOwnedItemReference;
  rotation: t.ReadonlyOptionalU32;
  placeable_ids: t.ReadonlyBiomesIdList;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
    position = t.defaultVec3f(),
    tool_ref = t.defaultOwnedItemReference(),
    rotation = t.defaultOptionalU32,
    placeable_ids = t.defaultBiomesIdList(),
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
    position?: t.ReadonlyVec3f;
    tool_ref?: t.ReadonlyOwnedItemReference;
    rotation?: t.ReadonlyOptionalU32;
    placeable_ids?: t.ReadonlyBiomesIdList;
  }) {
    this.id = id;
    this.user_id = user_id;
    this.position = position;
    this.tool_ref = tool_ref;
    this.rotation = rotation;
    this.placeable_ids = placeable_ids;
  }
}

export interface HandlerCaptureGroupEvent {
  readonly kind: "captureGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
}

export class CaptureGroupEvent implements Event {
  readonly kind = "captureGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
  }) {
    this.id = id;
    this.user_id = user_id;
  }
}

export interface HandlerUnGroupEvent {
  readonly kind: "unGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  remove_voxels: t.Bool;
}

export class UnGroupEvent implements Event {
  readonly kind = "unGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  remove_voxels: t.ReadonlyBool;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
    remove_voxels = t.defaultBool,
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
    remove_voxels?: t.ReadonlyBool;
  }) {
    this.id = id;
    this.user_id = user_id;
    this.remove_voxels = remove_voxels;
  }
}

export interface HandlerRepairGroupEvent {
  readonly kind: "repairGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
}

export class RepairGroupEvent implements Event {
  readonly kind = "repairGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
  }) {
    this.id = id;
    this.user_id = user_id;
  }
}

export interface HandlerUpdateGroupPreviewEvent {
  readonly kind: "updateGroupPreviewEvent";
  readonly id: BiomesId;
  tensor: t.TensorBlob;
  box: t.Box2;
  blueprint_id: t.OptionalBiomesId;
}

export class UpdateGroupPreviewEvent implements Event {
  readonly kind = "updateGroupPreviewEvent";
  readonly id: BiomesId;
  tensor: t.ReadonlyTensorBlob;
  box: t.ReadonlyBox2;
  blueprint_id: t.ReadonlyOptionalBiomesId;

  constructor({
    id = t.defaultBiomesId,
    tensor = t.defaultTensorBlob,
    box = t.defaultBox2(),
    blueprint_id = t.defaultOptionalBiomesId,
  }: {
    id?: BiomesId;
    tensor?: t.ReadonlyTensorBlob;
    box?: t.ReadonlyBox2;
    blueprint_id?: t.ReadonlyOptionalBiomesId;
  }) {
    this.id = id;
    this.tensor = tensor;
    this.box = box;
    this.blueprint_id = blueprint_id;
  }
}

export interface HandlerDeleteGroupPreviewEvent {
  readonly kind: "deleteGroupPreviewEvent";
  readonly id: BiomesId;
}

export class DeleteGroupPreviewEvent implements Event {
  readonly kind = "deleteGroupPreviewEvent";
  readonly id: BiomesId;

  constructor({ id = t.defaultBiomesId }: { id?: BiomesId }) {
    this.id = id;
  }
}

export interface HandlerRestoreGroupEvent {
  readonly kind: "restoreGroupEvent";
  readonly id: BiomesId;
  placeable_ids: t.BiomesIdList;
  restoreRegion: t.OptionalAabb;
}

export class RestoreGroupEvent implements Event {
  readonly kind = "restoreGroupEvent";
  readonly id: BiomesId;
  placeable_ids: t.ReadonlyBiomesIdList;
  restoreRegion: t.ReadonlyOptionalAabb;

  constructor({
    id = t.defaultBiomesId,
    placeable_ids = t.defaultBiomesIdList(),
    restoreRegion = t.defaultOptionalAabb,
  }: {
    id?: BiomesId;
    placeable_ids?: t.ReadonlyBiomesIdList;
    restoreRegion?: t.ReadonlyOptionalAabb;
  }) {
    this.id = id;
    this.placeable_ids = placeable_ids;
    this.restoreRegion = restoreRegion;
  }
}

export interface HandlerRestorePlaceableEvent {
  readonly kind: "restorePlaceableEvent";
  readonly id: BiomesId;
  restoreRegion: t.OptionalAabb;
}

export class RestorePlaceableEvent implements Event {
  readonly kind = "restorePlaceableEvent";
  readonly id: BiomesId;
  restoreRegion: t.ReadonlyOptionalAabb;

  constructor({
    id = t.defaultBiomesId,
    restoreRegion = t.defaultOptionalAabb,
  }: {
    id?: BiomesId;
    restoreRegion?: t.ReadonlyOptionalAabb;
  }) {
    this.id = id;
    this.restoreRegion = restoreRegion;
  }
}

export interface HandlerCreatePhotoPortalEvent {
  readonly kind: "createPhotoPortalEvent";
  readonly id: BiomesId;
  readonly photo_id: BiomesId;
  readonly photo_author_id: BiomesId;
  position: t.Vec3f;
  orientation: t.Vec2f;
}

export class CreatePhotoPortalEvent implements Event {
  readonly kind = "createPhotoPortalEvent";
  readonly id: BiomesId;
  readonly photo_id: BiomesId;
  readonly photo_author_id: BiomesId;
  position: t.ReadonlyVec3f;
  orientation: t.ReadonlyVec2f;

  constructor({
    id = t.defaultBiomesId,
    photo_id = t.defaultBiomesId,
    photo_author_id = t.defaultBiomesId,
    position = t.defaultVec3f(),
    orientation = t.defaultVec2f(),
  }: {
    id?: BiomesId;
    photo_id?: BiomesId;
    photo_author_id?: BiomesId;
    position?: t.ReadonlyVec3f;
    orientation?: t.ReadonlyVec2f;
  }) {
    this.id = id;
    this.photo_id = photo_id;
    this.photo_author_id = photo_author_id;
    this.position = position;
    this.orientation = orientation;
  }
}

export interface HandlerConsumptionEvent {
  readonly kind: "consumptionEvent";
  readonly id: BiomesId;
  readonly item_id: BiomesId;
  inventory_ref: t.OwnedItemReference;
  action: t.ConsumptionAction;
}

export class ConsumptionEvent implements Event {
  readonly kind = "consumptionEvent";
  readonly id: BiomesId;
  readonly item_id: BiomesId;
  inventory_ref: t.ReadonlyOwnedItemReference;
  action: t.ReadonlyConsumptionAction;

  constructor({
    id = t.defaultBiomesId,
    item_id = t.defaultBiomesId,
    inventory_ref = t.defaultOwnedItemReference(),
    action = t.defaultConsumptionAction,
  }: {
    id?: BiomesId;
    item_id?: BiomesId;
    inventory_ref?: t.ReadonlyOwnedItemReference;
    action?: t.ReadonlyConsumptionAction;
  }) {
    this.id = id;
    this.item_id = item_id;
    this.inventory_ref = inventory_ref;
    this.action = action;
  }
}

export interface HandlerRemoveBuffEvent {
  readonly kind: "removeBuffEvent";
  readonly id: BiomesId;
  buff: t.Buff;
}

export class RemoveBuffEvent implements Event {
  readonly kind = "removeBuffEvent";
  readonly id: BiomesId;
  buff: t.ReadonlyBuff;

  constructor({
    id = t.defaultBiomesId,
    buff = t.defaultBuff(),
  }: {
    id?: BiomesId;
    buff?: t.ReadonlyBuff;
  }) {
    this.id = id;
    this.buff = buff;
  }
}

export interface HandlerAdminInventoryGroupEvent {
  readonly kind: "adminInventoryGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
}

export class AdminInventoryGroupEvent implements Event {
  readonly kind = "adminInventoryGroupEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
  }) {
    this.id = id;
    this.user_id = user_id;
  }
}

export interface HandlerAdminResetChallengesEvent {
  readonly kind: "adminResetChallengesEvent";
  readonly id: BiomesId;
  challenge_states: t.ChallengeStateMap;
}

export class AdminResetChallengesEvent implements Event {
  readonly kind = "adminResetChallengesEvent";
  readonly id: BiomesId;
  challenge_states: t.ReadonlyChallengeStateMap;

  constructor({
    id = t.defaultBiomesId,
    challenge_states = t.defaultChallengeStateMap(),
  }: {
    id?: BiomesId;
    challenge_states?: t.ReadonlyChallengeStateMap;
  }) {
    this.id = id;
    this.challenge_states = challenge_states;
  }
}

export interface HandlerAdminResetRecipeEvent {
  readonly kind: "adminResetRecipeEvent";
  readonly id: BiomesId;
  readonly recipe_id: BiomesId;
  clear_all: t.OptionalBool;
}

export class AdminResetRecipeEvent implements Event {
  readonly kind = "adminResetRecipeEvent";
  readonly id: BiomesId;
  readonly recipe_id: BiomesId;
  clear_all: t.ReadonlyOptionalBool;

  constructor({
    id = t.defaultBiomesId,
    recipe_id = t.defaultBiomesId,
    clear_all = t.defaultOptionalBool,
  }: {
    id?: BiomesId;
    recipe_id?: BiomesId;
    clear_all?: t.ReadonlyOptionalBool;
  }) {
    this.id = id;
    this.recipe_id = recipe_id;
    this.clear_all = clear_all;
  }
}

export interface HandlerAdminResetInventoryEvent {
  readonly kind: "adminResetInventoryEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
}

export class AdminResetInventoryEvent implements Event {
  readonly kind = "adminResetInventoryEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
  }) {
    this.id = id;
    this.user_id = user_id;
  }
}

export interface HandlerAdminSetInfiniteCapacityContainerEvent {
  readonly kind: "adminSetInfiniteCapacityContainerEvent";
  readonly id: BiomesId;
  infinite_capacity: t.Bool;
}

export class AdminSetInfiniteCapacityContainerEvent implements Event {
  readonly kind = "adminSetInfiniteCapacityContainerEvent";
  readonly id: BiomesId;
  infinite_capacity: t.ReadonlyBool;

  constructor({
    id = t.defaultBiomesId,
    infinite_capacity = t.defaultBool,
  }: {
    id?: BiomesId;
    infinite_capacity?: t.ReadonlyBool;
  }) {
    this.id = id;
    this.infinite_capacity = infinite_capacity;
  }
}

export interface HandlerAdminGiveItemEvent {
  readonly kind: "adminGiveItemEvent";
  readonly id: BiomesId;
  bag: t.ItemBag;
  toOverflow: t.OptionalBool;
}

export class AdminGiveItemEvent implements Event {
  readonly kind = "adminGiveItemEvent";
  readonly id: BiomesId;
  bag: t.ReadonlyItemBag;
  toOverflow: t.ReadonlyOptionalBool;

  constructor({
    id = t.defaultBiomesId,
    bag = t.defaultItemBag(),
    toOverflow = t.defaultOptionalBool,
  }: {
    id?: BiomesId;
    bag?: t.ReadonlyItemBag;
    toOverflow?: t.ReadonlyOptionalBool;
  }) {
    this.id = id;
    this.bag = bag;
    this.toOverflow = toOverflow;
  }
}

export interface HandlerAdminRemoveItemEvent {
  readonly kind: "adminRemoveItemEvent";
  readonly id: BiomesId;
  ref: t.OwnedItemReference;
}

export class AdminRemoveItemEvent implements Event {
  readonly kind = "adminRemoveItemEvent";
  readonly id: BiomesId;
  ref: t.ReadonlyOwnedItemReference;

  constructor({
    id = t.defaultBiomesId,
    ref = t.defaultOwnedItemReference(),
  }: {
    id?: BiomesId;
    ref?: t.ReadonlyOwnedItemReference;
  }) {
    this.id = id;
    this.ref = ref;
  }
}

export interface HandlerAdminDeleteEvent {
  readonly kind: "adminDeleteEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
}

export class AdminDeleteEvent implements Event {
  readonly kind = "adminDeleteEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    entity_id?: BiomesId;
  }) {
    this.id = id;
    this.entity_id = entity_id;
  }
}

export interface HandlerAdminIceEvent {
  readonly kind: "adminIceEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
}

export class AdminIceEvent implements Event {
  readonly kind = "adminIceEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    entity_id?: BiomesId;
  }) {
    this.id = id;
    this.entity_id = entity_id;
  }
}

export interface HandlerPlayerInitEvent {
  readonly kind: "playerInitEvent";
  readonly id: BiomesId;
}

export class PlayerInitEvent implements Event {
  readonly kind = "playerInitEvent";
  readonly id: BiomesId;

  constructor({ id = t.defaultBiomesId }: { id?: BiomesId }) {
    this.id = id;
  }
}

export interface HandlerUpdatePlayerHealthEvent {
  readonly kind: "updatePlayerHealthEvent";
  readonly id: BiomesId;
  hp: t.OptionalI32;
  hpDelta: t.OptionalI32;
  maxHp: t.OptionalI32;
  damageSource: t.OptionalDamageSource;
}

export class UpdatePlayerHealthEvent implements Event {
  readonly kind = "updatePlayerHealthEvent";
  readonly id: BiomesId;
  hp: t.ReadonlyOptionalI32;
  hpDelta: t.ReadonlyOptionalI32;
  maxHp: t.ReadonlyOptionalI32;
  damageSource: t.ReadonlyOptionalDamageSource;

  constructor({
    id = t.defaultBiomesId,
    hp = t.defaultOptionalI32,
    hpDelta = t.defaultOptionalI32,
    maxHp = t.defaultOptionalI32,
    damageSource = t.defaultOptionalDamageSource,
  }: {
    id?: BiomesId;
    hp?: t.ReadonlyOptionalI32;
    hpDelta?: t.ReadonlyOptionalI32;
    maxHp?: t.ReadonlyOptionalI32;
    damageSource?: t.ReadonlyOptionalDamageSource;
  }) {
    this.id = id;
    this.hp = hp;
    this.hpDelta = hpDelta;
    this.maxHp = maxHp;
    this.damageSource = damageSource;
  }
}

export interface HandlerUpdateNpcHealthEvent {
  readonly kind: "updateNpcHealthEvent";
  readonly id: BiomesId;
  hp: t.I32;
  damageSource: t.OptionalDamageSource;
}

export class UpdateNpcHealthEvent implements Event {
  readonly kind = "updateNpcHealthEvent";
  readonly id: BiomesId;
  hp: t.ReadonlyI32;
  damageSource: t.ReadonlyOptionalDamageSource;

  constructor({
    id = t.defaultBiomesId,
    hp = t.defaultI32,
    damageSource = t.defaultOptionalDamageSource,
  }: {
    id?: BiomesId;
    hp?: t.ReadonlyI32;
    damageSource?: t.ReadonlyOptionalDamageSource;
  }) {
    this.id = id;
    this.hp = hp;
    this.damageSource = damageSource;
  }
}

export interface HandlerPickUpEvent {
  readonly kind: "pickUpEvent";
  readonly id: BiomesId;
  readonly item: BiomesId;
}

export class PickUpEvent implements Event {
  readonly kind = "pickUpEvent";
  readonly id: BiomesId;
  readonly item: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    item = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    item?: BiomesId;
  }) {
    this.id = id;
    this.item = item;
  }
}

export interface HandlerRemoveMapBeamEvent {
  readonly kind: "removeMapBeamEvent";
  readonly id: BiomesId;
  beam_client_id: t.I32;
  beam_location: t.Vec2f;
}

export class RemoveMapBeamEvent implements Event {
  readonly kind = "removeMapBeamEvent";
  readonly id: BiomesId;
  beam_client_id: t.ReadonlyI32;
  beam_location: t.ReadonlyVec2f;

  constructor({
    id = t.defaultBiomesId,
    beam_client_id = t.defaultI32,
    beam_location = t.defaultVec2f(),
  }: {
    id?: BiomesId;
    beam_client_id?: t.ReadonlyI32;
    beam_location?: t.ReadonlyVec2f;
  }) {
    this.id = id;
    this.beam_client_id = beam_client_id;
    this.beam_location = beam_location;
  }
}

export interface HandlerSetNUXStatusEvent {
  readonly kind: "setNUXStatusEvent";
  readonly id: BiomesId;
  nux_id: t.I32;
  status: t.NUXStatus;
}

export class SetNUXStatusEvent implements Event {
  readonly kind = "setNUXStatusEvent";
  readonly id: BiomesId;
  nux_id: t.ReadonlyI32;
  status: t.ReadonlyNUXStatus;

  constructor({
    id = t.defaultBiomesId,
    nux_id = t.defaultI32,
    status = t.defaultNUXStatus(),
  }: {
    id?: BiomesId;
    nux_id?: t.ReadonlyI32;
    status?: t.ReadonlyNUXStatus;
  }) {
    this.id = id;
    this.nux_id = nux_id;
    this.status = status;
  }
}

export interface HandlerAcceptChallengeEvent {
  readonly kind: "acceptChallengeEvent";
  readonly id: BiomesId;
  readonly challenge_id: BiomesId;
  readonly npc_id: BiomesId;
  chosen_gift_index: t.I32;
}

export class AcceptChallengeEvent implements Event {
  readonly kind = "acceptChallengeEvent";
  readonly id: BiomesId;
  readonly challenge_id: BiomesId;
  readonly npc_id: BiomesId;
  chosen_gift_index: t.ReadonlyI32;

  constructor({
    id = t.defaultBiomesId,
    challenge_id = t.defaultBiomesId,
    npc_id = t.defaultBiomesId,
    chosen_gift_index = t.defaultI32,
  }: {
    id?: BiomesId;
    challenge_id?: BiomesId;
    npc_id?: BiomesId;
    chosen_gift_index?: t.ReadonlyI32;
  }) {
    this.id = id;
    this.challenge_id = challenge_id;
    this.npc_id = npc_id;
    this.chosen_gift_index = chosen_gift_index;
  }
}

export interface HandlerCompleteQuestStepAtEntityEvent {
  readonly kind: "completeQuestStepAtEntityEvent";
  readonly id: BiomesId;
  readonly challenge_id: BiomesId;
  readonly entity_id: BiomesId;
  readonly step_id: BiomesId;
  chosen_reward_index: t.I32;
}

export class CompleteQuestStepAtEntityEvent implements Event {
  readonly kind = "completeQuestStepAtEntityEvent";
  readonly id: BiomesId;
  readonly challenge_id: BiomesId;
  readonly entity_id: BiomesId;
  readonly step_id: BiomesId;
  chosen_reward_index: t.ReadonlyI32;

  constructor({
    id = t.defaultBiomesId,
    challenge_id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
    step_id = t.defaultBiomesId,
    chosen_reward_index = t.defaultI32,
  }: {
    id?: BiomesId;
    challenge_id?: BiomesId;
    entity_id?: BiomesId;
    step_id?: BiomesId;
    chosen_reward_index?: t.ReadonlyI32;
  }) {
    this.id = id;
    this.challenge_id = challenge_id;
    this.entity_id = entity_id;
    this.step_id = step_id;
    this.chosen_reward_index = chosen_reward_index;
  }
}

export interface HandlerResetChallengeEvent {
  readonly kind: "resetChallengeEvent";
  readonly id: BiomesId;
  readonly challenge_id: BiomesId;
}

export class ResetChallengeEvent implements Event {
  readonly kind = "resetChallengeEvent";
  readonly id: BiomesId;
  readonly challenge_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    challenge_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    challenge_id?: BiomesId;
  }) {
    this.id = id;
    this.challenge_id = challenge_id;
  }
}

export interface HandlerExpireBuffsEvent {
  readonly kind: "expireBuffsEvent";
  readonly id: BiomesId;
}

export class ExpireBuffsEvent implements Event {
  readonly kind = "expireBuffsEvent";
  readonly id: BiomesId;

  constructor({ id = t.defaultBiomesId }: { id?: BiomesId }) {
    this.id = id;
  }
}

export interface HandlerExpireRobotEvent {
  readonly kind: "expireRobotEvent";
  readonly id: BiomesId;
}

export class ExpireRobotEvent implements Event {
  readonly kind = "expireRobotEvent";
  readonly id: BiomesId;

  constructor({ id = t.defaultBiomesId }: { id?: BiomesId }) {
    this.id = id;
  }
}

export interface HandlerAdminEditPresetEvent {
  readonly kind: "adminEditPresetEvent";
  readonly id: BiomesId;
  readonly preset_id: BiomesId;
  name: t.String;
}

export class AdminEditPresetEvent implements Event {
  readonly kind = "adminEditPresetEvent";
  readonly id: BiomesId;
  readonly preset_id: BiomesId;
  name: t.ReadonlyString;

  constructor({
    id = t.defaultBiomesId,
    preset_id = t.defaultBiomesId,
    name = t.defaultString,
  }: {
    id?: BiomesId;
    preset_id?: BiomesId;
    name?: t.ReadonlyString;
  }) {
    this.id = id;
    this.preset_id = preset_id;
    this.name = name;
  }
}

export interface HandlerAdminSavePresetEvent {
  readonly kind: "adminSavePresetEvent";
  readonly id: BiomesId;
  name: t.String;
  readonly preset_id: BiomesId;
  readonly player_id: BiomesId;
}

export class AdminSavePresetEvent implements Event {
  readonly kind = "adminSavePresetEvent";
  readonly id: BiomesId;
  name: t.ReadonlyString;
  readonly preset_id: BiomesId;
  readonly player_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    name = t.defaultString,
    preset_id = t.defaultBiomesId,
    player_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    name?: t.ReadonlyString;
    preset_id?: BiomesId;
    player_id?: BiomesId;
  }) {
    this.id = id;
    this.name = name;
    this.preset_id = preset_id;
    this.player_id = player_id;
  }
}

export interface HandlerAdminLoadPresetEvent {
  readonly kind: "adminLoadPresetEvent";
  readonly id: BiomesId;
  readonly preset_id: BiomesId;
  readonly player_id: BiomesId;
}

export class AdminLoadPresetEvent implements Event {
  readonly kind = "adminLoadPresetEvent";
  readonly id: BiomesId;
  readonly preset_id: BiomesId;
  readonly player_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    preset_id = t.defaultBiomesId,
    player_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    preset_id?: BiomesId;
    player_id?: BiomesId;
  }) {
    this.id = id;
    this.preset_id = preset_id;
    this.player_id = player_id;
  }
}

export interface HandlerTillSoilEvent {
  readonly kind: "tillSoilEvent";
  readonly id: BiomesId;
  positions: t.Vec3iList;
  shard_ids: t.BiomesIdList;
  tool_ref: t.OwnedItemReference;
  occupancy_ids: t.BiomesIdList;
}

export class TillSoilEvent implements Event {
  readonly kind = "tillSoilEvent";
  readonly id: BiomesId;
  positions: t.ReadonlyVec3iList;
  shard_ids: t.ReadonlyBiomesIdList;
  tool_ref: t.ReadonlyOwnedItemReference;
  occupancy_ids: t.ReadonlyBiomesIdList;

  constructor({
    id = t.defaultBiomesId,
    positions = t.defaultVec3iList(),
    shard_ids = t.defaultBiomesIdList(),
    tool_ref = t.defaultOwnedItemReference(),
    occupancy_ids = t.defaultBiomesIdList(),
  }: {
    id?: BiomesId;
    positions?: t.ReadonlyVec3iList;
    shard_ids?: t.ReadonlyBiomesIdList;
    tool_ref?: t.ReadonlyOwnedItemReference;
    occupancy_ids?: t.ReadonlyBiomesIdList;
  }) {
    this.id = id;
    this.positions = positions;
    this.shard_ids = shard_ids;
    this.tool_ref = tool_ref;
    this.occupancy_ids = occupancy_ids;
  }
}

export interface HandlerPlantSeedEvent {
  readonly kind: "plantSeedEvent";
  readonly id: BiomesId;
  position: t.Vec3i;
  readonly user_id: BiomesId;
  seed: t.OwnedItemReference;
  occupancy_id: t.OptionalBiomesId;
  existing_farming_id: t.OptionalBiomesId;
}

export class PlantSeedEvent implements Event {
  readonly kind = "plantSeedEvent";
  readonly id: BiomesId;
  position: t.ReadonlyVec3i;
  readonly user_id: BiomesId;
  seed: t.ReadonlyOwnedItemReference;
  occupancy_id: t.ReadonlyOptionalBiomesId;
  existing_farming_id: t.ReadonlyOptionalBiomesId;

  constructor({
    id = t.defaultBiomesId,
    position = t.defaultVec3i(),
    user_id = t.defaultBiomesId,
    seed = t.defaultOwnedItemReference(),
    occupancy_id = t.defaultOptionalBiomesId,
    existing_farming_id = t.defaultOptionalBiomesId,
  }: {
    id?: BiomesId;
    position?: t.ReadonlyVec3i;
    user_id?: BiomesId;
    seed?: t.ReadonlyOwnedItemReference;
    occupancy_id?: t.ReadonlyOptionalBiomesId;
    existing_farming_id?: t.ReadonlyOptionalBiomesId;
  }) {
    this.id = id;
    this.position = position;
    this.user_id = user_id;
    this.seed = seed;
    this.occupancy_id = occupancy_id;
    this.existing_farming_id = existing_farming_id;
  }
}

export interface HandlerWaterPlantsEvent {
  readonly kind: "waterPlantsEvent";
  readonly id: BiomesId;
  plant_ids: t.BiomesIdList;
  tool_ref: t.OwnedItemReference;
}

export class WaterPlantsEvent implements Event {
  readonly kind = "waterPlantsEvent";
  readonly id: BiomesId;
  plant_ids: t.ReadonlyBiomesIdList;
  tool_ref: t.ReadonlyOwnedItemReference;

  constructor({
    id = t.defaultBiomesId,
    plant_ids = t.defaultBiomesIdList(),
    tool_ref = t.defaultOwnedItemReference(),
  }: {
    id?: BiomesId;
    plant_ids?: t.ReadonlyBiomesIdList;
    tool_ref?: t.ReadonlyOwnedItemReference;
  }) {
    this.id = id;
    this.plant_ids = plant_ids;
    this.tool_ref = tool_ref;
  }
}

export interface HandlerFertilizePlantEvent {
  readonly kind: "fertilizePlantEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  tool_ref: t.OwnedItemReference;
}

export class FertilizePlantEvent implements Event {
  readonly kind = "fertilizePlantEvent";
  readonly id: BiomesId;
  readonly user_id: BiomesId;
  tool_ref: t.ReadonlyOwnedItemReference;

  constructor({
    id = t.defaultBiomesId,
    user_id = t.defaultBiomesId,
    tool_ref = t.defaultOwnedItemReference(),
  }: {
    id?: BiomesId;
    user_id?: BiomesId;
    tool_ref?: t.ReadonlyOwnedItemReference;
  }) {
    this.id = id;
    this.user_id = user_id;
    this.tool_ref = tool_ref;
  }
}

export interface HandlerAdminDestroyPlantEvent {
  readonly kind: "adminDestroyPlantEvent";
  readonly id: BiomesId;
  readonly plant_id: BiomesId;
}

export class AdminDestroyPlantEvent implements Event {
  readonly kind = "adminDestroyPlantEvent";
  readonly id: BiomesId;
  readonly plant_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    plant_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    plant_id?: BiomesId;
  }) {
    this.id = id;
    this.plant_id = plant_id;
  }
}

export interface HandlerFishingClaimEvent {
  readonly kind: "fishingClaimEvent";
  readonly id: BiomesId;
  bag: t.ItemBag;
  tool_ref: t.OwnedItemReference;
  catch_time: t.F64;
}

export class FishingClaimEvent implements Event {
  readonly kind = "fishingClaimEvent";
  readonly id: BiomesId;
  bag: t.ReadonlyItemBag;
  tool_ref: t.ReadonlyOwnedItemReference;
  catch_time: t.ReadonlyF64;

  constructor({
    id = t.defaultBiomesId,
    bag = t.defaultItemBag(),
    tool_ref = t.defaultOwnedItemReference(),
    catch_time = t.defaultF64,
  }: {
    id?: BiomesId;
    bag?: t.ReadonlyItemBag;
    tool_ref?: t.ReadonlyOwnedItemReference;
    catch_time?: t.ReadonlyF64;
  }) {
    this.id = id;
    this.bag = bag;
    this.tool_ref = tool_ref;
    this.catch_time = catch_time;
  }
}

export interface HandlerFishingCaughtEvent {
  readonly kind: "fishingCaughtEvent";
  readonly id: BiomesId;
  bag: t.ItemBag;
}

export class FishingCaughtEvent implements Event {
  readonly kind = "fishingCaughtEvent";
  readonly id: BiomesId;
  bag: t.ReadonlyItemBag;

  constructor({
    id = t.defaultBiomesId,
    bag = t.defaultItemBag(),
  }: {
    id?: BiomesId;
    bag?: t.ReadonlyItemBag;
  }) {
    this.id = id;
    this.bag = bag;
  }
}

export interface HandlerFishingFailedEvent {
  readonly kind: "fishingFailedEvent";
  readonly id: BiomesId;
  tool_ref: t.OwnedItemReference;
  catch_time: t.F64;
}

export class FishingFailedEvent implements Event {
  readonly kind = "fishingFailedEvent";
  readonly id: BiomesId;
  tool_ref: t.ReadonlyOwnedItemReference;
  catch_time: t.ReadonlyF64;

  constructor({
    id = t.defaultBiomesId,
    tool_ref = t.defaultOwnedItemReference(),
    catch_time = t.defaultF64,
  }: {
    id?: BiomesId;
    tool_ref?: t.ReadonlyOwnedItemReference;
    catch_time?: t.ReadonlyF64;
  }) {
    this.id = id;
    this.tool_ref = tool_ref;
    this.catch_time = catch_time;
  }
}

export interface HandlerFishingConsumeBaitEvent {
  readonly kind: "fishingConsumeBaitEvent";
  readonly id: BiomesId;
  ref: t.OwnedItemReference;
  readonly item_id: BiomesId;
}

export class FishingConsumeBaitEvent implements Event {
  readonly kind = "fishingConsumeBaitEvent";
  readonly id: BiomesId;
  ref: t.ReadonlyOwnedItemReference;
  readonly item_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    ref = t.defaultOwnedItemReference(),
    item_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    ref?: t.ReadonlyOwnedItemReference;
    item_id?: BiomesId;
  }) {
    this.id = id;
    this.ref = ref;
    this.item_id = item_id;
  }
}

export interface HandlerTreasureRollEvent {
  readonly kind: "treasureRollEvent";
  readonly id: BiomesId;
  ref: t.OwnedItemReference;
  item: t.Item;
}

export class TreasureRollEvent implements Event {
  readonly kind = "treasureRollEvent";
  readonly id: BiomesId;
  ref: t.ReadonlyOwnedItemReference;
  item: t.ReadonlyItem;

  constructor({
    id = t.defaultBiomesId,
    ref = t.defaultOwnedItemReference(),
    item = t.defaultItem(),
  }: {
    id?: BiomesId;
    ref?: t.ReadonlyOwnedItemReference;
    item?: t.ReadonlyItem;
  }) {
    this.id = id;
    this.ref = ref;
    this.item = item;
  }
}

export interface HandlerCreateOrJoinSpleefEvent {
  readonly kind: "createOrJoinSpleefEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  minigame_instance_id: t.OptionalBiomesId;
  box: t.Box2;
}

export class CreateOrJoinSpleefEvent implements Event {
  readonly kind = "createOrJoinSpleefEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  minigame_instance_id: t.ReadonlyOptionalBiomesId;
  box: t.ReadonlyBox2;

  constructor({
    id = t.defaultBiomesId,
    minigame_id = t.defaultBiomesId,
    minigame_instance_id = t.defaultOptionalBiomesId,
    box = t.defaultBox2(),
  }: {
    id?: BiomesId;
    minigame_id?: BiomesId;
    minigame_instance_id?: t.ReadonlyOptionalBiomesId;
    box?: t.ReadonlyBox2;
  }) {
    this.id = id;
    this.minigame_id = minigame_id;
    this.minigame_instance_id = minigame_instance_id;
    this.box = box;
  }
}

export interface HandlerJoinDeathmatchEvent {
  readonly kind: "joinDeathmatchEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  minigame_instance_id: t.OptionalBiomesId;
}

export class JoinDeathmatchEvent implements Event {
  readonly kind = "joinDeathmatchEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  minigame_instance_id: t.ReadonlyOptionalBiomesId;

  constructor({
    id = t.defaultBiomesId,
    minigame_id = t.defaultBiomesId,
    minigame_instance_id = t.defaultOptionalBiomesId,
  }: {
    id?: BiomesId;
    minigame_id?: BiomesId;
    minigame_instance_id?: t.ReadonlyOptionalBiomesId;
  }) {
    this.id = id;
    this.minigame_id = minigame_id;
    this.minigame_instance_id = minigame_instance_id;
  }
}

export interface HandlerFinishSimpleRaceMinigameEvent {
  readonly kind: "finishSimpleRaceMinigameEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_element_id: BiomesId;
  readonly minigame_instance_id: BiomesId;
}

export class FinishSimpleRaceMinigameEvent implements Event {
  readonly kind = "finishSimpleRaceMinigameEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_element_id: BiomesId;
  readonly minigame_instance_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    minigame_id = t.defaultBiomesId,
    minigame_element_id = t.defaultBiomesId,
    minigame_instance_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    minigame_id?: BiomesId;
    minigame_element_id?: BiomesId;
    minigame_instance_id?: BiomesId;
  }) {
    this.id = id;
    this.minigame_id = minigame_id;
    this.minigame_element_id = minigame_element_id;
    this.minigame_instance_id = minigame_instance_id;
  }
}

export interface HandlerStartSimpleRaceMinigameEvent {
  readonly kind: "startSimpleRaceMinigameEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_element_id: BiomesId;
}

export class StartSimpleRaceMinigameEvent implements Event {
  readonly kind = "startSimpleRaceMinigameEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_element_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    minigame_id = t.defaultBiomesId,
    minigame_element_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    minigame_id?: BiomesId;
    minigame_element_id?: BiomesId;
  }) {
    this.id = id;
    this.minigame_id = minigame_id;
    this.minigame_element_id = minigame_element_id;
  }
}

export interface HandlerReachStartSimpleRaceMinigameEvent {
  readonly kind: "reachStartSimpleRaceMinigameEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_element_id: BiomesId;
  readonly minigame_instance_id: BiomesId;
}

export class ReachStartSimpleRaceMinigameEvent implements Event {
  readonly kind = "reachStartSimpleRaceMinigameEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_element_id: BiomesId;
  readonly minigame_instance_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    minigame_id = t.defaultBiomesId,
    minigame_element_id = t.defaultBiomesId,
    minigame_instance_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    minigame_id?: BiomesId;
    minigame_element_id?: BiomesId;
    minigame_instance_id?: BiomesId;
  }) {
    this.id = id;
    this.minigame_id = minigame_id;
    this.minigame_element_id = minigame_element_id;
    this.minigame_instance_id = minigame_instance_id;
  }
}

export interface HandlerReachCheckpointSimpleRaceMinigameEvent {
  readonly kind: "reachCheckpointSimpleRaceMinigameEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_element_id: BiomesId;
  readonly minigame_instance_id: BiomesId;
}

export class ReachCheckpointSimpleRaceMinigameEvent implements Event {
  readonly kind = "reachCheckpointSimpleRaceMinigameEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_element_id: BiomesId;
  readonly minigame_instance_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    minigame_id = t.defaultBiomesId,
    minigame_element_id = t.defaultBiomesId,
    minigame_instance_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    minigame_id?: BiomesId;
    minigame_element_id?: BiomesId;
    minigame_instance_id?: BiomesId;
  }) {
    this.id = id;
    this.minigame_id = minigame_id;
    this.minigame_element_id = minigame_element_id;
    this.minigame_instance_id = minigame_instance_id;
  }
}

export interface HandlerRestartSimpleRaceMinigameEvent {
  readonly kind: "restartSimpleRaceMinigameEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_instance_id: BiomesId;
}

export class RestartSimpleRaceMinigameEvent implements Event {
  readonly kind = "restartSimpleRaceMinigameEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_instance_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    minigame_id = t.defaultBiomesId,
    minigame_instance_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    minigame_id?: BiomesId;
    minigame_instance_id?: BiomesId;
  }) {
    this.id = id;
    this.minigame_id = minigame_id;
    this.minigame_instance_id = minigame_instance_id;
  }
}

export interface HandlerTagMinigameHitPlayerEvent {
  readonly kind: "tagMinigameHitPlayerEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_instance_id: BiomesId;
  readonly hit_player_id: BiomesId;
}

export class TagMinigameHitPlayerEvent implements Event {
  readonly kind = "tagMinigameHitPlayerEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_instance_id: BiomesId;
  readonly hit_player_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    minigame_id = t.defaultBiomesId,
    minigame_instance_id = t.defaultBiomesId,
    hit_player_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    minigame_id?: BiomesId;
    minigame_instance_id?: BiomesId;
    hit_player_id?: BiomesId;
  }) {
    this.id = id;
    this.minigame_id = minigame_id;
    this.minigame_instance_id = minigame_instance_id;
    this.hit_player_id = hit_player_id;
  }
}

export interface HandlerQuitMinigameEvent {
  readonly kind: "quitMinigameEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_instance_id: BiomesId;
}

export class QuitMinigameEvent implements Event {
  readonly kind = "quitMinigameEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_instance_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    minigame_id = t.defaultBiomesId,
    minigame_instance_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    minigame_id?: BiomesId;
    minigame_instance_id?: BiomesId;
  }) {
    this.id = id;
    this.minigame_id = minigame_id;
    this.minigame_instance_id = minigame_instance_id;
  }
}

export interface HandlerGiveMinigameKitEvent {
  readonly kind: "giveMinigameKitEvent";
  readonly id: BiomesId;
  kit: t.GiveMinigameKitData;
}

export class GiveMinigameKitEvent implements Event {
  readonly kind = "giveMinigameKitEvent";
  readonly id: BiomesId;
  kit: t.ReadonlyGiveMinigameKitData;

  constructor({
    id = t.defaultBiomesId,
    kit = t.defaultGiveMinigameKitData(),
  }: {
    id?: BiomesId;
    kit?: t.ReadonlyGiveMinigameKitData;
  }) {
    this.id = id;
    this.kit = kit;
  }
}

export interface HandlerTouchMinigameStatsEvent {
  readonly kind: "touchMinigameStatsEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
}

export class TouchMinigameStatsEvent implements Event {
  readonly kind = "touchMinigameStatsEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    minigame_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    minigame_id?: BiomesId;
  }) {
    this.id = id;
    this.minigame_id = minigame_id;
  }
}

export interface HandlerEditMinigameMetadataEvent {
  readonly kind: "editMinigameMetadataEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  label: t.OptionalString;
  hero_photo_id: t.OptionalBiomesId;
  minigame_settings: t.OptionalBuffer;
  entry_price: t.OptionalF64;
}

export class EditMinigameMetadataEvent implements Event {
  readonly kind = "editMinigameMetadataEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  label: t.ReadonlyOptionalString;
  hero_photo_id: t.ReadonlyOptionalBiomesId;
  minigame_settings: t.ReadonlyOptionalBuffer;
  entry_price: t.ReadonlyOptionalF64;

  constructor({
    id = t.defaultBiomesId,
    minigame_id = t.defaultBiomesId,
    label = t.defaultOptionalString,
    hero_photo_id = t.defaultOptionalBiomesId,
    minigame_settings = t.defaultOptionalBuffer,
    entry_price = t.defaultOptionalF64,
  }: {
    id?: BiomesId;
    minigame_id?: BiomesId;
    label?: t.ReadonlyOptionalString;
    hero_photo_id?: t.ReadonlyOptionalBiomesId;
    minigame_settings?: t.ReadonlyOptionalBuffer;
    entry_price?: t.ReadonlyOptionalF64;
  }) {
    this.id = id;
    this.minigame_id = minigame_id;
    this.label = label;
    this.hero_photo_id = hero_photo_id;
    this.minigame_settings = minigame_settings;
    this.entry_price = entry_price;
  }
}

export interface HandlerMinigameInstanceTickEvent {
  readonly kind: "minigameInstanceTickEvent";
  readonly minigame_id: BiomesId;
  readonly minigame_instance_id: BiomesId;
  denorm_space_clipboard_info: t.OptionalMinigameInstanceSpaceClipboardInfo;
}

export class MinigameInstanceTickEvent implements Event {
  readonly kind = "minigameInstanceTickEvent";
  readonly minigame_id: BiomesId;
  readonly minigame_instance_id: BiomesId;
  denorm_space_clipboard_info: t.ReadonlyOptionalMinigameInstanceSpaceClipboardInfo;

  constructor({
    minigame_id = t.defaultBiomesId,
    minigame_instance_id = t.defaultBiomesId,
    denorm_space_clipboard_info = t.defaultOptionalMinigameInstanceSpaceClipboardInfo,
  }: {
    minigame_id?: BiomesId;
    minigame_instance_id?: BiomesId;
    denorm_space_clipboard_info?: t.ReadonlyOptionalMinigameInstanceSpaceClipboardInfo;
  }) {
    this.minigame_id = minigame_id;
    this.minigame_instance_id = minigame_instance_id;
    this.denorm_space_clipboard_info = denorm_space_clipboard_info;
  }
}

export interface HandlerExpireMinigameInstanceEvent {
  readonly kind: "expireMinigameInstanceEvent";
  readonly minigame_id: BiomesId;
  readonly minigame_instance_id: BiomesId;
  denorm_space_clipboard_info: t.OptionalMinigameInstanceSpaceClipboardInfo;
}

export class ExpireMinigameInstanceEvent implements Event {
  readonly kind = "expireMinigameInstanceEvent";
  readonly minigame_id: BiomesId;
  readonly minigame_instance_id: BiomesId;
  denorm_space_clipboard_info: t.ReadonlyOptionalMinigameInstanceSpaceClipboardInfo;

  constructor({
    minigame_id = t.defaultBiomesId,
    minigame_instance_id = t.defaultBiomesId,
    denorm_space_clipboard_info = t.defaultOptionalMinigameInstanceSpaceClipboardInfo,
  }: {
    minigame_id?: BiomesId;
    minigame_instance_id?: BiomesId;
    denorm_space_clipboard_info?: t.ReadonlyOptionalMinigameInstanceSpaceClipboardInfo;
  }) {
    this.minigame_id = minigame_id;
    this.minigame_instance_id = minigame_instance_id;
    this.denorm_space_clipboard_info = denorm_space_clipboard_info;
  }
}

export interface HandlerAssociateMinigameElementEvent {
  readonly kind: "associateMinigameElementEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_element_id: BiomesId;
  old_minigame_id: t.OptionalBiomesId;
}

export class AssociateMinigameElementEvent implements Event {
  readonly kind = "associateMinigameElementEvent";
  readonly id: BiomesId;
  readonly minigame_id: BiomesId;
  readonly minigame_element_id: BiomesId;
  old_minigame_id: t.ReadonlyOptionalBiomesId;

  constructor({
    id = t.defaultBiomesId,
    minigame_id = t.defaultBiomesId,
    minigame_element_id = t.defaultBiomesId,
    old_minigame_id = t.defaultOptionalBiomesId,
  }: {
    id?: BiomesId;
    minigame_id?: BiomesId;
    minigame_element_id?: BiomesId;
    old_minigame_id?: t.ReadonlyOptionalBiomesId;
  }) {
    this.id = id;
    this.minigame_id = minigame_id;
    this.minigame_element_id = minigame_element_id;
    this.old_minigame_id = old_minigame_id;
  }
}

export interface HandlerCreateMinigameThroughAssocationEvent {
  readonly kind: "createMinigameThroughAssocationEvent";
  readonly id: BiomesId;
  name: t.String;
  minigameType: t.MinigameType;
  readonly minigame_element_id: BiomesId;
  old_minigame_id: t.OptionalBiomesId;
}

export class CreateMinigameThroughAssocationEvent implements Event {
  readonly kind = "createMinigameThroughAssocationEvent";
  readonly id: BiomesId;
  name: t.ReadonlyString;
  minigameType: t.ReadonlyMinigameType;
  readonly minigame_element_id: BiomesId;
  old_minigame_id: t.ReadonlyOptionalBiomesId;

  constructor({
    id = t.defaultBiomesId,
    name = t.defaultString,
    minigameType = t.defaultMinigameType,
    minigame_element_id = t.defaultBiomesId,
    old_minigame_id = t.defaultOptionalBiomesId,
  }: {
    id?: BiomesId;
    name?: t.ReadonlyString;
    minigameType?: t.ReadonlyMinigameType;
    minigame_element_id?: BiomesId;
    old_minigame_id?: t.ReadonlyOptionalBiomesId;
  }) {
    this.id = id;
    this.name = name;
    this.minigameType = minigameType;
    this.minigame_element_id = minigame_element_id;
    this.old_minigame_id = old_minigame_id;
  }
}

export interface HandlerAckWarpEvent {
  readonly kind: "ackWarpEvent";
  readonly id: BiomesId;
}

export class AckWarpEvent implements Event {
  readonly kind = "ackWarpEvent";
  readonly id: BiomesId;

  constructor({ id = t.defaultBiomesId }: { id?: BiomesId }) {
    this.id = id;
  }
}

export interface HandlerReplenishWateringCanEvent {
  readonly kind: "replenishWateringCanEvent";
  readonly id: BiomesId;
  position: t.Vec3i;
  tool_ref: t.OwnedItemReference;
  readonly user_id: BiomesId;
}

export class ReplenishWateringCanEvent implements Event {
  readonly kind = "replenishWateringCanEvent";
  readonly id: BiomesId;
  position: t.ReadonlyVec3i;
  tool_ref: t.ReadonlyOwnedItemReference;
  readonly user_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    position = t.defaultVec3i(),
    tool_ref = t.defaultOwnedItemReference(),
    user_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    position?: t.ReadonlyVec3i;
    tool_ref?: t.ReadonlyOwnedItemReference;
    user_id?: BiomesId;
  }) {
    this.id = id;
    this.position = position;
    this.tool_ref = tool_ref;
    this.user_id = user_id;
  }
}

export interface HandlerSpaceClipboardWandCutEvent {
  readonly kind: "spaceClipboardWandCutEvent";
  readonly id: BiomesId;
  item_ref: t.OwnedItemReference;
  box: t.Box2;
}

export class SpaceClipboardWandCutEvent implements Event {
  readonly kind = "spaceClipboardWandCutEvent";
  readonly id: BiomesId;
  item_ref: t.ReadonlyOwnedItemReference;
  box: t.ReadonlyBox2;

  constructor({
    id = t.defaultBiomesId,
    item_ref = t.defaultOwnedItemReference(),
    box = t.defaultBox2(),
  }: {
    id?: BiomesId;
    item_ref?: t.ReadonlyOwnedItemReference;
    box?: t.ReadonlyBox2;
  }) {
    this.id = id;
    this.item_ref = item_ref;
    this.box = box;
  }
}

export interface HandlerSpaceClipboardWandCopyEvent {
  readonly kind: "spaceClipboardWandCopyEvent";
  readonly id: BiomesId;
  item_ref: t.OwnedItemReference;
  box: t.Box2;
}

export class SpaceClipboardWandCopyEvent implements Event {
  readonly kind = "spaceClipboardWandCopyEvent";
  readonly id: BiomesId;
  item_ref: t.ReadonlyOwnedItemReference;
  box: t.ReadonlyBox2;

  constructor({
    id = t.defaultBiomesId,
    item_ref = t.defaultOwnedItemReference(),
    box = t.defaultBox2(),
  }: {
    id?: BiomesId;
    item_ref?: t.ReadonlyOwnedItemReference;
    box?: t.ReadonlyBox2;
  }) {
    this.id = id;
    this.item_ref = item_ref;
    this.box = box;
  }
}

export interface HandlerSpaceClipboardWandPasteEvent {
  readonly kind: "spaceClipboardWandPasteEvent";
  readonly id: BiomesId;
  item_ref: t.OwnedItemReference;
  readonly space_entity_id: BiomesId;
  new_box: t.Box2;
}

export class SpaceClipboardWandPasteEvent implements Event {
  readonly kind = "spaceClipboardWandPasteEvent";
  readonly id: BiomesId;
  item_ref: t.ReadonlyOwnedItemReference;
  readonly space_entity_id: BiomesId;
  new_box: t.ReadonlyBox2;

  constructor({
    id = t.defaultBiomesId,
    item_ref = t.defaultOwnedItemReference(),
    space_entity_id = t.defaultBiomesId,
    new_box = t.defaultBox2(),
  }: {
    id?: BiomesId;
    item_ref?: t.ReadonlyOwnedItemReference;
    space_entity_id?: BiomesId;
    new_box?: t.ReadonlyBox2;
  }) {
    this.id = id;
    this.item_ref = item_ref;
    this.space_entity_id = space_entity_id;
    this.new_box = new_box;
  }
}

export interface HandlerSpaceClipboardWandDiscardEvent {
  readonly kind: "spaceClipboardWandDiscardEvent";
  readonly id: BiomesId;
  item_ref: t.OwnedItemReference;
  readonly space_entity_id: BiomesId;
  new_box: t.Box2;
}

export class SpaceClipboardWandDiscardEvent implements Event {
  readonly kind = "spaceClipboardWandDiscardEvent";
  readonly id: BiomesId;
  item_ref: t.ReadonlyOwnedItemReference;
  readonly space_entity_id: BiomesId;
  new_box: t.ReadonlyBox2;

  constructor({
    id = t.defaultBiomesId,
    item_ref = t.defaultOwnedItemReference(),
    space_entity_id = t.defaultBiomesId,
    new_box = t.defaultBox2(),
  }: {
    id?: BiomesId;
    item_ref?: t.ReadonlyOwnedItemReference;
    space_entity_id?: BiomesId;
    new_box?: t.ReadonlyBox2;
  }) {
    this.id = id;
    this.item_ref = item_ref;
    this.space_entity_id = space_entity_id;
    this.new_box = new_box;
  }
}

export interface HandlerNegaWandRestoreEvent {
  readonly kind: "negaWandRestoreEvent";
  readonly id: BiomesId;
  item_ref: t.OwnedItemReference;
  box: t.Box2;
}

export class NegaWandRestoreEvent implements Event {
  readonly kind = "negaWandRestoreEvent";
  readonly id: BiomesId;
  item_ref: t.ReadonlyOwnedItemReference;
  box: t.ReadonlyBox2;

  constructor({
    id = t.defaultBiomesId,
    item_ref = t.defaultOwnedItemReference(),
    box = t.defaultBox2(),
  }: {
    id?: BiomesId;
    item_ref?: t.ReadonlyOwnedItemReference;
    box?: t.ReadonlyBox2;
  }) {
    this.id = id;
    this.item_ref = item_ref;
    this.box = box;
  }
}

export interface HandlerPlacerWandEvent {
  readonly kind: "placerWandEvent";
  readonly id: BiomesId;
  item_ref: t.OwnedItemReference;
  positions: t.Vec3iList;
}

export class PlacerWandEvent implements Event {
  readonly kind = "placerWandEvent";
  readonly id: BiomesId;
  item_ref: t.ReadonlyOwnedItemReference;
  positions: t.ReadonlyVec3iList;

  constructor({
    id = t.defaultBiomesId,
    item_ref = t.defaultOwnedItemReference(),
    positions = t.defaultVec3iList(),
  }: {
    id?: BiomesId;
    item_ref?: t.ReadonlyOwnedItemReference;
    positions?: t.ReadonlyVec3iList;
  }) {
    this.id = id;
    this.item_ref = item_ref;
    this.positions = positions;
  }
}

export interface HandlerClearPlacerEvent {
  readonly kind: "clearPlacerEvent";
  readonly id: BiomesId;
  item_ref: t.OwnedItemReference;
  positions: t.Vec3iList;
}

export class ClearPlacerEvent implements Event {
  readonly kind = "clearPlacerEvent";
  readonly id: BiomesId;
  item_ref: t.ReadonlyOwnedItemReference;
  positions: t.ReadonlyVec3iList;

  constructor({
    id = t.defaultBiomesId,
    item_ref = t.defaultOwnedItemReference(),
    positions = t.defaultVec3iList(),
  }: {
    id?: BiomesId;
    item_ref?: t.ReadonlyOwnedItemReference;
    positions?: t.ReadonlyVec3iList;
  }) {
    this.id = id;
    this.item_ref = item_ref;
    this.positions = positions;
  }
}

export interface HandlerDespawnWandEvent {
  readonly kind: "despawnWandEvent";
  readonly id: BiomesId;
  item_ref: t.OwnedItemReference;
  readonly entityId: BiomesId;
}

export class DespawnWandEvent implements Event {
  readonly kind = "despawnWandEvent";
  readonly id: BiomesId;
  item_ref: t.ReadonlyOwnedItemReference;
  readonly entityId: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    item_ref = t.defaultOwnedItemReference(),
    entityId = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    item_ref?: t.ReadonlyOwnedItemReference;
    entityId?: BiomesId;
  }) {
    this.id = id;
    this.item_ref = item_ref;
    this.entityId = entityId;
  }
}

export interface HandlerSellToEntityEvent {
  readonly kind: "sellToEntityEvent";
  readonly id: BiomesId;
  readonly purchaser_id: BiomesId;
  readonly seller_id: BiomesId;
  src: t.InventoryAssignmentPattern;
}

export class SellToEntityEvent implements Event {
  readonly kind = "sellToEntityEvent";
  readonly id: BiomesId;
  readonly purchaser_id: BiomesId;
  readonly seller_id: BiomesId;
  src: t.ReadonlyInventoryAssignmentPattern;

  constructor({
    id = t.defaultBiomesId,
    purchaser_id = t.defaultBiomesId,
    seller_id = t.defaultBiomesId,
    src = t.defaultInventoryAssignmentPattern(),
  }: {
    id?: BiomesId;
    purchaser_id?: BiomesId;
    seller_id?: BiomesId;
    src?: t.ReadonlyInventoryAssignmentPattern;
  }) {
    this.id = id;
    this.purchaser_id = purchaser_id;
    this.seller_id = seller_id;
    this.src = src;
  }
}

export interface HandlerSetNPCPositionEvent {
  readonly kind: "setNPCPositionEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  position: t.OptionalVec3f;
  orientation: t.OptionalVec2f;
  update_spawn: t.OptionalBool;
}

export class SetNPCPositionEvent implements Event {
  readonly kind = "setNPCPositionEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  position: t.ReadonlyOptionalVec3f;
  orientation: t.ReadonlyOptionalVec2f;
  update_spawn: t.ReadonlyOptionalBool;

  constructor({
    id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
    position = t.defaultOptionalVec3f,
    orientation = t.defaultOptionalVec2f,
    update_spawn = t.defaultOptionalBool,
  }: {
    id?: BiomesId;
    entity_id?: BiomesId;
    position?: t.ReadonlyOptionalVec3f;
    orientation?: t.ReadonlyOptionalVec2f;
    update_spawn?: t.ReadonlyOptionalBool;
  }) {
    this.id = id;
    this.entity_id = entity_id;
    this.position = position;
    this.orientation = orientation;
    this.update_spawn = update_spawn;
  }
}

export interface HandlerAdminUpdateInspectionTweaksEvent {
  readonly kind: "adminUpdateInspectionTweaksEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  hidden: t.OptionalBool;
}

export class AdminUpdateInspectionTweaksEvent implements Event {
  readonly kind = "adminUpdateInspectionTweaksEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  hidden: t.ReadonlyOptionalBool;

  constructor({
    id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
    hidden = t.defaultOptionalBool,
  }: {
    id?: BiomesId;
    entity_id?: BiomesId;
    hidden?: t.ReadonlyOptionalBool;
  }) {
    this.id = id;
    this.entity_id = entity_id;
    this.hidden = hidden;
  }
}

export interface HandlerAdminECSDeleteComponentEvent {
  readonly kind: "adminECSDeleteComponentEvent";
  readonly id: BiomesId;
  readonly userId: BiomesId;
  field: t.String;
}

export class AdminECSDeleteComponentEvent implements Event {
  readonly kind = "adminECSDeleteComponentEvent";
  readonly id: BiomesId;
  readonly userId: BiomesId;
  field: t.ReadonlyString;

  constructor({
    id = t.defaultBiomesId,
    userId = t.defaultBiomesId,
    field = t.defaultString,
  }: {
    id?: BiomesId;
    userId?: BiomesId;
    field?: t.ReadonlyString;
  }) {
    this.id = id;
    this.userId = userId;
    this.field = field;
  }
}

export interface HandlerAdminECSAddComponentEvent {
  readonly kind: "adminECSAddComponentEvent";
  readonly id: BiomesId;
  readonly userId: BiomesId;
  field: t.String;
}

export class AdminECSAddComponentEvent implements Event {
  readonly kind = "adminECSAddComponentEvent";
  readonly id: BiomesId;
  readonly userId: BiomesId;
  field: t.ReadonlyString;

  constructor({
    id = t.defaultBiomesId,
    userId = t.defaultBiomesId,
    field = t.defaultString,
  }: {
    id?: BiomesId;
    userId?: BiomesId;
    field?: t.ReadonlyString;
  }) {
    this.id = id;
    this.userId = userId;
    this.field = field;
  }
}

export interface HandlerAdminECSUpdateComponentEvent {
  readonly kind: "adminECSUpdateComponentEvent";
  readonly id: BiomesId;
  readonly userId: BiomesId;
  path: t.Strings;
  value: t.String;
}

export class AdminECSUpdateComponentEvent implements Event {
  readonly kind = "adminECSUpdateComponentEvent";
  readonly id: BiomesId;
  readonly userId: BiomesId;
  path: t.ReadonlyStrings;
  value: t.ReadonlyString;

  constructor({
    id = t.defaultBiomesId,
    userId = t.defaultBiomesId,
    path = t.defaultStrings(),
    value = t.defaultString,
  }: {
    id?: BiomesId;
    userId?: BiomesId;
    path?: t.ReadonlyStrings;
    value?: t.ReadonlyString;
  }) {
    this.id = id;
    this.userId = userId;
    this.path = path;
    this.value = value;
  }
}

export interface HandlerCreateTeamEvent {
  readonly kind: "createTeamEvent";
  readonly id: BiomesId;
  name: t.String;
}

export class CreateTeamEvent implements Event {
  readonly kind = "createTeamEvent";
  readonly id: BiomesId;
  name: t.ReadonlyString;

  constructor({
    id = t.defaultBiomesId,
    name = t.defaultString,
  }: {
    id?: BiomesId;
    name?: t.ReadonlyString;
  }) {
    this.id = id;
    this.name = name;
  }
}

export interface HandlerUpdateTeamMetadataEvent {
  readonly kind: "updateTeamMetadataEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;
  name: t.OptionalString;
  icon: t.OptionalString;
  color: t.OptionalI32;
  hero_photo_id: t.OptionalBiomesId;
}

export class UpdateTeamMetadataEvent implements Event {
  readonly kind = "updateTeamMetadataEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;
  name: t.ReadonlyOptionalString;
  icon: t.ReadonlyOptionalString;
  color: t.ReadonlyOptionalI32;
  hero_photo_id: t.ReadonlyOptionalBiomesId;

  constructor({
    id = t.defaultBiomesId,
    team_id = t.defaultBiomesId,
    name = t.defaultOptionalString,
    icon = t.defaultOptionalString,
    color = t.defaultOptionalI32,
    hero_photo_id = t.defaultOptionalBiomesId,
  }: {
    id?: BiomesId;
    team_id?: BiomesId;
    name?: t.ReadonlyOptionalString;
    icon?: t.ReadonlyOptionalString;
    color?: t.ReadonlyOptionalI32;
    hero_photo_id?: t.ReadonlyOptionalBiomesId;
  }) {
    this.id = id;
    this.team_id = team_id;
    this.name = name;
    this.icon = icon;
    this.color = color;
    this.hero_photo_id = hero_photo_id;
  }
}

export interface HandlerInvitePlayerToTeamEvent {
  readonly kind: "invitePlayerToTeamEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;
  readonly player_id: BiomesId;
}

export class InvitePlayerToTeamEvent implements Event {
  readonly kind = "invitePlayerToTeamEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;
  readonly player_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    team_id = t.defaultBiomesId,
    player_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    team_id?: BiomesId;
    player_id?: BiomesId;
  }) {
    this.id = id;
    this.team_id = team_id;
    this.player_id = player_id;
  }
}

export interface HandlerRequestToJoinTeamEvent {
  readonly kind: "requestToJoinTeamEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  readonly team_id: BiomesId;
}

export class RequestToJoinTeamEvent implements Event {
  readonly kind = "requestToJoinTeamEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  readonly team_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
    team_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    entity_id?: BiomesId;
    team_id?: BiomesId;
  }) {
    this.id = id;
    this.entity_id = entity_id;
    this.team_id = team_id;
  }
}

export interface HandlerRequestedToJoinTeamEvent {
  readonly kind: "requestedToJoinTeamEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  readonly team_id: BiomesId;
}

export class RequestedToJoinTeamEvent implements Event {
  readonly kind = "requestedToJoinTeamEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  readonly team_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
    team_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    entity_id?: BiomesId;
    team_id?: BiomesId;
  }) {
    this.id = id;
    this.entity_id = entity_id;
    this.team_id = team_id;
  }
}

export interface HandlerCancelRequestToJoinTeamEvent {
  readonly kind: "cancelRequestToJoinTeamEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  readonly team_id: BiomesId;
}

export class CancelRequestToJoinTeamEvent implements Event {
  readonly kind = "cancelRequestToJoinTeamEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  readonly team_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
    team_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    entity_id?: BiomesId;
    team_id?: BiomesId;
  }) {
    this.id = id;
    this.entity_id = entity_id;
    this.team_id = team_id;
  }
}

export interface HandlerRespondToJoinTeamRequestEvent {
  readonly kind: "respondToJoinTeamRequestEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  readonly team_id: BiomesId;
  response: t.String;
}

export class RespondToJoinTeamRequestEvent implements Event {
  readonly kind = "respondToJoinTeamRequestEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  readonly team_id: BiomesId;
  response: t.ReadonlyString;

  constructor({
    id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
    team_id = t.defaultBiomesId,
    response = t.defaultString,
  }: {
    id?: BiomesId;
    entity_id?: BiomesId;
    team_id?: BiomesId;
    response?: t.ReadonlyString;
  }) {
    this.id = id;
    this.entity_id = entity_id;
    this.team_id = team_id;
    this.response = response;
  }
}

export interface HandlerRequestToJoinTeamAcceptedEvent {
  readonly kind: "requestToJoinTeamAcceptedEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  readonly team_id: BiomesId;
}

export class RequestToJoinTeamAcceptedEvent implements Event {
  readonly kind = "requestToJoinTeamAcceptedEvent";
  readonly id: BiomesId;
  readonly entity_id: BiomesId;
  readonly team_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    entity_id = t.defaultBiomesId,
    team_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    entity_id?: BiomesId;
    team_id?: BiomesId;
  }) {
    this.id = id;
    this.entity_id = entity_id;
    this.team_id = team_id;
  }
}

export interface HandlerJoinTeamEvent {
  readonly kind: "joinTeamEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;
}

export class JoinTeamEvent implements Event {
  readonly kind = "joinTeamEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    team_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    team_id?: BiomesId;
  }) {
    this.id = id;
    this.team_id = team_id;
  }
}

export interface HandlerCancelTeamInviteEvent {
  readonly kind: "cancelTeamInviteEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;
  readonly invitee_id: BiomesId;
}

export class CancelTeamInviteEvent implements Event {
  readonly kind = "cancelTeamInviteEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;
  readonly invitee_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    team_id = t.defaultBiomesId,
    invitee_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    team_id?: BiomesId;
    invitee_id?: BiomesId;
  }) {
    this.id = id;
    this.team_id = team_id;
    this.invitee_id = invitee_id;
  }
}

export interface HandlerKickTeamMemberEvent {
  readonly kind: "kickTeamMemberEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;
  readonly kicked_player_id: BiomesId;
}

export class KickTeamMemberEvent implements Event {
  readonly kind = "kickTeamMemberEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;
  readonly kicked_player_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    team_id = t.defaultBiomesId,
    kicked_player_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    team_id?: BiomesId;
    kicked_player_id?: BiomesId;
  }) {
    this.id = id;
    this.team_id = team_id;
    this.kicked_player_id = kicked_player_id;
  }
}

export interface HandlerDeclineTeamInviteEvent {
  readonly kind: "declineTeamInviteEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;
}

export class DeclineTeamInviteEvent implements Event {
  readonly kind = "declineTeamInviteEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    team_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    team_id?: BiomesId;
  }) {
    this.id = id;
    this.team_id = team_id;
  }
}

export interface HandlerQuitTeamEvent {
  readonly kind: "quitTeamEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;
}

export class QuitTeamEvent implements Event {
  readonly kind = "quitTeamEvent";
  readonly id: BiomesId;
  readonly team_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    team_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    team_id?: BiomesId;
  }) {
    this.id = id;
    this.team_id = team_id;
  }
}

export interface HandlerBeginTradeEvent {
  readonly kind: "beginTradeEvent";
  readonly id: BiomesId;
  readonly id2: BiomesId;
}

export class BeginTradeEvent implements Event {
  readonly kind = "beginTradeEvent";
  readonly id: BiomesId;
  readonly id2: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    id2 = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    id2?: BiomesId;
  }) {
    this.id = id;
    this.id2 = id2;
  }
}

export interface HandlerAcceptTradeEvent {
  readonly kind: "acceptTradeEvent";
  readonly id: BiomesId;
  readonly trade_id: BiomesId;
  readonly other_trader_id: BiomesId;
}

export class AcceptTradeEvent implements Event {
  readonly kind = "acceptTradeEvent";
  readonly id: BiomesId;
  readonly trade_id: BiomesId;
  readonly other_trader_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    trade_id = t.defaultBiomesId,
    other_trader_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    trade_id?: BiomesId;
    other_trader_id?: BiomesId;
  }) {
    this.id = id;
    this.trade_id = trade_id;
    this.other_trader_id = other_trader_id;
  }
}

export interface HandlerChangeTradeOfferEvent {
  readonly kind: "changeTradeOfferEvent";
  readonly id: BiomesId;
  offer: t.InventoryAssignmentPattern;
  readonly trade_id: BiomesId;
}

export class ChangeTradeOfferEvent implements Event {
  readonly kind = "changeTradeOfferEvent";
  readonly id: BiomesId;
  offer: t.ReadonlyInventoryAssignmentPattern;
  readonly trade_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    offer = t.defaultInventoryAssignmentPattern(),
    trade_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    offer?: t.ReadonlyInventoryAssignmentPattern;
    trade_id?: BiomesId;
  }) {
    this.id = id;
    this.offer = offer;
    this.trade_id = trade_id;
  }
}

export interface HandlerExpireTradeEvent {
  readonly kind: "expireTradeEvent";
  readonly id: BiomesId;
}

export class ExpireTradeEvent implements Event {
  readonly kind = "expireTradeEvent";
  readonly id: BiomesId;

  constructor({ id = t.defaultBiomesId }: { id?: BiomesId }) {
    this.id = id;
  }
}

export interface HandlerGiveGiftEvent {
  readonly kind: "giveGiftEvent";
  readonly id: BiomesId;
  readonly target: BiomesId;
  readonly target_robot: BiomesId;
}

export class GiveGiftEvent implements Event {
  readonly kind = "giveGiftEvent";
  readonly id: BiomesId;
  readonly target: BiomesId;
  readonly target_robot: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    target = t.defaultBiomesId,
    target_robot = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    target?: BiomesId;
    target_robot?: BiomesId;
  }) {
    this.id = id;
    this.target = target;
    this.target_robot = target_robot;
  }
}

export interface HandlerGiveMailboxItemEvent {
  readonly kind: "giveMailboxItemEvent";
  readonly player_id: BiomesId;
  readonly src_id: BiomesId;
  src: t.OwnedItemReference;
  count: t.U64;
  dst_id: t.OptionalBiomesId;
  dst: t.OwnedItemReference;
  readonly target_player_id: BiomesId;
  positions: t.Vec3iList;
}

export class GiveMailboxItemEvent implements Event {
  readonly kind = "giveMailboxItemEvent";
  readonly player_id: BiomesId;
  readonly src_id: BiomesId;
  src: t.ReadonlyOwnedItemReference;
  count: t.ReadonlyU64;
  dst_id: t.ReadonlyOptionalBiomesId;
  dst: t.ReadonlyOwnedItemReference;
  readonly target_player_id: BiomesId;
  positions: t.ReadonlyVec3iList;

  constructor({
    player_id = t.defaultBiomesId,
    src_id = t.defaultBiomesId,
    src = t.defaultOwnedItemReference(),
    count = t.defaultU64,
    dst_id = t.defaultOptionalBiomesId,
    dst = t.defaultOwnedItemReference(),
    target_player_id = t.defaultBiomesId,
    positions = t.defaultVec3iList(),
  }: {
    player_id?: BiomesId;
    src_id?: BiomesId;
    src?: t.ReadonlyOwnedItemReference;
    count?: t.ReadonlyU64;
    dst_id?: t.ReadonlyOptionalBiomesId;
    dst?: t.ReadonlyOwnedItemReference;
    target_player_id?: BiomesId;
    positions?: t.ReadonlyVec3iList;
  }) {
    this.player_id = player_id;
    this.src_id = src_id;
    this.src = src;
    this.count = count;
    this.dst_id = dst_id;
    this.dst = dst;
    this.target_player_id = target_player_id;
    this.positions = positions;
  }
}

export interface HandlerUnwrapWrappedItemEvent {
  readonly kind: "unwrapWrappedItemEvent";
  readonly id: BiomesId;
  ref: t.OwnedItemReference;
  item: t.Item;
}

export class UnwrapWrappedItemEvent implements Event {
  readonly kind = "unwrapWrappedItemEvent";
  readonly id: BiomesId;
  ref: t.ReadonlyOwnedItemReference;
  item: t.ReadonlyItem;

  constructor({
    id = t.defaultBiomesId,
    ref = t.defaultOwnedItemReference(),
    item = t.defaultItem(),
  }: {
    id?: BiomesId;
    ref?: t.ReadonlyOwnedItemReference;
    item?: t.ReadonlyItem;
  }) {
    this.id = id;
    this.ref = ref;
    this.item = item;
  }
}

export interface HandlerPokePlantEvent {
  readonly kind: "pokePlantEvent";
  readonly id: BiomesId;
}

export class PokePlantEvent implements Event {
  readonly kind = "pokePlantEvent";
  readonly id: BiomesId;

  constructor({ id = t.defaultBiomesId }: { id?: BiomesId }) {
    this.id = id;
  }
}

export interface HandlerAddToOutfitEvent {
  readonly kind: "addToOutfitEvent";
  readonly id: BiomesId;
  readonly player_id: BiomesId;
  src: t.OwnedItemReference;
}

export class AddToOutfitEvent implements Event {
  readonly kind = "addToOutfitEvent";
  readonly id: BiomesId;
  readonly player_id: BiomesId;
  src: t.ReadonlyOwnedItemReference;

  constructor({
    id = t.defaultBiomesId,
    player_id = t.defaultBiomesId,
    src = t.defaultOwnedItemReference(),
  }: {
    id?: BiomesId;
    player_id?: BiomesId;
    src?: t.ReadonlyOwnedItemReference;
  }) {
    this.id = id;
    this.player_id = player_id;
    this.src = src;
  }
}

export interface HandlerEquipOutfitEvent {
  readonly kind: "equipOutfitEvent";
  readonly id: BiomesId;
  readonly player_id: BiomesId;
}

export class EquipOutfitEvent implements Event {
  readonly kind = "equipOutfitEvent";
  readonly id: BiomesId;
  readonly player_id: BiomesId;

  constructor({
    id = t.defaultBiomesId,
    player_id = t.defaultBiomesId,
  }: {
    id?: BiomesId;
    player_id?: BiomesId;
  }) {
    this.id = id;
    this.player_id = player_id;
  }
}

export type AnyHandlerEvent =
  | HandlerDisconnectPlayerEvent
  | HandlerMoveEvent
  | HandlerIdleChangeEvent
  | HandlerEnterRobotFieldEvent
  | HandlerWarpEvent
  | HandlerWarpHomeEvent
  | HandlerEditEvent
  | HandlerShapeEvent
  | HandlerFarmingEvent
  | HandlerDumpWaterEvent
  | HandlerScoopWaterEvent
  | HandlerInventoryCombineEvent
  | HandlerInventorySplitEvent
  | HandlerInventorySortEvent
  | HandlerInventorySwapEvent
  | HandlerRobotInventorySwapEvent
  | HandlerInventoryThrowEvent
  | HandlerInventoryDestroyEvent
  | HandlerDyeBlockEvent
  | HandlerUnmuckerEvent
  | HandlerInternalInventorySetEvent
  | HandlerInventoryCraftEvent
  | HandlerInventoryDyeEvent
  | HandlerInventoryCookEvent
  | HandlerInventoryCompostEvent
  | HandlerInventoryChangeSelectionEvent
  | HandlerChangeCameraModeEvent
  | HandlerOverflowMoveToInventoryEvent
  | HandlerInventoryMoveToOverflowEvent
  | HandlerAppearanceChangeEvent
  | HandlerHairTransplantEvent
  | HandlerEmoteEvent
  | HandlerStartPlaceableAnimationEvent
  | HandlerPlacePlaceableEvent
  | HandlerDestroyPlaceableEvent
  | HandlerChangePictureFrameContentsEvent
  | HandlerChangeTextSignContentsEvent
  | HandlerUpdateVideoSettingsEvent
  | HandlerSellInContainerEvent
  | HandlerPurchaseFromContainerEvent
  | HandlerUpdateRobotNameEvent
  | HandlerPlaceRobotEvent
  | HandlerEndPlaceRobotEvent
  | HandlerPickUpRobotEvent
  | HandlerUpdateProjectedRestorationEvent
  | HandlerLabelChangeEvent
  | HandlerCreateGroupEvent
  | HandlerPlaceBlueprintEvent
  | HandlerDestroyBlueprintEvent
  | HandlerCreateCraftingStationEvent
  | HandlerFeedRobotEvent
  | HandlerPlaceGroupEvent
  | HandlerCloneGroupEvent
  | HandlerDestroyGroupEvent
  | HandlerCaptureGroupEvent
  | HandlerUnGroupEvent
  | HandlerRepairGroupEvent
  | HandlerUpdateGroupPreviewEvent
  | HandlerDeleteGroupPreviewEvent
  | HandlerRestoreGroupEvent
  | HandlerRestorePlaceableEvent
  | HandlerCreatePhotoPortalEvent
  | HandlerConsumptionEvent
  | HandlerRemoveBuffEvent
  | HandlerAdminInventoryGroupEvent
  | HandlerAdminResetChallengesEvent
  | HandlerAdminResetRecipeEvent
  | HandlerAdminResetInventoryEvent
  | HandlerAdminSetInfiniteCapacityContainerEvent
  | HandlerAdminGiveItemEvent
  | HandlerAdminRemoveItemEvent
  | HandlerAdminDeleteEvent
  | HandlerAdminIceEvent
  | HandlerPlayerInitEvent
  | HandlerUpdatePlayerHealthEvent
  | HandlerUpdateNpcHealthEvent
  | HandlerPickUpEvent
  | HandlerRemoveMapBeamEvent
  | HandlerSetNUXStatusEvent
  | HandlerAcceptChallengeEvent
  | HandlerCompleteQuestStepAtEntityEvent
  | HandlerResetChallengeEvent
  | HandlerExpireBuffsEvent
  | HandlerExpireRobotEvent
  | HandlerAdminEditPresetEvent
  | HandlerAdminSavePresetEvent
  | HandlerAdminLoadPresetEvent
  | HandlerTillSoilEvent
  | HandlerPlantSeedEvent
  | HandlerWaterPlantsEvent
  | HandlerFertilizePlantEvent
  | HandlerAdminDestroyPlantEvent
  | HandlerFishingClaimEvent
  | HandlerFishingCaughtEvent
  | HandlerFishingFailedEvent
  | HandlerFishingConsumeBaitEvent
  | HandlerTreasureRollEvent
  | HandlerCreateOrJoinSpleefEvent
  | HandlerJoinDeathmatchEvent
  | HandlerFinishSimpleRaceMinigameEvent
  | HandlerStartSimpleRaceMinigameEvent
  | HandlerReachStartSimpleRaceMinigameEvent
  | HandlerReachCheckpointSimpleRaceMinigameEvent
  | HandlerRestartSimpleRaceMinigameEvent
  | HandlerTagMinigameHitPlayerEvent
  | HandlerQuitMinigameEvent
  | HandlerGiveMinigameKitEvent
  | HandlerTouchMinigameStatsEvent
  | HandlerEditMinigameMetadataEvent
  | HandlerMinigameInstanceTickEvent
  | HandlerExpireMinigameInstanceEvent
  | HandlerAssociateMinigameElementEvent
  | HandlerCreateMinigameThroughAssocationEvent
  | HandlerAckWarpEvent
  | HandlerReplenishWateringCanEvent
  | HandlerSpaceClipboardWandCutEvent
  | HandlerSpaceClipboardWandCopyEvent
  | HandlerSpaceClipboardWandPasteEvent
  | HandlerSpaceClipboardWandDiscardEvent
  | HandlerNegaWandRestoreEvent
  | HandlerPlacerWandEvent
  | HandlerClearPlacerEvent
  | HandlerDespawnWandEvent
  | HandlerSellToEntityEvent
  | HandlerSetNPCPositionEvent
  | HandlerAdminUpdateInspectionTweaksEvent
  | HandlerAdminECSDeleteComponentEvent
  | HandlerAdminECSAddComponentEvent
  | HandlerAdminECSUpdateComponentEvent
  | HandlerCreateTeamEvent
  | HandlerUpdateTeamMetadataEvent
  | HandlerInvitePlayerToTeamEvent
  | HandlerRequestToJoinTeamEvent
  | HandlerRequestedToJoinTeamEvent
  | HandlerCancelRequestToJoinTeamEvent
  | HandlerRespondToJoinTeamRequestEvent
  | HandlerRequestToJoinTeamAcceptedEvent
  | HandlerJoinTeamEvent
  | HandlerCancelTeamInviteEvent
  | HandlerKickTeamMemberEvent
  | HandlerDeclineTeamInviteEvent
  | HandlerQuitTeamEvent
  | HandlerBeginTradeEvent
  | HandlerAcceptTradeEvent
  | HandlerChangeTradeOfferEvent
  | HandlerExpireTradeEvent
  | HandlerGiveGiftEvent
  | HandlerGiveMailboxItemEvent
  | HandlerUnwrapWrappedItemEvent
  | HandlerPokePlantEvent
  | HandlerAddToOutfitEvent
  | HandlerEquipOutfitEvent;

export type AnyEvent =
  | DisconnectPlayerEvent
  | MoveEvent
  | IdleChangeEvent
  | EnterRobotFieldEvent
  | WarpEvent
  | WarpHomeEvent
  | EditEvent
  | ShapeEvent
  | FarmingEvent
  | DumpWaterEvent
  | ScoopWaterEvent
  | InventoryCombineEvent
  | InventorySplitEvent
  | InventorySortEvent
  | InventorySwapEvent
  | RobotInventorySwapEvent
  | InventoryThrowEvent
  | InventoryDestroyEvent
  | DyeBlockEvent
  | UnmuckerEvent
  | InternalInventorySetEvent
  | InventoryCraftEvent
  | InventoryDyeEvent
  | InventoryCookEvent
  | InventoryCompostEvent
  | InventoryChangeSelectionEvent
  | ChangeCameraModeEvent
  | OverflowMoveToInventoryEvent
  | InventoryMoveToOverflowEvent
  | AppearanceChangeEvent
  | HairTransplantEvent
  | EmoteEvent
  | StartPlaceableAnimationEvent
  | PlacePlaceableEvent
  | DestroyPlaceableEvent
  | ChangePictureFrameContentsEvent
  | ChangeTextSignContentsEvent
  | UpdateVideoSettingsEvent
  | SellInContainerEvent
  | PurchaseFromContainerEvent
  | UpdateRobotNameEvent
  | PlaceRobotEvent
  | EndPlaceRobotEvent
  | PickUpRobotEvent
  | UpdateProjectedRestorationEvent
  | LabelChangeEvent
  | CreateGroupEvent
  | PlaceBlueprintEvent
  | DestroyBlueprintEvent
  | CreateCraftingStationEvent
  | FeedRobotEvent
  | PlaceGroupEvent
  | CloneGroupEvent
  | DestroyGroupEvent
  | CaptureGroupEvent
  | UnGroupEvent
  | RepairGroupEvent
  | UpdateGroupPreviewEvent
  | DeleteGroupPreviewEvent
  | RestoreGroupEvent
  | RestorePlaceableEvent
  | CreatePhotoPortalEvent
  | ConsumptionEvent
  | RemoveBuffEvent
  | AdminInventoryGroupEvent
  | AdminResetChallengesEvent
  | AdminResetRecipeEvent
  | AdminResetInventoryEvent
  | AdminSetInfiniteCapacityContainerEvent
  | AdminGiveItemEvent
  | AdminRemoveItemEvent
  | AdminDeleteEvent
  | AdminIceEvent
  | PlayerInitEvent
  | UpdatePlayerHealthEvent
  | UpdateNpcHealthEvent
  | PickUpEvent
  | RemoveMapBeamEvent
  | SetNUXStatusEvent
  | AcceptChallengeEvent
  | CompleteQuestStepAtEntityEvent
  | ResetChallengeEvent
  | ExpireBuffsEvent
  | ExpireRobotEvent
  | AdminEditPresetEvent
  | AdminSavePresetEvent
  | AdminLoadPresetEvent
  | TillSoilEvent
  | PlantSeedEvent
  | WaterPlantsEvent
  | FertilizePlantEvent
  | AdminDestroyPlantEvent
  | FishingClaimEvent
  | FishingCaughtEvent
  | FishingFailedEvent
  | FishingConsumeBaitEvent
  | TreasureRollEvent
  | CreateOrJoinSpleefEvent
  | JoinDeathmatchEvent
  | FinishSimpleRaceMinigameEvent
  | StartSimpleRaceMinigameEvent
  | ReachStartSimpleRaceMinigameEvent
  | ReachCheckpointSimpleRaceMinigameEvent
  | RestartSimpleRaceMinigameEvent
  | TagMinigameHitPlayerEvent
  | QuitMinigameEvent
  | GiveMinigameKitEvent
  | TouchMinigameStatsEvent
  | EditMinigameMetadataEvent
  | MinigameInstanceTickEvent
  | ExpireMinigameInstanceEvent
  | AssociateMinigameElementEvent
  | CreateMinigameThroughAssocationEvent
  | AckWarpEvent
  | ReplenishWateringCanEvent
  | SpaceClipboardWandCutEvent
  | SpaceClipboardWandCopyEvent
  | SpaceClipboardWandPasteEvent
  | SpaceClipboardWandDiscardEvent
  | NegaWandRestoreEvent
  | PlacerWandEvent
  | ClearPlacerEvent
  | DespawnWandEvent
  | SellToEntityEvent
  | SetNPCPositionEvent
  | AdminUpdateInspectionTweaksEvent
  | AdminECSDeleteComponentEvent
  | AdminECSAddComponentEvent
  | AdminECSUpdateComponentEvent
  | CreateTeamEvent
  | UpdateTeamMetadataEvent
  | InvitePlayerToTeamEvent
  | RequestToJoinTeamEvent
  | RequestedToJoinTeamEvent
  | CancelRequestToJoinTeamEvent
  | RespondToJoinTeamRequestEvent
  | RequestToJoinTeamAcceptedEvent
  | JoinTeamEvent
  | CancelTeamInviteEvent
  | KickTeamMemberEvent
  | DeclineTeamInviteEvent
  | QuitTeamEvent
  | BeginTradeEvent
  | AcceptTradeEvent
  | ChangeTradeOfferEvent
  | ExpireTradeEvent
  | GiveGiftEvent
  | GiveMailboxItemEvent
  | UnwrapWrappedItemEvent
  | PokePlantEvent
  | AddToOutfitEvent
  | EquipOutfitEvent;
