import type { ClientContext, ClientContextSubset } from "@/client/game/context";
import type { Item, OwnedItemReference } from "@/shared/ecs/gen/types";
import type { BlockTerrainSample } from "@/shared/game/spatial";
import type { BiomesId } from "@/shared/ids";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { TimeWindow } from "@/shared/util/throttling";

export interface ActiveItemScript {
  onSelected?: () => void;
  onUnselected?: () => void;
  tick: (dt: number) => void;
}

export interface PressAndHoldInfo {
  start: number;
  percentage: number;
  finished: boolean;
  activeAction: {
    action: "warpHome" | "eat" | "drink";
    toolRef?: OwnedItemReference;
    tool?: Item;
  };
}
export type ActionType =
  | "destroy"
  | "shape"
  | "place"
  | "placeRobot"
  | "warpHome"
  | "wand"
  | "dump"
  | "store"
  | "eat"
  | "drink"
  | "till"
  | "plant"
  | "waterPlant"
  | "fish"
  | "reveal"
  | "minigameEdit"
  | "dye"
  | "bikkie"
  | "spaceClipboard"
  | "negaWand"
  | "fertilize"
  | "placerWand"
  | "shaper"
  | "despawnWand"
  | "waypointCam";

export interface ActiveAction {
  action: ActionType;
  click: "primary" | "secondary";
  toolRef?: OwnedItemReference;
  tool?: Item;
}

export interface DestroyInfo {
  start: number;
  pos: ReadonlyVec3;
  face: number;

  // Destroying either one of those
  terrainId?: number;
  terrainSample?: BlockTerrainSample;
  groupId?: BiomesId;
  placeableId?: BiomesId;
  blueprintId?: BiomesId;

  canDestroy: boolean;
  allowed: boolean;
  hardnessClass: number;
  percentage?: number;
  finished: boolean;
  activeAction: {
    action: "destroy" | "shape" | "till" | "plant" | "waterPlant";
    toolRef?: OwnedItemReference;
    tool?: Item;
  };
  actionTimeMs: number;
}

export interface AttackInfo {
  start: number;
  duration: number;
}

export type WithActionThottler<T> = T & {
  actionThrottler: TimeWindow<ActionType>;
};
export type InteractContext<T extends keyof ClientContext> = WithActionThottler<
  ClientContextSubset<T>
>;
