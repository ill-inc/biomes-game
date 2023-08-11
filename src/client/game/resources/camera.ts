import type { ClientContext } from "@/client/game/context";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type { ScalarTransition } from "@/client/game/util/transitions";
import { smoothConstantScalarTransition } from "@/client/game/util/transitions";
import { shardsForAABB } from "@/shared/game/shard";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import {
  centerAABB,
  frustumBoundingSphere,
  shiftAABB,
} from "@/shared/math/linear";
import type { AABB, ReadonlyOrientedPoint, Vec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import { uniqueId } from "lodash";
import * as THREE from "three";

export interface WaypointCameraTrack {
  waypoints: ReadonlyOrientedPoint[];
  speed: number;
}

export type WaypointCameraActive =
  | {
      kind: "empty";
    }
  | {
      kind: "active";
      value: ReadonlyOrientedPoint;
    };

export const CAMERA_AABB: AABB = [
  [-0.2, -0.2, -0.2],
  [0.2, 0.2, 0.2],
];

export interface ShakeEffect {
  kind: "shake";
  dampedMagnitude: number;
  repeats: number;
  duration: number;
  start: number;
}

export interface CameraEffects {
  effects: ShakeEffect[];
  startFarPlaneTransition: boolean;
}

export class Camera {
  three: THREE.PerspectiveCamera;
  isFirstPerson: boolean = false;
  frustumBoundingSphere: { center: Vec3; radius: number };

  constructor(fov = 45, near = 0.1, far = 256) {
    const aspect = window.innerWidth / window.innerHeight;
    this.three = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.frustumBoundingSphere = this.updateFrustumBoundingSphere();
  }

  pos(): Vec3 {
    return this.three.position.toArray();
  }

  view() {
    const ret = new THREE.Vector3();
    this.three.getWorldDirection(ret);
    return ret.toArray();
  }

  viewMat() {
    return this.three.matrixWorldInverse.toArray();
  }

  normalMat() {
    return new THREE.Matrix3()
      .getNormalMatrix(this.three.matrixWorldInverse)
      .toArray();
  }

  viewProj() {
    return this.three.projectionMatrix
      .clone()
      .multiply(this.three.matrixWorldInverse)
      .toArray();
  }

  updateFrustumBoundingSphere() {
    this.frustumBoundingSphere = frustumBoundingSphere(this.viewProj());
    return this.frustumBoundingSphere;
  }
}

export interface CameraEnvironment {
  inWater: boolean;
  muckyness: ScalarTransition;
}

function createCameraEnvironment() {
  return {
    inWater: false,
    muckyness: smoothConstantScalarTransition(0, 0.05),
  };
}

function updateCameraEnvironment(
  context: ClientContext,
  deps: ClientResourceDeps,
  env: CameraEnvironment
) {
  const camera = deps.get("/scene/camera");
  const [v0, v1] = shiftAABB(CAMERA_AABB, camera.pos());
  const center = centerAABB([v0, v1]);

  // Test if the camera is in water at all.
  env.inWater = false;
  for (const shardId of shardsForAABB(v0, v1)) {
    const boxes = deps.get("/water/boxes", shardId);
    if (boxes.intersects([v0, v1])) {
      env.inWater = true;
      break;
    }
  }

  // Measure the muckyness level around the camera.
  const terrainHelper = TerrainHelper.fromResources(context.voxeloo, deps);
  env.muckyness.target(terrainHelper.getMuck(center));
}

export const DEFAULT_WAYPOINT_CAM_SPEED = 2;

export async function addCameraResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  // Dummy draw distance, will be updated by scripts.
  const camera = new Camera(45, 0.1, 128);
  builder.addGlobal("/scene/camera", camera);
  builder.addGlobal("/is_taking_screenshot", {
    thumbnailsLoading: 0,
    screenshotting: false,
  });
  builder.addGlobal("/scene/camera_effects", {
    effects: [],
    startFarPlaneTransition: false,
  });
  builder.addDynamic(
    "/camera/environment",
    createCameraEnvironment,
    loader.provide(updateCameraEnvironment)
  );
  builder.addGlobal("/scene/waypoint_camera/track", {
    waypoints: [],
    speed: DEFAULT_WAYPOINT_CAM_SPEED,
  });
  builder.addGlobal("/scene/waypoint_camera/active", {
    kind: "empty",
  });
  builder.addGlobal("/canvas_effects/hide_chrome", {
    value: false,
  });
  builder.addGlobal("/canvas_effect", {
    id: uniqueId(),
    kind: "none",
  });
}
