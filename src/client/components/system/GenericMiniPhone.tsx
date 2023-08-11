import { RobotTranmissionScreen } from "@/client/components/challenges/RobotTransmissionScreen";
import SignScreen from "@/client/components/challenges/SignScreen";
import { EditCharacterScreen } from "@/client/components/character/EditCharacterScreen";
import { CollectionsScreen } from "@/client/components/inventory/CollectionsScreen";
import { ItemBuyerScreen } from "@/client/components/inventory/ItemBuyerScreen";
import { MailboxScreen } from "@/client/components/inventory/MailboxContainer";
import { MinigameEdit } from "@/client/components/inventory/MinigameEdit";
import { OutfitStandScreen } from "@/client/components/inventory/OutfitStandScreen";
import { SelfInventoryScreen } from "@/client/components/inventory/SelfInventoryScreen";
import { ShopContainerScreen } from "@/client/components/inventory/ShopContainerScreen";
import { StorageContainerScreen } from "@/client/components/inventory/StorageContainer";
import { TradeScreen } from "@/client/components/inventory/TradeScreen";
import { CraftingDetail } from "@/client/components/inventory/crafting/CraftingDetail";
import { CraftingStationScreen } from "@/client/components/inventory/crafting/CraftingStationScreen";
import { MinigameLeaderboard } from "@/client/components/minigames/MinigameLeaderboard";
import { ChangeFrameContentsScreen } from "@/client/components/modals/ChangeFrameContentsScreen";
import { GameSettingsScreen } from "@/client/components/modals/GameSettingsScreen";
import { GroupEditorScreen } from "@/client/components/modals/GroupEditorScreen";
import { VideoSettingsScreen } from "@/client/components/modals/VideoSettingsScreen";
import { RobotSettingsScreen } from "@/client/components/modals/robot/RobotSettingsScreen";
import { MiniPhoneCommentList } from "@/client/components/social/MiniPhoneCommentList";
import { MiniPhoneGroupDetailPage } from "@/client/components/social/MiniPhoneGroupDetailPage";
import { MiniPhoneInbox } from "@/client/components/social/MiniPhoneInbox";
import { MiniPhonePostCaptureFlow } from "@/client/components/social/MiniPhonePostCaptureFlow";
import { MiniPhonePostDetailPage } from "@/client/components/social/MiniPhonePostDetailPage";
import { MiniPhoneProfile } from "@/client/components/social/MiniPhoneProfile";
import { MiniPhoneTaggedList } from "@/client/components/social/MiniPhoneTaggedList";
import { MiniPhoneUserPhotos } from "@/client/components/social/MiniPhoneUserPhotos";
import { SelectPhotoScreen } from "@/client/components/system/SelectPhotoScreen";
import { MiniPhone } from "@/client/components/system/mini_phone/MiniPhone";
import { useNewMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import type { GenericMiniPhonePayload } from "@/client/components/system/types";
import dynamic from "next/dynamic";
import React from "react";

// The `leaflet` component references `window` during module load, so
// we can't do any server side rendering with it.
const PannableMapScreen = dynamic(
  () => import("@/client/components/map/PannableMapScreen"),
  {
    ssr: false,
    loading: () => <>Loading...</>,
  }
);

export function defaultMiniPhoneRender(
  payload: GenericMiniPhonePayload
): React.ReactChild {
  switch (payload.type) {
    case "map":
      return <PannableMapScreen />;
    case "shop_container":
      return (
        <ShopContainerScreen
          openContainer={{
            containerId: payload.placeableId,
            itemId: payload.itemId,
          }}
        />
      );
    case "item_buyer":
      return <ItemBuyerScreen entityId={payload.entityId} />;
    case "container":
      return (
        <StorageContainerScreen
          openContainer={{
            containerId: payload.placeableId,
            itemId: payload.itemId,
          }}
        />
      );
    case "self_inventory":
      return (
        <SelfInventoryScreen
          showingTeamViewForId={payload.showingTeamViewForId}
        />
      );
    case "change_frame_contents":
      return <ChangeFrameContentsScreen placeableId={payload.placeableId} />;
    case "robot_transmission":
      return (
        <RobotTranmissionScreen
          robotId={payload.robotId}
          stepBundle={payload.stepBundle}
        />
      );
    case "sign":
      return <SignScreen placeableId={payload.placeableId} />;
    case "select_photo":
      return (
        <SelectPhotoScreen
          onPhotoSelected={payload.onSelected}
          restrictToSources={payload.restrictToSources}
        />
      );
    case "change_video_settings":
      return <VideoSettingsScreen placeableId={payload.placeableId} />;
    case "inbox":
      return <MiniPhoneInbox selectedId={payload.userId} />;
    case "game_settings":
      return <GameSettingsScreen page={payload.page} />;
    case "hand_craft":
      return <CraftingStationScreen />;
    case "crafting_station":
      return (
        <CraftingStationScreen stationEntityId={payload.stationEntityId} />
      );
    case "craft_detail":
      return <CraftingDetail recipe={payload.recipe} />;
    case "edit_character":
      return <EditCharacterScreen type={"edit_character"} />;
    case "group_editor":
      return <GroupEditorScreen />;
    case "posts":
      return <MiniPhoneUserPhotos userId={payload.userId} />;
    case "profile":
      return <MiniPhoneProfile userId={payload.userId} />;
    case "social_detail":
      switch (payload.documentType) {
        case "post":
          return <MiniPhonePostDetailPage postId={payload.documentId} />;
        case "environment_group":
          return <MiniPhoneGroupDetailPage groupId={payload.documentId} />;
      }
      break;
    case "tagged_list":
      return <MiniPhoneTaggedList post={payload.post} />;

    case "post_photo":
      return <MiniPhonePostCaptureFlow item={payload.item} />;
    case "comment_list":
      return (
        <MiniPhoneCommentList
          documentId={payload.documentId}
          documentType={payload.documentType}
          to={payload.to}
          commentBundle={payload.commentBundle}
        />
      );
    case "collections":
      return <CollectionsScreen page={payload.page} />;
    case "minigame_edit":
      return (
        <MinigameEdit
          minigameId={payload.minigameId}
          placeableId={payload.placeableId}
        />
      );
    case "minigame_leaderboard":
      return <MinigameLeaderboard minigameId={payload.minigameId} />;
    case "robot_main_menu":
      return <RobotSettingsScreen entityId={payload.entityId} />;
    case "trade":
      return <TradeScreen tradeId={payload.tradeId} />;
    case "mailbox":
      return (
        <MailboxScreen
          openContainer={{
            containerId: payload.placeableId,
            itemId: payload.itemId,
          }}
        />
      );
    case "outfit_stand":
      return <OutfitStandScreen outfitId={payload.placeableId} />;
  }
}

export function GenericMiniPhone<T extends GenericMiniPhonePayload>({
  onClose,
  renderFunc,
  rootPayload,
}: React.PropsWithChildren<{
  onClose: () => unknown;
  rootPayload: T;
  renderFunc?: (payload: T) => React.ReactChild;
}>) {
  const miniPhoneNavContext = useNewMiniPhoneContext<T>(onClose, [rootPayload]);

  return (
    <MiniPhone
      onClose={onClose}
      displayType={rootPayload.type}
      renderPayload={renderFunc ?? defaultMiniPhoneRender}
      existingContext={miniPhoneNavContext}
    />
  );
}
