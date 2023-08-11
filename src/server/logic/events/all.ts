import type { AnyEventHandler } from "@/server/logic/events/core";
import {
  adminDeleteEventHandler,
  adminDestroyPlantEventHandler,
  adminEditPresetEventHandler,
  adminGiveItemEventHandler,
  adminIceEventHandler,
  adminLoadPresetEventHandler,
  adminRemoveItemEventHandler,
  adminResetChallengeEventHandler,
  adminResetInventoryEventHandler,
  adminResetRecipeEventHandler,
  adminSavePresetEventHandler,
  adminSetInfiniteCapacityEventHandler,
  adminUpdateInspectionTweaksHandler,
} from "@/server/logic/events/handlers/admin";
import { allAppearanceEventHandlers } from "@/server/logic/events/handlers/appearance";
import { removeMapBeamEventHandler } from "@/server/logic/events/handlers/beams";
import {
  destroyBlueprintEventHandler,
  placeBlueprintEventHandler,
} from "@/server/logic/events/handlers/blueprints";
import {
  acceptChallengeEventHandler,
  completeQuestStepAtEntityEventHandler,
  resetChallengeEventHandler,
} from "@/server/logic/events/handlers/challenges";
import {
  consumptionEventHandler,
  expireBuffsEventHandler,
  removeBuffEventHandler,
} from "@/server/logic/events/handlers/consumption";
import { allCraftingHandlers } from "@/server/logic/events/handlers/crafting";
import { dyingEventHandlers } from "@/server/logic/events/handlers/dyeing";
import { editEventHandler } from "@/server/logic/events/handlers/edits";
import { emoteEventHandler } from "@/server/logic/events/handlers/emotes";
import {
  fertilizePlantEventHandler,
  plantSeedEventHandler,
  pokePlantEventHandler,
  replenishWateringCanEventHandler,
  tillSoilEventHandler,
  waterPlantsEventHandler,
} from "@/server/logic/events/handlers/farming";
import { allFishingEventHandlers } from "@/server/logic/events/handlers/fishing";
import { pickUpEventHandler } from "@/server/logic/events/handlers/grab_bags";
import {
  adminInventoryGroupEventHandler,
  captureGroupEventHandler,
  cloneGroupEventHandler,
  createCraftingStationEventHandler,
  createGroupEventHandler,
  deleteGroupPreviewEventHandler,
  destroyGroupEventHandler,
  placeGroupEventHandler,
  repairGroupEventHandler,
  restoreGroupEventHandler,
  unGroupEventHandler,
  updateGroupPreviewEventHandler,
} from "@/server/logic/events/handlers/groups";
import { allInventoryEventHandlers } from "@/server/logic/events/handlers/inventory";
import { labelChangeEventHandler } from "@/server/logic/events/handlers/labels";
import { minigameEventHandlers } from "@/server/logic/events/handlers/minigames";
import { moveEventHandler } from "@/server/logic/events/handlers/motion";
import { npcEventHandlers } from "@/server/logic/events/handlers/npc";
import {
  changePictureFrameContentsEventHandler,
  changeTextSignContentsEventHandler,
  destroyPlaceableEventHandler,
  placePlaceableEventHandler,
  purchaseFromContainerEventHandler,
  restorePlaceableEventHandler,
  sellInContainerEventHandler,
  startPlaceableAnimationEventHandler,
  updateVideoSettingsEventHandler,
} from "@/server/logic/events/handlers/placeables";
import { allPlayerEventHandlers } from "@/server/logic/events/handlers/player";
import { changeCameraModeEventHandler } from "@/server/logic/events/handlers/player_behavior";
import {
  playerInitEventHandler,
  playerSetNUXStatusEventHandler,
  updatePlayerHealthEventHandler,
} from "@/server/logic/events/handlers/player_status";
import { createPhotoPortalEventHandler } from "@/server/logic/events/handlers/portals";
import { shapeEventHandler } from "@/server/logic/events/handlers/shapes";
import { allSpaceStowEventHandlers } from "@/server/logic/events/handlers/space_clipboard_wand";
import {
  warpEventHandler,
  warpHomeEventHandler,
} from "@/server/logic/events/handlers/warps";
import {
  dumpWaterEventHandler,
  scoopWaterEventHandler,
} from "@/server/logic/events/handlers/water";
import type { ServerMods } from "@/server/shared/minigames/server_mods";

