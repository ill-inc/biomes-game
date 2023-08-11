import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { NavigationAid } from "@/client/game/helpers/navigation_aids";
import type { QuestBundle } from "@/client/game/resources/challenges";
import type { LocalPlayer } from "@/client/game/resources/local_player";
import type { SkyParams } from "@/client/game/resources/sky";
import {
  add2,
  dist,
  length2,
  normalizev2,
  scale2,
  sub2,
} from "@/shared/math/linear";
import { clamp } from "@/shared/math/math";
import type { ReadonlyVec2, ReadonlyVec3, Vec2 } from "@/shared/math/types";
import type { WorldMapMetadataResponse } from "@/shared/types";
import React from "react";
import { Vector3 } from "three";
import beamMagenta from "/public/hud/beam-marker.png";
import black from "/public/splash/black.png";

import mainQuestMarkAccepted from "/public/hud/quest-marker-main-accepted.png";

import type { QuestCategory } from "@/shared/bikkie/schema/types";
import { tileName, tileURL } from "@/shared/map/paths";

import cameraQuestMark from "/public/quests/quest-camera.png";
import cookingQuestMark from "/public/quests/quest-cooking.png";
import farmingQuestMark from "/public/quests/quest-farming.png";
import fishingQuestMark from "/public/quests/quest-fishing.png";
import huntingQuestMark from "/public/quests/quest-hunting.png";
import mainQuestMark from "/public/quests/quest-main.png";
import puzzleQuestMark from "/public/quests/quest-minigame.png";
import miningQuestMark from "/public/quests/quest-mining.png";

import type { ClientResources } from "@/client/game/resources/types";
import type { MapTileMetadata } from "@/server/web/db/map";
import type { BiomesId } from "@/shared/ids";
import type { TileType } from "@/shared/map/types";
import { passNever } from "@/shared/util/type_helpers";
import cameraBalloonQuestMark from "/public/quests/quest-balloon-camera.png";
import cookingBalloonQuestMark from "/public/quests/quest-balloon-cooking.png";
import robotTransmissionMark from "/public/quests/quest-balloon-exclaim.png";
import farmingBalloonQuestMark from "/public/quests/quest-balloon-farming.png";
import fishingBalloonQuestMark from "/public/quests/quest-balloon-fishing.png";
import huntingBalloonQuestMark from "/public/quests/quest-balloon-hunting.png";
import mainBalloonQuestMark from "/public/quests/quest-balloon-main.png";
import puzzleBalloonQuestMark from "/public/quests/quest-balloon-minigame.png";
import miningBalloonQuestMark from "/public/quests/quest-balloon-mining.png";

export const PRECISE_NAVIGATION_OVERLAY_THRESHOLD = 25;
export const PRECISE_NAVIGATION_OVERLAY_THRESHOLD_MIN = 10;

export function questCategoryToIconSource(
  category?: QuestCategory,
  includeBalloon?: boolean
): string {
  switch (category) {
    case "farming":
      return includeBalloon
        ? farmingBalloonQuestMark.src
        : farmingQuestMark.src;
    case "fishing":
      return includeBalloon
        ? fishingBalloonQuestMark.src
        : fishingQuestMark.src;
    case "cooking":
      return includeBalloon
        ? cookingBalloonQuestMark.src
        : cookingQuestMark.src;
    case "puzzle":
      return includeBalloon ? puzzleBalloonQuestMark.src : puzzleQuestMark.src;
    case "mining":
      return includeBalloon ? miningBalloonQuestMark.src : miningQuestMark.src;
    case "camera":
      return includeBalloon ? cameraBalloonQuestMark.src : cameraQuestMark.src;
    case "hunting":
      return includeBalloon
        ? huntingBalloonQuestMark.src
        : huntingQuestMark.src;
    case "main":
      return includeBalloon ? mainBalloonQuestMark.src : mainQuestMark.src;
    default:
      return includeBalloon ? mainBalloonQuestMark.src : mainQuestMark.src;
  }
}

