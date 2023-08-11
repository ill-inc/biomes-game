import type { ClientContextSubset } from "@/client/game/context";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import {
  DEFAULT_WAYPOINT_CAM_SPEED,
  type WaypointCameraTrack,
} from "@/client/game/resources/camera";
import {
  getCamOrientation,
  getOrientationFromQuat,
} from "@/client/game/util/camera";
import { dist } from "@/shared/math/linear";
import type { AnimationAction } from "three";
import {
  AnimationClip,
  AnimationMixer,
  InterpolateLinear,
  InterpolateSmooth,
  LoopOnce,
  Object3D,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
} from "three";

// Camera item interactions are handled in react
export class WaypointCameraItemSpec implements AttackDestroyDelegateSpec {
  private executingAnimationMixer?: AnimationMixer;
  private executingAnimationAction?: AnimationAction;
  private executingStart?: number;
  private executionFinish?: number;

  constructor(readonly deps: ClientContextSubset<"resources">) {}

  onSelected() {
    this.deps.resources.set("/scene/waypoint_camera/track", {
      waypoints: [],
      speed: DEFAULT_WAYPOINT_CAM_SPEED,
    });
    this.deps.resources.set("/scene/waypoint_camera/active", {
      kind: "empty",
    });
    return true;
  }

  onUnselected() {
    this.deps.resources.set("/scene/waypoint_camera/active", {
      kind: "empty",
    });
    this.deps.resources.set("/scene/waypoint_camera/track", {
      waypoints: [],
      speed: DEFAULT_WAYPOINT_CAM_SPEED,
    });
    return true;
  }

  onTick() {
    if (
      !this.executingAnimationMixer ||
      !this.executingAnimationAction ||
      !this.executingStart ||
      performance.now() > (this.executionFinish ?? 0)
    ) {
      return false;
    }

    this.executingAnimationMixer.setTime(
      (performance.now() - this.executingStart) / 1000.0
    );
    const pos = this.executingAnimationAction.getRoot().position;
    const quat = this.executingAnimationAction.getRoot().quaternion;

    this.deps.resources.set("/scene/waypoint_camera/active", {
      kind: "active",
      value: [[pos.x, pos.y, pos.z], getOrientationFromQuat(quat)],
    });
    return true;
  }

  onPrimaryDown() {
    const camera = this.deps.resources.get("/scene/camera");

    this.deps.resources.update("/scene/waypoint_camera/track", (c) => {
      c.waypoints.push([
        camera.three.position.toArray(),
        getOrientationFromQuat(camera.three.quaternion),
      ]);
    });
    return true;
  }

  onSecondaryDown() {
    if (
      this.deps.resources.get("/scene/waypoint_camera/active").kind === "active"
    ) {
      this.deps.resources.set("/scene/waypoint_camera/active", {
        kind: "empty",
      });
      this.executingAnimationAction = undefined;
      this.executingAnimationMixer = undefined;
      return true;
    }

    const trackResource = this.deps.resources.get(
      "/scene/waypoint_camera/track"
    );

    if (trackResource.waypoints.length === 0) {
      return false;
    }

    this.deps.resources.set("/scene/waypoint_camera/active", {
      kind: "active",
      value: trackResource.waypoints[0],
    });
    this.buildTracks(trackResource);
    this.executingStart = performance.now();

    return true;
  }

  private buildTracks(trackResource: WaypointCameraTrack) {
    const waypoints = trackResource.waypoints;
    const times: number[] = [];
    for (let i = 0; i < waypoints.length; i += 1) {
      if (i === 0) {
        times.push(0);
      } else {
        times.push(
          times[i - 1] +
            dist(waypoints[i][0], waypoints[i - 1][0]) / trackResource.speed
        );
      }
    }

    const positionTrack = new VectorKeyframeTrack(
      ".position",
      times,
      waypoints.flatMap((e) => e[0])
    );

    positionTrack.setInterpolation(InterpolateSmooth);

    // Convert orientations to quaternions and smooth using slerp
    const quaternions = waypoints.map(([, orientation]) =>
      getCamOrientation(orientation)
    );
    const orientations = quaternions.flatMap((quat) => quat.toArray());

    const orientationTrack = new QuaternionKeyframeTrack(
      ".quaternion",
      times,
      orientations
    );
    orientationTrack.setInterpolation(InterpolateLinear);

    const clip = new AnimationClip("My Clip", -1, [
      positionTrack,
      orientationTrack,
    ]);

    // Create an animation mixer
    const mixer = new AnimationMixer(new Object3D());

    // Create an AnimationAction
    const action = mixer.clipAction(clip);

    // Set up the animation action
    action.clampWhenFinished = true;
    action.loop = LoopOnce;
    action.play();
    this.executingAnimationMixer = mixer;
    this.executingAnimationAction = action;
    this.executionFinish = performance.now() + 1000 * times[times.length - 1];
  }
}
