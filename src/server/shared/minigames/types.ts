import type { DialogAction } from "@/client/components/system/DialogButton";
import type { ClientContextSubset } from "@/client/game/context";
import type { Script } from "@/client/game/scripts/script_controller";
import type { AnyEventHandler, EventContext } from "@/server/logic/events/core";
import type { QueriedEntityWith } from "@/server/logic/events/query";
import type { SpaceClipboardDelta } from "@/server/logic/events/space_clipboard";
import type { LogicApi } from "@/server/shared/api/logic";
import type { LazyEntity, LazyEntityWith } from "@/server/shared/ecs/gen/lazy";
import type { ClientRuleSet } from "@/server/shared/minigames/ruleset/client_types";
import type { ServerRuleset } from "@/server/shared/minigames/ruleset/server_types";
import type {
  MinigameComponent,
  ReadonlyMinigameComponent,
  ReadonlyMinigameInstance,
} from "@/shared/ecs/gen/components";
import type { Delta, DeltaWith } from "@/shared/ecs/gen/delta";
import type { Entity } from "@/shared/ecs/gen/entities";
import type { EditMinigameMetadataEvent } from "@/shared/ecs/gen/events";
import type {
  ItemBag,
  MinigameType,
  OptionalDamageSource,
  WarpHomeReason,
} from "@/shared/ecs/gen/types";
import type { Terrain } from "@/shared/game/terrain/terrain";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import type {
  OptionallyOrientedPoint,
  ReadonlyAABB,
} from "@/shared/math/types";
import type { ZodTypeAny } from "zod";
import { z } from "zod";

export const zBaseMinigameSettings = z.object({});
export type BaseMinigameSettings = z.infer<typeof zBaseMinigameSettings>;
export const zMinigameLoadoutSetting = z.tuple([zBiomesId, z.number()]).array();
export type MinigameLoadoutSetting = z.infer<typeof zMinigameLoadoutSetting>;

export interface CreateMinigameSpaceClipboardSpec {
  aabb: ReadonlyAABB;
  spaceEntityId: BiomesId;
  relevantEntities: Delta[];
  terrain: Terrain[];
  clonedRelevantEntityIds: BiomesId[];
}

export interface ExpireMinigameSpaceClipboardSpec {
  aabb: ReadonlyAABB;
  terrain: Terrain[];
  terrainRelevantEntities: Delta[];
  spaceClipboardEntity: SpaceClipboardDelta;
  spaceRelevantEntities: Delta[];
}

export interface TickMinigameSpaceClipboardSpec {
  aabb: ReadonlyAABB;
  terrain: Terrain[];
  terrainRelevantEntities: Delta[];
  spaceClipboardEntity: SpaceClipboardDelta;
  spaceRelevantEntities: Delta[];
  clonedRelevantEntityIds: BiomesId[];
}

export type NextTick = "stop_tick" | number;

export type OnTickInfo = {
  minigameEntity: QueriedEntityWith<"id" | "minigame_component">;
  minigameInstanceEntity: QueriedEntityWith<
    "id" | "minigame_instance" | "minigame_instance_tick_info"
  >;
  activePlayers: QueriedEntityWith<"id">[];
  minigameElements: QueriedEntityWith<"id">[];

  spaceClipboard?: TickMinigameSpaceClipboardSpec;
};

export interface OnCreatedInfo {
  minigameEntity: QueriedEntityWith<"id" | "minigame_component">;
  minigameInstanceEntity: QueriedEntityWith<"id" | "minigame_instance">;
  clipboard?: CreateMinigameSpaceClipboardSpec;
}

export interface OnExpiredInfo {
  minigameEntity: QueriedEntityWith<"id" | "minigame_component">;
  minigameInstanceEntity: QueriedEntityWith<"id" | "minigame_instance">;
}

export interface OnWarpHomeInfo {
  player: Delta;
  activeMinigameInstance: Delta;
  reason: WarpHomeReason;
}

export interface OnPlayerDeathInfo {
  player: Delta;
  activeMinigame: Delta;
  activeMinigameInstance: Delta;
  damageSource: OptionalDamageSource;
}

export interface OnGameElementAssociatedInfo {
  element: Delta;
  minigame: DeltaWith<"minigame_component">;
}

export interface OnGameElementDisassociatedInfo {
  element: Delta;
  minigame: DeltaWith<"minigame_component">;
}

export interface OnPlayerRemovedInfo {
  player: Delta;
  playerStashedEntity: QueriedEntityWith<"id"> | undefined;
  minigameEntity: QueriedEntityWith<"id" | "minigame_component">;
  minigameInstanceEntity: QueriedEntityWith<"id" | "minigame_instance">;
  context: DeleteContext;
}