export function questCategoryAccentColor(questCategory: QuestCategory) {
  switch (questCategory) {
    case "puzzle":
      return "#D29EFD";
    case "main":
      return "#FFEA86";
    case "farming":
      return "#ADFFA6";
    case "camera":
      return "#DBE5EB";
    case "cooking":
      return "#F29797";
    case "fishing":
      return "#B8E4F5";
    case "hunting":
      return "#FFA6A6";
    case "mining":
      return "#EDFAFE";
    case "discover":
      return "#FFEA86";
    default:
      passNever(questCategory);
  }

  return "transparent";
}

export function getNavigationAidAsset(
  navigationAid: NavigationAid,
  quest?: QuestBundle,
  includeBalloon?: boolean
) {
  let src: string;

  switch (navigationAid.kind) {
    case "placed":
      src = beamMagenta.src;
      break;
    case "robot_transmission":
      src = robotTransmissionMark.src;
      break;
    case "unaccepted_quest":
    case "quest":
      if (quest) {
        if (quest.state !== "available") {
          src = mainQuestMarkAccepted.src;
        } else {
          if (includeBalloon) {
            src = mainBalloonQuestMark.src;
          } else {
            src = mainQuestMark.src;
          }
        }
      } else {
        src = mainQuestMark.src;
      }
      break;
    case "farming":
    case "fishing":
    case "cooking":
    case "puzzle":
    case "mining":
    case "camera":
    case "hunting":
    case "main":
    case "discover":
      src = questCategoryToIconSource(navigationAid.kind, includeBalloon);
      break;
  }

  return src;
}

const NavigationAidInternal: React.FunctionComponent<{
  navigationAid: NavigationAid;
  extraClassName?: string;
  quest?: QuestBundle;
  includeBalloon: boolean;
}> = React.memo(({ navigationAid, extraClassName, quest, includeBalloon }) => {
  return (
    <img
      className={extraClassName}
      src={getNavigationAidAsset(navigationAid, quest, includeBalloon)}
    />
  );
});

export const NavigationAidAsset: React.FunctionComponent<{
  navigationAid: NavigationAid;
  extraClassName?: string;
  includeBalloon: boolean;
}> = React.memo(({ navigationAid, extraClassName, includeBalloon }) => {
  const { reactResources } = useClientContext();

  const quest = navigationAid.challengeId
    ? reactResources.useResolved("/quest", navigationAid.challengeId)
    : undefined;

  return (
    <NavigationAidInternal
      quest={quest}
      extraClassName={extraClassName}
      navigationAid={navigationAid}
      includeBalloon={includeBalloon}
    />
  );
});

export const NavigationAidCircleContext = React.createContext<{
  map: HTMLDivElement | null;
}>({ map: null });

export function zoomScale(zoom: number) {
  return Math.pow(2, zoom);
}

export function worldToMinimapMapCoordinates(
  pos: ReadonlyVec3,
  zoom: number
): Vec2 {
  return scale2(zoomScale(zoom), [pos[0], pos[2]]);
}

export function worldToMinimapCanvasCoordinates(
  pos: ReadonlyVec3,
  player: LocalPlayer,
  zoom: number,
  canvasWidth: number,
  canvasHeight: number
): Vec2 {
  const scalePos = worldToMinimapMapCoordinates(pos, zoom);
  const [x, y] = worldToMinimapMapCoordinates(player.player.position, zoom);
  return [
    scalePos[0] - x + 0.5 * canvasWidth,
    scalePos[1] - y + 0.5 * canvasHeight,
  ];
}

export function worldToMinimapEdgeCanvasCoordinates(
  maxDist: number,
  pos: ReadonlyVec3,
  player: LocalPlayer,
  zoom: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const player2d: Vec2 = [player.player.position[0], player.player.position[2]];
  const posToPlayerDir = sub2([pos[0], pos[2]], player2d);
  const newPos = add2(scale2(maxDist, normalizev2(posToPlayerDir)), player2d);

  return worldToMinimapCanvasCoordinates(
    [newPos[0], 0, newPos[1]],
    player,
    zoom,
    canvasWidth,
    canvasHeight
  );
}