import { despawnWandEventHandler } from "@/server/logic/events/handlers/despawn_wand";
import {
  giveGiftEventHandler,
  giveMailboxItemEventHandler,
} from "@/server/logic/events/handlers/gifts";
import { negaWandRestoreEventHandler } from "@/server/logic/events/handlers/nega_wand";
import { allOutfitHandlers } from "@/server/logic/events/handlers/outfit";
import {
  clearPlacerEventHandler,
  placerWandEventHandler,
} from "@/server/logic/events/handlers/placer_wand";
import { updateProjectedRestorationEventHandler } from "@/server/logic/events/handlers/protection";
import { allRobotHandlers } from "@/server/logic/events/handlers/robot";
import { allTeamEventHandlers } from "@/server/logic/events/handlers/teams";
import { allTradeEventHandlers } from "@/server/logic/events/handlers/trade";
import type { EventSet } from "@/shared/ecs/gen/events";
import type { RegistryLoader } from "@/shared/registry";
import { ok } from "assert";
export type EventHandlerMap = Map<keyof EventSet, AnyEventHandler>;

export function eventHandlerMapFor(serverMods: ServerMods) {
  return [
    // Handle players coming into existence, and keep-alives
    // These should go first.
    ...allPlayerEventHandlers,

    // Handle things that can move the player, this may
    // affect validity of later events.
    moveEventHandler,
    warpEventHandler,
    warpHomeEventHandler,

    // Inventory events.
    ...allInventoryEventHandlers,
    pickUpEventHandler,

    // Admin events.
    adminDeleteEventHandler,
    adminIceEventHandler,
    adminGiveItemEventHandler,
    adminRemoveItemEventHandler,
    adminResetChallengeEventHandler,
    adminResetInventoryEventHandler,
    adminResetRecipeEventHandler,
    adminSetInfiniteCapacityEventHandler,
    adminSavePresetEventHandler,
    adminLoadPresetEventHandler,
    adminEditPresetEventHandler,
    adminDestroyPlantEventHandler,
    adminUpdateInspectionTweaksHandler,

    // Challenge events
    acceptChallengeEventHandler,
    completeQuestStepAtEntityEventHandler,
    resetChallengeEventHandler,

    // Blueprint events
    placeBlueprintEventHandler,
    destroyBlueprintEventHandler,

    // Placable events.
    placePlaceableEventHandler,
    startPlaceableAnimationEventHandler,
    destroyPlaceableEventHandler,
    changePictureFrameContentsEventHandler,
    changeTextSignContentsEventHandler,
    updateVideoSettingsEventHandler,
    purchaseFromContainerEventHandler,
    sellInContainerEventHandler,
    restorePlaceableEventHandler,

    // Outfit events.
    ...allOutfitHandlers,

    // Robot events.
    ...allRobotHandlers,

    // Protection events.
    updateProjectedRestorationEventHandler,

    // Groups.
    createGroupEventHandler,
    unGroupEventHandler,
    destroyGroupEventHandler,
    captureGroupEventHandler,
    placeGroupEventHandler,
    cloneGroupEventHandler,
    repairGroupEventHandler,
    adminInventoryGroupEventHandler,
    updateGroupPreviewEventHandler,
    deleteGroupPreviewEventHandler,
    createCraftingStationEventHandler,
    restoreGroupEventHandler,

    // Gaia / Terrain Handlers.
    editEventHandler,
    shapeEventHandler,
    dumpWaterEventHandler,
    scoopWaterEventHandler,

    // Map/Beams
    removeMapBeamEventHandler,

    // Farming
    tillSoilEventHandler,
    plantSeedEventHandler,
    waterPlantsEventHandler,
    fertilizePlantEventHandler,
    replenishWateringCanEventHandler,
    pokePlantEventHandler,

    // Other events, alphabetical order.
    changeCameraModeEventHandler,
    clearPlacerEventHandler,
    createPhotoPortalEventHandler,
    despawnWandEventHandler,
    giveGiftEventHandler,
    giveMailboxItemEventHandler,
    labelChangeEventHandler,
    negaWandRestoreEventHandler,
    placerWandEventHandler,
    playerInitEventHandler,
    playerSetNUXStatusEventHandler,
    emoteEventHandler,
    updatePlayerHealthEventHandler,

    // Consumption
    consumptionEventHandler,
    expireBuffsEventHandler,
    removeBuffEventHandler,

    ...allAppearanceEventHandlers,
    ...allCraftingHandlers,
    ...allTradeEventHandlers,
    ...allFishingEventHandlers,
    ...allSpaceStowEventHandlers,
    ...allTeamEventHandlers,
    ...dyingEventHandlers,
    ...minigameEventHandlers,
    ...npcEventHandlers,
    ...serverMods.flatMap((e) => e.eventHandlers),
  ].reduce((overall, h) => {
    const kind = h.kind as keyof EventSet;
    ok(!overall.has(kind), `Duplicate event handler for ${h.kind}`);
    overall.set(kind, h);
    return overall;
  }, new Map<keyof EventSet, AnyEventHandler>());
}

export async function registerEventHandlerMap<
  C extends {
    serverMods: ServerMods;
  }
>(loader: RegistryLoader<C>): Promise<EventHandlerMap> {
  const serverMods = await loader.get("serverMods");
  return eventHandlerMapFor(serverMods);
}
