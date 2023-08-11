import type { ClientTable } from "@/client/game/game";
import type { Camera } from "@/client/game/resources/camera";
import type {
  ClientReactResources,
  ClientResources,
} from "@/client/game/resources/types";
import type { QuestCategory } from "@/shared/bikkie/schema/types";
import { zQuestCategory } from "@/shared/bikkie/schema/types";
import type { BiomesId } from "@/shared/ids";
import {
  add2,
  dist,
  dist2,
  normalizev2,
  rot2,
  scale2,
  sub2,
  xzProject,
  yaw,
} from "@/shared/math/linear";
import { clamp } from "@/shared/math/math";
import type {
  AABB,
  ReadonlyVec2,
  ReadonlyVec3,
  Vec2,
} from "@/shared/math/types";
import { Vector3 } from "three";

export const POSITION_NAV_AID_MIN_RENDER_DISTANCE = 10;
export const QUEST_PRECISE_MIN_RENDER_DISTANCE = 50;
export const PRECISE_NAVIGATION_AID_NDC_BOX: AABB = [
  [-0.8, -0.8, -1],
  [0.8, 0.8, Infinity],
];

export type NavigationAidKind =
  | ("robot_transmission" | "unaccepted_quest" | "quest" | "placed")
  | QuestCategory;

export function isQuestNavigationAidKind(kind: NavigationAidKind): boolean {
  return (
    kind === "unaccepted_quest" ||
    kind === "quest" ||
    zQuestCategory.safeParse(kind).success
  );
}

export interface NavigationAidSpec {
  target:
    | {
        kind: "position";
        position: ReadonlyVec3;
      }
    | {
        kind: "pos2d";
        position: ReadonlyVec2;
      }
    | {
        kind: "npc";
        typeId: BiomesId;
      }
    | {
        kind: "entity" | "robot";
        id: BiomesId;
      }
    | {
        kind: "group";
        groupId: BiomesId;
      };
  kind: NavigationAidKind;
  autoremoveWhenNear: boolean;
  challengeId?: BiomesId;
  triggerId?: BiomesId;
}

export type NavigationAidTarget = NavigationAidSpec["target"]["kind"];

export interface NavigationAid extends NavigationAidSpec {
  id: number;
  pos: ReadonlyVec3;
}

export function accurateNavigationAidPosition(
  userId: BiomesId,
  resources: ClientResources | ClientReactResources,
  navigationAid: NavigationAid
) {
  return navigationAid.pos;
}

export function useAccurateNavigationAidPosition(
  deps: {
    userId: BiomesId;
    reactResources: ClientReactResources;
    table: ClientTable;
  },
  navigationAid: NavigationAid
) {
  return navigationAid.pos;
}

export function placeableDistance(
  pos: ReadonlyVec3,
  point: ReadonlyVec3,
  positionOverride?: ReadonlyVec3
) {
  positionOverride ??= pos;
  return dist2(xzProject(positionOverride), xzProject(point));
}

export function navAidDistance(
  navAid: NavigationAid,
  point: ReadonlyVec3,
  positionOverride?: ReadonlyVec3
) {
  positionOverride ??= navAid.pos;

  // For now only use 3d distance for NPCs + groups
  switch (navAid.target.kind) {
    case "pos2d":
      return dist2(xzProject(positionOverride), xzProject(point));
    default:
      return dist(positionOverride, point);
  }
}

export function navigationAidHasBeam(navigationAid: NavigationAid) {
  return navigationAid.kind === "placed";
}

export function navigationAidMiniMapShouldPin(
  navigationAid: NavigationAid,
  isTrackingQuest: boolean
) {
  return !isQuestNavigationAidKind(navigationAid.kind) || isTrackingQuest;
}

export function navigationAidShowsOnCircle(
  navigationAid: NavigationAid,
  isTrackingQuest: boolean,
  distance: number
) {
  if (navigationAid.target.kind === "robot") return false;
  if (
    (navigationAid.target.kind === "position" ||
      navigationAid.target.kind === "pos2d") &&
    distance < POSITION_NAV_AID_MIN_RENDER_DISTANCE
  ) {
    return false;
  }

  return !isQuestNavigationAidKind(navigationAid.kind) || isTrackingQuest;
}

export function navigationAidShowsPrecisionOverlay(
  navigationAid: NavigationAid,
  isTrackingQuest: boolean,
  distance: number
) {
  if (
    (navigationAid.target.kind === "position" ||
      navigationAid.target.kind === "pos2d") &&
    distance < POSITION_NAV_AID_MIN_RENDER_DISTANCE
  ) {
    return false;
  }

  if (isQuestNavigationAidKind(navigationAid.kind)) {
    return isTrackingQuest || distance < QUEST_PRECISE_MIN_RENDER_DISTANCE;
  }

  return navigationAid.kind !== "placed";
}

export function navigationAidCompassProjection(
  camera: Camera,
  position: ReadonlyVec3
): Vec2 {
  const orientation = yaw(camera.view());
  const projection = sub2([position[0], position[2]], xzProject(camera.pos()));
  return rot2(normalizev2(projection), orientation);
}

export function navigationAidDualProjection(
  camera: Camera,
  position: ReadonlyVec3
): Vec2 {
  // Transform the navigation aid's position to view coordinates.
  const viewMat = camera.three.matrixWorldInverse;
  const viewPos = new Vector3(...position).applyMatrix4(viewMat);

  // Blend the xz plane and xy plane projections.
  const alpha = clamp(1 + viewPos.z, 0, 1);
  const xy = scale2(1 - alpha, [viewPos.x, -viewPos.y]);
  const xz = scale2(alpha, [viewPos.x, viewPos.z]);
  return normalizev2(add2(xz, xy));
}

export function navigationAidProjectionByKind(
  camera: Camera,
  position: ReadonlyVec3,
  target: NavigationAid["target"]
): Vec2 {
  switch (target.kind) {
    case "pos2d":
      return navigationAidCompassProjection(camera, position);
    case "npc":
    case "entity":
    case "position":
    case "group":
    case "robot":
      return navigationAidDualProjection(camera, position);
  }
}
