import type { ClientContext } from "@/client/game/context";
import type { NavigationAid } from "@/client/game/helpers/navigation_aids";
import type { ClientResourcesBuilder } from "@/client/game/resources/types";
import type { Envelope } from "@/shared/chat/types";
import type { ReadonlyHealth } from "@/shared/ecs/gen/components";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { ItemAndCount, ReadonlyVec3f } from "@/shared/ecs/gen/types";
import type { RequiredItem } from "@/shared/game/spatial";
import type { BiomesId } from "@/shared/ids";
import type { NpcType } from "@/shared/npc/bikkie";
import type { RegistryLoader } from "@/shared/registry";

export interface NameOverlay {
  kind: "name";
  key: string;

  name: string;
  typing: boolean;
  beginHide: boolean;
  recentText?: Envelope;
  health?: ReadonlyHealth;
  entityId: BiomesId;
  entity: ReadonlyEntity;
  npcType?: NpcType;
}

export interface PlayerInspectOverlay {
  kind: "player";
  key: string;

  entityId: BiomesId;
  label?: string;
}

export interface NpcInspectOverlay {
  kind: "npc";
  key: string;

  entityId: BiomesId;
  entity: ReadonlyEntity;
  npcType: NpcType;
}

export interface RobotInspectOverlay {
  kind: "robot";
  key: string;

  entityId: BiomesId;
}

export interface GroupInspectOverlay {
  kind: "group";
  key: string;

  entityId: BiomesId;
  label?: string;
}

export interface PlaceableInspectOverlay {
  kind: "placeable";
  key: string;

  entityId: BiomesId;
  itemId: BiomesId;
  placerId: BiomesId;
  label?: string;
}

export interface LootEventOverlay {
  kind: "loot";
  key: string;

  posX: number;
  displayFullMessage?: boolean;
}

export interface BlueprintOverlay {
  kind: "blueprint";
  key: string;

  entityId: BiomesId;
  voxelPos?: ReadonlyVec3f;
  cursorItem?: RequiredItem;
  requiredItem?: RequiredItem;
  completed: boolean;
}

export interface BlueprintPlacementOverlay {
  kind: "blueprint_placement";
  key: string;
}

export interface FishMeterOverlay {
  kind: "fish_meter";
}

export interface NavigationAidOverlay {
  kind: "navigation_aid";
  key: string;
  isOccluded: boolean;
  aid: NavigationAid;
}

export interface MinigameElementOverlay {
  kind: "minigame_element";
  key: string;
  elementId: BiomesId;
  minigameId: BiomesId;
  isOccluded: boolean;
  pos: ReadonlyVec3f;
}

export interface RestoredPlaceableOverlay {
  kind: "restored_placeable";
  key: string;
  entity: ReadonlyEntity;
}

export interface PlantInspectOverlay {
  kind: "plant";
  key: string;

  pos: ReadonlyVec3f;
  entityId: BiomesId;
  projection: ReadonlyVec3f;
}

export interface HiddenInspectOverlay {
  kind: "hidden";
  overlay: InspectableOverlay;
  entityId: BiomesId;
}

export type InspectableOverlay =
  | PlayerInspectOverlay
  | NpcInspectOverlay
  | RobotInspectOverlay
  | GroupInspectOverlay
  | PlaceableInspectOverlay
  | PlantInspectOverlay
  | HiddenInspectOverlay;

export type Overlay =
  | InspectableOverlay
  | NameOverlay
  | LootEventOverlay
  | BlueprintOverlay
  | BlueprintPlacementOverlay
  | FishMeterOverlay
  | NavigationAidOverlay
  | MinigameElementOverlay
  | RestoredPlaceableOverlay;
export type OverlayMap = Map<string, Overlay>;

export type Projection = {
  loc: ReadonlyVec3f;
  proximity?: number;
};
export type ProjectionMap = Map<string, Projection>;

export interface LootEvent {
  entityId: BiomesId;
  item: ItemAndCount;
  time: number;
}

export interface ForceLocationOverlay {
  time: number;
}

export function addOverlayResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/overlays", new Map<string, Overlay>());
  builder.addGlobal("/toast", {
    value: [],
  });
  builder.addGlobal("/overlays/projection", new Map<string, Projection>());
  builder.addGlobal("/overlays/loot", { events: [], version: 0 });
  builder.addGlobal("/overlays/force_location", {
    time: 0,
  });
}
