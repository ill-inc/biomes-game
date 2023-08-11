import type { ClientInput } from "@/client/game/context_managers/input";
import type { ClientTable } from "@/client/game/game";
import { CAMERA_AABB } from "@/client/game/resources/camera";
import type { ClientResources } from "@/client/game/resources/types";
import type {
  CamTweaks,
  TrackingCamTweaks,
} from "@/server/shared/minigames/ruleset/tweaks";
import { baseIsometric } from "@/server/shared/minigames/ruleset/tweaks";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { CameraItemMode } from "@/shared/bikkie/schema/types";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { Item, Vec2f, Vec3f } from "@/shared/ecs/gen/types";
import { CollisionHelper } from "@/shared/game/collision";
import { isPlayer } from "@/shared/game/players";
import type { BiomesId } from "@/shared/ids";
import {
  add,
  dist,
  getIntersectionAABB,
  normalizev,
  scale,
  shiftAABB,
  sideDir,
  sizeAABB,
  sub,
  viewDir,
  volumeAABB,
} from "@/shared/math/linear";
import type {
  AABB,
  ReadonlyVec2,
  ReadonlyVec3,
  Vec2,
  Vec3,
} from "@/shared/math/types";
import { timeCodeSampled } from "@/shared/metrics/performance_timing";
import { passNever } from "@/shared/util/type_helpers";
import type { Quaternion } from "three";
import * as THREE from "three";

export function compatibleCameraModes(
  item: Item | undefined
): Array<CameraItemMode> {
  if (item?.cameraModes) {
    return item.cameraModes;
  }

  if (item?.id === BikkieIds.isoCam) {
    return [
      {
        kind: "isometric",
        quadrant: "ne",
        label: "Isometric - NE",
        modeType: "isometric",
      },
      {
        kind: "isometric",
        quadrant: "nw",
        label: "Isometric - NW",
        modeType: "isometric",
      },
      {
        kind: "isometric",
        quadrant: "sw",
        label: "Isometric - SW",
        modeType: "isometric",
      },
      {
        kind: "isometric",
        quadrant: "se",
        label: "Isometric - SE",
        modeType: "isometric",
      },
    ];
  } else if (item?.id === BikkieIds.zoomCam) {
    return [
      {
        kind: "fps",
        label: "Zoom 2x",
        zoom: 2,
        modeType: "fps",
      },
      {
        kind: "fps",
        label: "Zoom 4x",
        zoom: 4,
        modeType: "fps",
      },
      {
        kind: "fps",
        label: "Zoom 8x",
        zoom: 8,
        modeType: "fps",
      },
    ];
  } else if (item?.id === BikkieIds.camera) {
    return [
      {
        kind: "fps",
        label: "Normal",
        modeType: "fps",
        zoom: 1,
      },
      {
        kind: "selfie",
        label: "Selfie",
        modeType: "selfie",
      },
    ];
  } else {
    return [
      {
        kind: "fps",
        label: "Normal",
        modeType: "fps",
        zoom: 1,
      },
    ];
  }
}

function fovDegreesZoom(base: number, zoom: number) {
  return (Math.atan(Math.tan((base * Math.PI) / (zoom * 180))) * 180) / Math.PI;
}

function camTweaksForCamMode(
  resources: ClientResources,
  camMode: CameraItemMode
): CamTweaks {
  const tweaks = resources.get("/tweaks");
  switch (camMode.kind) {
    case "fps":
      const base = { ...tweaks.inGameCamera.fps };
      base.fov = fovDegreesZoom(base.fov, camMode.zoom || 1);
      return base;
    case "selfie":
      return tweaks.inGameCamera.selfie;
    case "isometric":
      const isoBase = { ...baseIsometric };
      const amt = 50;
      switch (camMode.quadrant) {
        case "ne":
          isoBase.offsetX = amt;
          isoBase.offsetZ = -amt;
          isoBase.offsetY = amt;
          break;
        case "nw":
          isoBase.offsetX = -amt;
          (isoBase.offsetZ = -amt), (isoBase.offsetY = amt);
          break;
        case "sw":
          isoBase.offsetX = -50;
          isoBase.offsetZ = 50;
          isoBase.offsetY = 50;
          break;
        case "se":
          isoBase.offsetX = 50;
          isoBase.offsetZ = 50;
          isoBase.offsetY = 50;
          break;
      }

      return isoBase;

    default:
      passNever(camMode);
  }

  return tweaks.inGameCamera.normal;
}

export function getSelfieSelected(resources: ClientResources) {
  const selection = resources.get("/hotbar/selection");
  return selection?.kind === "camera" && selection.mode.kind === "selfie";
}