export function worldToMinimapClippedCanvasCoordinates(
  maxDist: number,
  pos: ReadonlyVec3,
  player: LocalPlayer,
  zoom: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const player2d: Vec2 = [player.player.position[0], player.player.position[2]];
  const posToPlayerDir = sub2([pos[0], pos[2]], player2d);
  const len = length2(posToPlayerDir);
  maxDist /= zoomScale(zoom);
  const clipped = len >= maxDist;
  const newPos = add2(
    scale2(Math.min(maxDist, len), normalizev2(posToPlayerDir)),
    player2d
  );

  return [
    ...worldToMinimapCanvasCoordinates(
      [newPos[0], 0, newPos[1]],
      player,
      zoom,
      canvasWidth,
      canvasHeight
    ),
    clipped,
  ] as [number, number, boolean];
}

export function getMapBrightness(skyParams: SkyParams) {
  const distance = skyParams.sunDirection.dot(new Vector3(0, 1, 0));
  const nightBright = 0.4;
  const transitionDistance = 0.2;
  const s =
    0.5 +
    clamp(distance, -transitionDistance, transitionDistance) /
      (2 * transitionDistance);
  return s * nightBright + (1.0 - nightBright);
}

export function worldToPannableMapCoordinates(pos: ReadonlyVec3): Vec2 {
  return [-pos[2], pos[0]];
}
export function world2ToPannableMapCoordinates(pos: ReadonlyVec2): Vec2 {
  return [-pos[1], pos[0]];
}
export function pannableMapToWorldCoordinates(pos: ReadonlyVec2): Vec2 {
  return [pos[1], -pos[0]];
}

export const MAX_MARKER_SIZE = 1000;
export enum MarkerZIndexes {
  HOVER_PHOTOS = 101 * MAX_MARKER_SIZE,
  LOCAL_PLAYER = 100 * MAX_MARKER_SIZE,
  NAVIGATION_BEAMS = 99 * MAX_MARKER_SIZE,
  OTHER_PLAYERS = 98 * MAX_MARKER_SIZE,
  ROBOTS = 97 * MAX_MARKER_SIZE,
  DEATH = 96 * MAX_MARKER_SIZE,
  MAILBOX = 95 * MAX_MARKER_SIZE,
  PHOTOS = 94 * MAX_MARKER_SIZE,
  LABEL = 1 * MAX_MARKER_SIZE,
}

export const SINGLETON_NAVIGATION_BEAM_ID = 313215;

export function pannableWorldBoundsFromData(
  data: Pick<MapTileMetadata, "boundsEnd" | "boundsStart">
) {
  return [
    [-data.boundsStart[1], data.boundsStart[0]],
    [-data.boundsEnd[1], data.boundsEnd[0]],
  ] as [Vec2, Vec2];
}

function zoomToTileLevel(zoom: number) {
  return 4 - Math.floor(zoom);
}

export function mapTileUV(
  tileSize: number,
  pos: ReadonlyVec3,
  zoom: number
): Vec2 {
  const [mapX, mapY] = worldToMinimapMapCoordinates(pos, zoom);
  const tileCoordX = Math.floor(mapX / tileSize);
  const tileCoordY = Math.floor(mapY / tileSize);
  return [tileCoordX, tileCoordY];
}

export function mapTileURL(
  metadata: Pick<
    WorldMapMetadataResponse,
    "versionIndex" | "tileImageTemplateURL"
  >,
  kind: TileType,
  [u, v]: ReadonlyVec2,
  zoom: number
) {
  const lvl = zoomToTileLevel(zoom);
  const key = tileName(kind, lvl, [u, v]);
  const version = metadata.versionIndex[key];
  if (version) {
    return tileURL(version, kind, lvl, [u, v]);
  } else {
    return black.src;
  }
}

// Gets smoothed position if available
export function getClientRenderPosition(
  resources: ClientResources,
  entityId: BiomesId
) {
  const ecsPos = resources.get("/ecs/c/position", entityId)?.v ?? [0, 0, 0];
  const playerPos = resources.peek("/scene/player", entityId)?.position;
  if (playerPos && dist(ecsPos, playerPos) < 10) {
    return playerPos;
  }

  const becomeNPC = resources.peek("/scene/npc/become_npc");

  if (becomeNPC?.kind === "active" && becomeNPC.entityId === entityId) {
    return becomeNPC.position;
  }

  const npcPos = resources
    .peek("/scene/npc/render_state", entityId)
    ?.smoothedPosition?.();
  if (npcPos && dist(ecsPos, npcPos) < 10) {
    return npcPos;
  }

  return ecsPos;
}
