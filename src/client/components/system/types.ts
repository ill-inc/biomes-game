import type { QuestStepBundle } from "@/client/components/challenges/helpers";
import type { CollectionsPage } from "@/client/components/inventory/CollectionsScreen";
import type { SettingsPage } from "@/client/components/modals/GameSettingsScreen";
import type { SocialMiniPhonePayload } from "@/client/components/social/types";
import type {
  SelectPhotoCallback,
  SelectPhotoSources,
} from "@/client/components/system/SelectPhotoScreen";
import type { Item } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";

export type GenericMiniPhonePayload =
  | {
      type: "robot_transmission";
      robotId: BiomesId;
      stepBundle: QuestStepBundle;
    }
  | {
      type: "sign";
      placeableId: BiomesId;
    }
  | {
      type: "map";
    }
  | {
      type: "container";
      placeableId: BiomesId;
      itemId: BiomesId;
    }
  | {
      type: "mailbox";
      placeableId: BiomesId;
      itemId: BiomesId;
    }
  | {
      type: "shop_container";
      placeableId: BiomesId;
      itemId: BiomesId;
    }
  | {
      type: "item_buyer";
      entityId: BiomesId;
    }
  | {
      type: "self_inventory";
      showingTeamViewForId?: BiomesId;
    }
  | {
      type: "trade";
      tradeId: BiomesId;
    }
  | {
      type: "change_frame_contents";
      placeableId: BiomesId;
    }
  | {
      type: "select_photo";
      onSelected: SelectPhotoCallback;
      restrictToSources?: SelectPhotoSources[];
    }
  | {
      type: "change_video_settings";
      placeableId: BiomesId;
    }
  | {
      type: "game_settings";
      page?: SettingsPage;
    }
  | {
      type: "hand_craft";
    }
  | {
      type: "crafting_station";
      stationEntityId: BiomesId;
    }
  | {
      type: "craft_detail";
      recipe: Item;
    }
  | {
      type: "edit_character";
    }
  | {
      type: "group_editor";
    }
  | {
      type: "minigame_edit";
      minigameId: BiomesId;
      placeableId?: BiomesId;
    }
  | {
      type: "collections";
      page?: CollectionsPage;
    }
  | {
      type: "minigame_leaderboard";
      minigameId: BiomesId;
    }
  | SocialMiniPhonePayload
  | {
      type: "outfit_stand";
      placeableId: BiomesId;
    }
  | {
      type: "robot_main_menu";
      entityId: BiomesId;
    };