export function getPlayerCameraParameters(
  resources: ClientResources,
  input: ClientInput,
  defaultCam: "third_person" | "first_person" = "third_person"
) {
  const selection = resources.get("/hotbar/selection");
  const tweaks = resources.get("/tweaks");
  let cam!: CamTweaks;
  if (selection?.kind === "camera") {
    cam = camTweaksForCamMode(resources, selection.mode);
  } else {
    const reverse = input.motion("reverse_camera") > 0;
    if (reverse) {
      cam = tweaks.reverseThirdPersonCam;
    } else {
      if (defaultCam === "first_person") {
        cam = tweaks.firstPersonCam;
      } else {
        cam = tweaks.thirdPersonCam;
      }
    }
  }

  return cam;
}

function offsetVectorForCam(orientation: Vec2, offsets: Vec3f) {
  // Work out the orientation axis about the player.
  const up = [0, 1, 0] as const;
  const view = viewDir(orientation);
  const side = sideDir(view);

  return add(
    add(scale(-offsets[2], view), scale(offsets[1], up)),
    scale(offsets[0], side)
  );
}

export function playerFirstPersonCamPosition(
  position: ReadonlyVec3,
  aabb: AABB
) {
  const ret: Vec3 = [...position];
  ret[1] += sizeAABB(aabb)[1];
  ret[1] -= CAMERA_AABB[1][1];
  return ret;
}

export function camOffsetVector(cam: TrackingCamTweaks): Vec3f {
  return [cam.offsetRight, cam.offsetUp, cam.offsetBack];
}

export function thirdPersonCamPosition(
  orientation: Vec2f,
  offsetVector: Vec3f,
  trackPos: Vec3
) {
  return add(trackPos, offsetVectorForCam(orientation, offsetVector));
}

export function clippedThirdPersonCamPositionWithCollision(
  table: ClientTable,
  resources: ClientResources,
  cameraOwnerId: BiomesId,
  first: Vec3,
  third: Vec3,
  startDist = 0
) {
  const tweaks = resources.get("/tweaks");
  const overlapTweak = tweaks.trackingCamOverlapRequired;
  const enableNPCCollisions = tweaks.trackingCamNPCEntityCollisions;
  const testCollision = (pos: Vec3) => {
    let collided = false;
    const shiftedAABB = shiftAABB(CAMERA_AABB, pos);
    const vol = volumeAABB(shiftedAABB);
    CollisionHelper.intersect(
      (id) => resources.get("/physics/boxes", id),
      table,
      resources.get("/ecs/metadata"),
      shiftedAABB,
      (aabb: AABB, entity?: ReadonlyEntity) => {
        if (!entity || entity.id !== cameraOwnerId) {
          if (
            !enableNPCCollisions &&
            (entity?.npc_metadata || isPlayer(entity))
          ) {
            return;
          }

          if (!overlapTweak) {
            collided = true;
            return;
          }

          // Optionally try out a version of collisison that requires a certain
          // threshold of overlap.
          const intersect = getIntersectionAABB(aabb, shiftedAABB);
          if (intersect) {
            const overlap = volumeAABB(intersect) / vol;
            if (overlap > overlapTweak) {
              collided = true;
            }
          } else {
            collided = true;
          }
        }
      }
    );
    return collided;
  };

  // Truncate to the first-person position if the distance is too small.
  if (dist(first, third) < 1e-3) {
    return first;
  }

  // March from start position to third until the camera collides with something.
  // If it collides at the start position, return first person
  // NOTE: We do two marches at different step sizes for perf reasons.
  const dir = normalizev(sub(third, first));
  const beginMarchPos = add(first, scale(startDist, dir));
  let finalPos = beginMarchPos;
  timeCodeSampled("camera.collision", 1000, () => {
    const outerSize = 10;
    const outerStep = dist(beginMarchPos, third) / outerSize;
    for (let i = 0; i < outerSize; i += 1) {
      const outerPos = add(beginMarchPos, scale(i * outerStep, dir));

      if (testCollision(outerPos)) {
        if (i === 0) {
          finalPos = first;
          break;
        }
        const innerSize = 10;
        const innerStep = outerStep / innerSize;
        for (let j = 0; j < innerSize; j += 1) {
          const innerPos = add(finalPos, scale(innerStep, dir));
          if (testCollision(innerPos)) {
            break;
          }
          finalPos = innerPos;
        }
        break;
      }
      finalPos = outerPos;
    }
  });

  return finalPos;
}

export function getCamOrientation(orientation: ReadonlyVec2, flipAmount = 0.0) {
  const baseEuler = new THREE.Euler(orientation[0], orientation[1], 0, "YXZ");
  const ret = new THREE.Quaternion().setFromEuler(baseEuler);
  ret.multiply(
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI * flipAmount
    )
  );
  return ret;
}

export function getOrientationFromQuat(quat: Quaternion): Vec2 {
  return new THREE.Euler().setFromQuaternion(quat, "YXZ").toArray() as [
    number,
    number
  ];
}

export function slerpOrientations(
  begin: ReadonlyVec2,
  end: ReadonlyVec2,
  s: number
) {
  const ret = new THREE.Quaternion();
  ret.slerpQuaternions(getCamOrientation(begin), getCamOrientation(end), s);
  return getOrientationFromQuat(ret);
}