export interface OnPlayerAddedInfo {
  player: Delta;
  minigameEntity: QueriedEntityWith<"id" | "minigame_component">;
  minigameInstanceEntity: QueriedEntityWith<"id" | "minigame_instance">;
}

export interface OnEditInfo {
  event: EditMinigameMetadataEvent;
  minigame: QueriedEntityWith<"id" | "minigame_component">;
}

export interface PlayerSpawnPositionInfo {
  kind: "initial" | "respawn";
  player: LazyEntityWith<"id"> | DeltaWith<"id">;
  minigame:
    | LazyEntityWith<"minigame_component">
    | DeltaWith<"minigame_component">;
  minigameInstance:
    | (LazyEntityWith<"minigame_instance"> | DeltaWith<"minigame_instance">)
    | undefined;
  minigameElements: (
    | LazyEntityWith<"minigame_element">
    | DeltaWith<"minigame_element">
  )[];
}

export interface ObserverPositionInfo {
  minigame:
    | LazyEntityWith<"minigame_component">
    | DeltaWith<"minigame_component">;
  minigameElements: (
    | LazyEntityWith<"minigame_element">
    | DeltaWith<"minigame_element">
  )[];
}

export interface DeleteContext {
  delete(id?: BiomesId): void;
}

export interface ModLogicHooks {
  onTick?: (
    info: OnTickInfo,
    context: EventContext<{}>,
    dt: number
  ) => NextTick;

  onExpired?: (info: OnExpiredInfo, context: EventContext<{}>) => void;
  onCreated?: (info: OnCreatedInfo, context: EventContext<{}>) => void;
  onWarpHome?: (info: OnWarpHomeInfo) => void;
  onPlayerDeath?: (info: OnPlayerDeathInfo) => void;
  onMinigameElementAssociated: (info: OnGameElementAssociatedInfo) => void;
  onMinigameElementDisassociated: (info: OnGameElementAssociatedInfo) => void;
  onMinigamePlayerRemoved: (info: OnPlayerRemovedInfo) => void;

  onMinigamePlayerAdded?: (
    info: OnPlayerAddedInfo,
    context: EventContext<{}>
  ) => void;
  onEdit?: (info: OnEditInfo) => void;
}

export type MinigameKitSpec = [MinigameComponent, ItemBag];

export interface ServerMod<
  K extends MinigameType = MinigameType,
  SettingsType extends ZodTypeAny = typeof zBaseMinigameSettings
> {
  kind: K;
  playerRestoredComponents: (keyof Entity)[];
  settingsType: SettingsType;
  kitSpec: (minigameId: BiomesId) => MinigameKitSpec;
  logicHooks: ModLogicHooks;
  eventHandlers: AnyEventHandler[];
  buildServerRuleset?: (
    base: ServerRuleset,
    player: LazyEntity | Delta,
    minigame:
      | LazyEntityWith<"minigame_component">
      | DeltaWith<"minigame_component">,
    minigameInstance:
      | LazyEntityWith<"minigame_instance">
      | DeltaWith<"minigame_instance">
  ) => ServerRuleset;

  handleCreateOrJoinWebRequest: (
    deps: { logicApi: LogicApi; userId: BiomesId },
    minigame: LazyEntityWith<"minigame_component">,
    activeInstances: LazyEntityWith<"minigame_instance">[],
    minigameElements: LazyEntityWith<"minigame_element">[]
  ) => Promise<void>;

  observerPosition: (
    info: ObserverPositionInfo
  ) => OptionallyOrientedPoint | undefined;

  spawnPosition: (
    info: PlayerSpawnPositionInfo
  ) => OptionallyOrientedPoint | undefined;
}

export interface ClientMod<
  K extends MinigameType = MinigameType,
  SettingsType extends ZodTypeAny = typeof zBaseMinigameSettings
> {
  kind: K;
  settingsType: SettingsType;
  escapeActions?: (
    deps: ClientContextSubset<"userId" | "events" | "resources">,
    minigameId: BiomesId,
    minigameInstanceId: BiomesId
  ) => DialogAction[];
  makeClientScript?: (
    deps: ClientContextSubset<
      | "userId"
      | "gardenHose"
      | "resources"
      | "audioManager"
      | "table"
      | "events"
    >,
    minigameId: BiomesId,
    minigameInstanceId: BiomesId
  ) => Script;
  buildMinigameRuleset(
    deps: ClientContextSubset<"userId">,
    base: ClientRuleSet,
    minigameComponent: ReadonlyMinigameComponent,
    minigameInstance: ReadonlyMinigameInstance,
    minigameInstanceId: BiomesId
  ): ClientRuleSet;
}
