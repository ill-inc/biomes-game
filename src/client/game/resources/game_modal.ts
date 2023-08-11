import type { GenericMiniPhonePayload } from "@/client/components/system/types";
import type { ClientContext } from "@/client/game/context";
import type { ClientResourcesBuilder } from "@/client/game/resources/types";
import type { AsyncTask } from "@/client/util/tasks/types";
import type { OwnedItemReference } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";

export interface GroupModal {
  kind: "group";
}

export interface EmptyModal {
  kind: "empty";
  returnPointerLock?: boolean;
}

export interface PushPermissionsModal {
  kind: "push_permissions";
}

export interface CraftingModal {
  kind: "crafting";
  payload?: GenericMiniPhonePayload;
}

export interface InboxModal {
  kind: "inbox";
}

export interface ChallengesModal {
  kind: "challenges";
}

export interface ChatModal {
  kind: "chat";
}

export interface ReportBugModal {
  kind: "report_bug";
}

export interface GameSettingsModal {
  kind: "game_settings";
}

export interface InventoryModal {
  kind: "inventory";
}

export interface AsyncTaskModal {
  kind: "async_task";
  task: AsyncTask;
}

export interface MapModal {
  kind: "map";
}

export interface TabbedPauseModal {
  kind: "tabbed_pause";
}

export interface DeathModal {
  kind: "death";
}

export interface StaleSessionModal {
  kind: "staleSession";
}

export interface HomestoneModal {
  kind: "homestone";
}

export interface CollectionsModal {
  kind: "collections";
}

export interface GenericMiniPhoneModal {
  kind: "generic_miniphone";
  rootPayload: GenericMiniPhonePayload;
  allowClickToDismiss?: boolean;
}

export interface GraphicsPreviewModal {
  kind: "graphics_preview";
  lastModal?: GameModal;
}

export interface MinigamePlaceableConfigureModal {
  kind: "minigame_placeable_configure";
  placeableId: BiomesId;
}

export interface TextSignConfigureModal {
  kind: "text_sign_configure_modal";
  placeableId: BiomesId;
}

export interface TreasureRevealModal {
  kind: "treasure_reveal";
  ref: OwnedItemReference;
}

export interface TalkToNPCScreen {
  kind: "talk_to_npc";
  talkingToNPCId: BiomesId;
}

export interface ImmersiveSignModal {
  kind: "immersive_sign";
  entityId: BiomesId;
}

export interface TalkToRobotModal {
  kind: "talk_to_robot";
  entityId: BiomesId;
}

export type GameModal = {
  onClose?: () => any;
} & (
  | ChatModal
  | CraftingModal
  | InventoryModal
  | EmptyModal
  | PushPermissionsModal
  | InboxModal
  | ReportBugModal
  | ChallengesModal
  | GameSettingsModal
  | AsyncTaskModal
  | MapModal
  | TabbedPauseModal
  | DeathModal
  | StaleSessionModal
  | HomestoneModal
  | GenericMiniPhoneModal
  | GraphicsPreviewModal
  | CollectionsModal
  | TreasureRevealModal
  | TalkToNPCScreen
  | TalkToRobotModal
  | MinigamePlaceableConfigureModal
  | TextSignConfigureModal
  | ImmersiveSignModal
);

export type TabbedPauseTabKind =
  | "inventory"
  | "crafting"
  | "map"
  | "inbox"
  | "collections"
  | "settings";

export type GameModalActiveTab =
  | {
      kind: "empty";
    }
  | {
      kind: "tabbed_pause";
      activeTab?: TabbedPauseTabKind;
    };

export function addGameModalResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/game_modal", { kind: "empty" });
  builder.addGlobal("/game_modal/active_tab", {
    kind: "empty",
  });
}
