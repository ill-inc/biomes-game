import { getClientRenderPosition } from "@/client/components/map/helpers";
import type { ClientConfig } from "@/client/game/client_config";
import type { Events } from "@/client/game/context_managers/events";
import type { ClientInput } from "@/client/game/context_managers/input";
import type { ClientTable } from "@/client/game/game";
import type { Camera, CameraEffects } from "@/client/game/resources/camera";
import type { ClientResources } from "@/client/game/resources/types";
import type { Script } from "@/client/game/scripts/script_controller";
import { bezierFunctionsScalar } from "@/client/game/util/bezier";
import {
  camOffsetVector,
  clippedThirdPersonCamPositionWithCollision,
  getCamOrientation,
  getOrientationFromQuat,
  getPlayerCameraParameters,
  playerFirstPersonCamPosition,
  slerpOrientations,
  thirdPersonCamPosition,
} from "@/client/game/util/camera";
import type {
  ScalarTransition,
  Vec3Transition,
} from "@/client/game/util/transitions";
import {
  BezierTransition,
  Vec3TransitionBuilder,
  smoothConstantScalarTransition,
  smoothConstantVec3Transition,
} from "@/client/game/util/transitions";
import { cleanUntypedEmitterCallback } from "@/client/util/helpers";
import { getTypedStorageItem } from "@/client/util/typed_local_storage";
import type {
  CamTweaks,
  PlayerFixedCameraTweaks,
  TrackingCamTweaks,
} from "@/server/shared/minigames/ruleset/tweaks";
import type { ReadonlyVec3f, Vec2f, Vec3f } from "@/shared/ecs/gen/types";
import { getAabbForEntity, getSizeForEntity } from "@/shared/game/entity_sizes";
import { playerAABB } from "@/shared/game/players";
import type { BiomesId } from "@/shared/ids";
import { normalizeAngle, normalizeOrientation } from "@/shared/math/angles";
import { easeInOut } from "@/shared/math/easing";
import {
  add,
  add2,
  approxEquals,
  approxEquals2,
  centerAABB,
  centerAABBXZ,
  dist,
  interp,
  normalizev,
  scale,
  sizeAABB,
  sub,
  xzProject,
} from "@/shared/math/linear";
import { clamp, lerp } from "@/shared/math/math";
import type { ReadonlyVec3, Vec2, Vec3 } from "@/shared/math/types";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";

export type CameraTargetObject =
  | {
      kind: "player";
      camTweaks: CamTweaks;
    }
  | {
      kind: "object";
      objectId: string | number | BiomesId;
      camTweaks: CamTweaks;

      target: ReadonlyVec3;
      onAfterTick?: (dt: number) => void;
      onEnter?: () => void;
      onExit?: () => void;
    };

export class CameraScript implements Script {
  readonly name = "camera";

  static OBJECT_TRACKING_TRANSITION_TIME = 500.0;
  static SELFIE_TRANSITION_TIME = 500;
  static CAMERA_OFFSET_MOMENTUM = 0.075;
  static FIXED_CAMERA_DRAW_DISTANCE = 256;
  static FISH_CAUGHT_CAMERA_TRANSITION_TIME = 500;

  private defaultToFirstPerson: boolean;
  private smoothFOV = smoothConstantScalarTransition(0, 0.1);
  private smoothTrackDistance: ScalarTransition;
  private smoothTrackDistMomentum = 0.1;
  private smoothIsometricTransition: undefined | Vec3Transition;
  private smoothDrawDistance = makeFarPlaneTransition();
  private beginTrackedObjectTransitionPosition: Vec3f = [0, 0, 0];
  private beginTrackedObjectTransitionOrientation: Vec2f = [0, 0];
  private beginTrackedObjectTransition = 0;
  private smoothCameraOffsetVector = smoothConstantVec3Transition(
    [0, 0, 0],
    CameraScript.CAMERA_OFFSET_MOMENTUM
  );
  private smoothCameraMarchDistance = smoothConstantScalarTransition(
    0,
    CameraScript.CAMERA_OFFSET_MOMENTUM
  );
  private lastPlayerOrientation: Vec2f = [0, 0];
  private lastCamTweaks!: CamTweaks;
  private lastTrackedObject: CameraTargetObject;
  private selfieTransitionStartTime?: number;
  private selfieTransitionBeginOrientation: Vec2f = [0, 0];
  private selfieTransitionFinishOrientation: Vec2f = [0, 0];
  private lastTrackedPosition: Vec3f = [0, 0, 0];
  private lastTrackedOrientation: Vec2f = [0, 0];

  private cinematicOffsets: Vec3f = [0, 0, 0];

  private orientation: Vec2f = [0, 0];
  private cleanUps: Array<() => unknown> = [];

  constructor(
    private readonly userId: BiomesId,
    private readonly input: ClientInput,
    private readonly resources: ClientResources,
    private readonly table: ClientTable,
    clientConfig: ClientConfig,
    private readonly events: Events
  ) {
    this.lastTrackedObject = {
      kind: "player",
      camTweaks: this.resources.get("/tweaks").thirdPersonCam,
    };
    this.orientation = this.resources.get(
      "/scene/local_player"
    ).player.orientation;
    if (clientConfig.startOrientation) {
      this.orientation = clientConfig.startOrientation;
    }
    this.smoothTrackDistMomentum =
      resources.get("/tweaks").trackingCamSmoothMomentum;
    this.smoothTrackDistance = smoothConstantScalarTransition(
      0,
      this.smoothTrackDistMomentum
    );
    this.defaultToFirstPerson =
      this.resources.get("/server/sync_target").kind === "position";
    this.cleanUps.push(
      cleanUntypedEmitterCallback(input.emitter, {
        first_person_toggle: () => {
          this.defaultToFirstPerson = !this.defaultToFirstPerson;
        },
      })
    );
  }

  clear() {
    for (const cleanup of this.cleanUps) {
      cleanup();
    }
    this.cleanUps = [];
  }

  // Sets the far plane to 0 and let it transition back to what it's
  // current smoothing target is, producing an effect where the world
  // smoothly fades in from near to far.
  doFarPlaneFadeInTransition() {
    const target = this.resources.get(
      "/settings/graphics/dynamic"
    ).drawDistance;
    this.smoothDrawDistance = makeFarPlaneTransition();
    this.smoothDrawDistance.target(target);
  }

  private applyCameraEffects(camera: Camera) {
    const effects = this.resources.get("/scene/camera_effects");
    const validEffects: CameraEffects["effects"] = [];
    for (const effect of effects.effects) {
      switch (effect.kind) {
        case "shake":
          const t = (performance.now() - effect.start) / effect.duration;
          if (t > 1) {
            continue;
          }

          const shakeMagnitude = effect.dampedMagnitude * (1 - t);
          camera.three.rotateZ(
            shakeMagnitude * Math.sin(2 * Math.PI * t * effect.repeats)
          );
          validEffects.push(effect);
          break;
        default:
          assertNever(effect.kind);
      }
    }

    if (effects.startFarPlaneTransition) {
      this.doFarPlaneFadeInTransition();
    }

    // Garbage collect expired effects
    if (
      validEffects.length !== effects.effects.length ||
      effects.startFarPlaneTransition
    ) {
      this.resources.update("/scene/camera_effects", (newEffects) => {
        newEffects.effects = validEffects;
        newEffects.startFarPlaneTransition = false;
      });
    }
  }

  trackingCameraTickForObject(
    dt: number,
    firstPos: Vec3f,
    orientation: Vec2f,
    camTweaks: TrackingCamTweaks
  ) {
    const desiredMomentum =
      this.resources.get("/tweaks").trackingCamSmoothMomentum;
    if (desiredMomentum !== this.smoothTrackDistMomentum) {
      this.smoothTrackDistMomentum = desiredMomentum;
      this.smoothTrackDistance = smoothConstantScalarTransition(
        0,
        this.smoothTrackDistMomentum
      );
    }

    // If cinematic mode is enabled, adjust the camera position based on input.
    if (getTypedStorageItem("settings.cam.cinematicMode")) {
      const lateral = Math.sign(this.input.motion("cam_lateral")) as -1 | 0 | 1;
      const forward = Math.sign(this.input.motion("cam_forward")) as -1 | 0 | 1;
      this.cinematicOffsets[0] += lateral * dt * 1.5;
      if (this.input.motion("cam_up_toggle")) {
        this.cinematicOffsets[1] += forward * dt * 1.5;
      } else {
        this.cinematicOffsets[2] -= forward * dt * 1.5;
      }
      camTweaks.offsetRight += this.cinematicOffsets[0];
      camTweaks.offsetUp += this.cinematicOffsets[1];
      camTweaks.offsetBack += this.cinematicOffsets[2];
    }

    const desiredOffsetVector = camOffsetVector(camTweaks);
    this.smoothCameraOffsetVector.target(desiredOffsetVector);
    this.smoothCameraOffsetVector.tick(dt);
    this.smoothCameraMarchDistance.target(camTweaks.startMarchDistance ?? 0);
    this.smoothCameraMarchDistance.tick(dt);

    const desiredThirdPos = thirdPersonCamPosition(
      orientation,
      this.smoothCameraOffsetVector.get(),
      firstPos
    );
    // Compute the position of the camera.
    const thirdPosCollide = clippedThirdPersonCamPositionWithCollision(
      this.table,
      this.resources,
      this.userId,
      firstPos,
      desiredThirdPos,
      this.smoothCameraMarchDistance.get()
    );

    let thirdPos = thirdPosCollide;
    if (this.smoothTrackDistMomentum) {
      const d = dist(thirdPosCollide, firstPos);
      this.smoothTrackDistance.target(d);
      this.smoothTrackDistance.tick(dt);

      const delt = normalizev(sub(thirdPosCollide, firstPos));
      thirdPos = add(firstPos, scale(this.smoothTrackDistance.get(), delt));
    }

    // Compute the camera orientation from the player orientation.
    const camOrientation = getCamOrientation(
      orientation,
      camTweaks.reverse ? 1.0 : 0.0
    );

    const desiredFOV = camTweaks.fov;
    this.smoothFOV.target(desiredFOV);
    this.smoothFOV.tick(dt);

    // Update the draw distance.
    const drawDistance = this.resources.get(
      "/settings/graphics/dynamic"
    ).drawDistance;
    this.smoothDrawDistance.target(drawDistance);
    this.smoothDrawDistance.tick(dt);

    // Update the camera to match the new position and orientation.
    this.resources.update("/scene/camera", (camera) => {
      camera.three.setRotationFromQuaternion(camOrientation);
      camera.three.fov = this.smoothFOV.get();
      camera.isFirstPerson = dist(thirdPos, firstPos) < 0.5;
      camera.three.position.set(...thirdPos);
      camera.three.far = this.smoothDrawDistance.get();
      this.applyCameraEffects(camera);
      camera.three.updateMatrixWorld();
      camera.three.updateProjectionMatrix();
      camera.updateFrustumBoundingSphere();
    });
  }

  fixedCameraTick(
    dt: number,
    centerTarget: ReadonlyVec3f,
    camTweaks: PlayerFixedCameraTweaks
  ) {
    this.tickCameraOrientation(camTweaks);

    this.resources.update("/scene/camera", (camera) => {
      camera.isFirstPerson = false;
      camera.three.fov = camTweaks.fov;

      const tweakPosition: Vec3 = [
        camTweaks.offsetX,
        camTweaks.offsetY,
        camTweaks.offsetZ,
      ];

      if (
        !this.smoothIsometricTransition ||
        (this.smoothIsometricTransition.done() &&
          approxEquals(camera.three.position.toArray(), tweakPosition))
      ) {
        this.smoothIsometricTransition = new Vec3TransitionBuilder()
          .withFixedDuration(1.0)
          .from(camera.three.position.toArray());
      } else {
        this.smoothIsometricTransition.tick(dt);
      }

      this.smoothIsometricTransition.target(tweakPosition);
      camera.three.position.set(
        ...add(centerTarget, this.smoothIsometricTransition.get())
      );

      camera.three.lookAt(...centerTarget);
      camera.three.far = CameraScript.FIXED_CAMERA_DRAW_DISTANCE;
      this.applyCameraEffects(camera);
      camera.three.updateMatrixWorld();
      camera.three.updateProjectionMatrix();
    });

    const player = this.resources.get("/scene/local_player");
    this.resources.update("/sim/player", player.id, (player) => {
      player.orientation = this.orientation;
    });
  }

  private getTrackedObject(): CameraTargetObject {
    const tweaks = this.resources.get("/tweaks");
    const syncTarget = this.resources.get("/server/sync_target");
    if (syncTarget.kind === "entity") {
      const pos = getClientRenderPosition(this.resources, syncTarget.entityId);

      const entity = this.resources.get("/ecs/entity", syncTarget.entityId);

      const size = entity ? getSizeForEntity(entity) : [0, 0, 0];
      const observePos = add(pos, [0, size?.[1] ?? 0, 0]);

      return {
        kind: "object",
        objectId: syncTarget.entityId,
        camTweaks: tweaks.inGameCamera.normal,
        target: observePos,
      };
    } else if (syncTarget.kind === "position") {
      const observePos = syncTarget.position;
      return {
        kind: "object",
        objectId: `observer-${observePos.join(",")})`,
        camTweaks: tweaks.inGameCamera.fps,
        target: observePos,
      };
    }

    const localPlayer = this.resources.get("/scene/local_player");
    const groupPreview = this.resources.get("/groups/placement/preview");
    const becomeNPC = this.resources.get("/scene/npc/become_npc");
    const playerCamTweaks = getPlayerCameraParameters(
      this.resources,
      this.input,
      this.defaultToFirstPerson ? "first_person" : "third_person"
    );

    if (groupPreview.active()) {
      return {
        kind: "object",
        objectId: "group",
        camTweaks: tweaks.groupPlacementCam,
        target: centerAABB(groupPreview.aabb()),
        onAfterTick: () => {
          const groupPreview = this.resources.get("/groups/placement/preview")!;
          groupPreview.camOrientation = this.orientation;

          // Update player orientation with group position
          const p2g = xzProject(
            sub(groupPreview.centeredXZPosition, localPlayer.player.position)
          );
          this.resources.update("/sim/player", localPlayer.id, (player) => {
            player.orientation[1] = normalizeAngle(
              -Math.atan2(p2g[1], p2g[0]) - Math.PI / 2
            );
          });
        },
      };
    }

    if (becomeNPC.kind === "active") {
      const entity = this.resources.get("/ecs/entity", becomeNPC.entityId);
      if (entity) {
        const aabb = getAabbForEntity(entity, {
          motionOverrides: becomeNPC,
        }) ?? [
          [0, 0, 0],
          [0, 0, 0],
        ];
        const becomeCenter = add(centerAABBXZ(aabb), [
          0,
          aabb[1][1] - aabb[0][1],
          0,
        ]);
        return {
          kind: "object",
          objectId: "group",
          camTweaks: entity.robot_component
            ? tweaks.robotPlacementPreviewCam
            : playerCamTweaks,
          target: becomeCenter,
          onEnter: () => {
            this.orientation = [
              localPlayer.player.orientation[0],
              becomeNPC.orientation[1],
            ];
          },
          onAfterTick: () => {
            this.resources.update("/scene/npc/become_npc", (val) => {
              ok(val.kind === "active");
              val.orientation = this.orientation;
            });
            // Update player orientation with group position
            const p2g = xzProject(
              sub(becomeCenter, localPlayer.player.position)
            );
            this.resources.update("/sim/player", localPlayer.id, (player) => {
              player.orientation[1] = normalizeAngle(
                -Math.atan2(p2g[1], p2g[0]) - Math.PI / 2
              );
            });
          },
        };
      }
    }

    if (localPlayer.talkingToNpc) {
      const npcPos = this.resources.get(
        "/ecs/c/position",
        localPlayer.talkingToNpc
      )?.v;
      ok(npcPos);

      const entity = this.resources.get(
        "/ecs/entity",
        localPlayer.talkingToNpc
      );
      ok(entity);
      const size = getSizeForEntity(entity);
      ok(size);

      const playerSize = sizeAABB(playerAABB([0, 0, 0]));

      const camPulloutRatio = 1.8;
      const d = dist(localPlayer.player.position, npcPos);

      const npcHeightTargetRatio = 5 / 6;
      const azimuthalOffset = Math.PI / 8;

      const npcTop = add(npcPos, [0, size[1] * npcHeightTargetRatio, 0]);
      const playerTop = add(localPlayer.player.position, [
        0,
        playerSize[1] * npcHeightTargetRatio,
        0,
      ]);

      const delta = sub(npcPos, localPlayer.player.position);
      const angle = normalizeAngle(
        -Math.atan2(delta[2], delta[0]) - Math.PI / 2
      );

      const dir = normalizev(sub(npcTop, playerTop));
      const polar = -Math.acos(dir[1]) + Math.PI / 2;

      return {
        kind: "object",
        objectId: localPlayer.talkingToNpc,
        camTweaks: {
          ...tweaks.npcCam,
          kind: "tracking",
          offsetBack: camPulloutRatio * d,
          offsetRight: 0,
          offsetUp: 0,
        },
        target: npcTop,
        onEnter: () => {
          this.orientation = normalizeOrientation([
            polar,
            angle + azimuthalOffset,
          ]);
        },
      };
    }

    if (localPlayer.fishingInfo) {
      const playerCamPos = playerFirstPersonCamPosition(
        localPlayer.player.position,
        localPlayer.player.aabb()
      );
      switch (localPlayer.fishingInfo.state) {
        case "charging_cast":
          return {
            kind: "player",
            camTweaks: {
              ...playerCamTweaks,
              fov: playerCamTweaks.fov + 10,
            },
          };
        case "casting":
          return {
            kind: "object",
            objectId: localPlayer.fishingInfo.state,
            target: playerCamPos,
            onEnter: () => {
              this.orientation = [-Math.PI / 4, this.orientation[1]];
            },
            camTweaks: {
              ...tweaks.fishingCam,
            },
          };
          break;
        case "bite":
        case "catching":
        case "caught_reeling_in":
        case "waiting_for_bite":
          return {
            objectId: localPlayer.fishingInfo.state,
            kind: "object",
            target: playerCamPos,
            camTweaks: {
              ...tweaks.fishingCam,
            },
          };
          break;

        case "caught":
          return {
            kind: "object",
            objectId: localPlayer.fishingInfo.state,
            camTweaks: tweaks.fishingCamCaught,
            target: playerCamPos,
            onEnter: () => {
              if (localPlayer.fishingInfo?.state !== "caught") {
                return;
              }
            },
            onAfterTick: (dt) => {
              if (localPlayer.fishingInfo?.state !== "caught") {
                return;
              }
              // Flip 180 of the last tracked orientation.
              // Constant speed to keep this stateless
              const targetOrientation: Vec2 = [
                0,
                this.lastTrackedOrientation[1] + Math.PI,
              ];
              const curQuat = getCamOrientation(localPlayer.player.orientation);
              const targetQuat = getCamOrientation(targetOrientation);
              const stepDelta =
                ((dt * 1000) /
                  CameraScript.FISH_CAUGHT_CAMERA_TRANSITION_TIME) *
                Math.PI *
                2;
              const rotatedQuat = curQuat.rotateTowards(targetQuat, stepDelta);
              this.resources.update("/sim/player", localPlayer.id, (player) => {
                player.orientation = getOrientationFromQuat(rotatedQuat);
              });
            },

            onExit: () => {
              // Could be nice to transition to this, but we would need to tick on the next state
              // so it would probably be better to add a finishing transition state
              this.resources.update("/sim/player", localPlayer.id, (player) => {
                player.orientation = this.lastTrackedOrientation;
              });

              this.orientation = this.lastTrackedOrientation;
              this.beginTrackedObjectTransitionOrientation =
                this.lastTrackedOrientation;
            },
          };
      }
    }

    return {
      kind: "player",
      camTweaks: playerCamTweaks,
    };
  }

  private beginSelfieTransition() {
    this.selfieTransitionStartTime = performance.now();
    this.selfieTransitionBeginOrientation = this.orientation;
    this.selfieTransitionFinishOrientation = [0, this.orientation[1] + Math.PI];
  }

  private selfieTransitionTick(
    dt: number,
    trackedObjectInterpS: number,
    camTweaks: TrackingCamTweaks
  ) {
    ok(this.selfieTransitionStartTime);
    const player = this.resources.get("/scene/local_player");
    const scenePlayer = this.resources.get("/scene/player", player.id);
    const delta =
      (performance.now() - this.selfieTransitionStartTime) /
      CameraScript.SELFIE_TRANSITION_TIME;
    const s = Math.min(easeInOut(delta), 1.0);
    const track = playerFirstPersonCamPosition(
      scenePlayer.position,
      scenePlayer.aabb()
    );
    if (delta >= 1.0) {
      this.selfieTransitionStartTime = undefined;
      this.smoothCameraOffsetVector.src = camOffsetVector(camTweaks);
      player.player.eagerEmote(this.events, this.resources, "wave");
      this.orientation = this.selfieTransitionFinishOrientation;
    } else {
      this.trackingCameraTickForObject(
        dt,
        interp(
          this.beginTrackedObjectTransitionPosition,
          track,
          trackedObjectInterpS
        ),
        [
          lerp(
            this.selfieTransitionBeginOrientation[0],
            this.selfieTransitionFinishOrientation[0],
            s
          ),
          this.selfieTransitionBeginOrientation[1],
        ],
        {
          ...camTweaks,
          offsetBack: -camTweaks.offsetBack,
          reverse: false,
        }
      );

      this.resources.update("/sim/player", player.id, (player) => {
        player.orientation = slerpOrientations(
          this.selfieTransitionBeginOrientation,
          this.selfieTransitionFinishOrientation,
          s
        );
      });

      this.lastTrackedPosition = track;
      this.lastTrackedOrientation = this.orientation;
    }
  }

  private tickCameraOrientation(cam: CamTweaks) {
    const tweaks = this.resources.get("/tweaks");
    const viewX = this.input.motion("view_x");
    const viewY = this.input.motion("view_y");

    if (viewX || viewY) {
      const xSpeed = tweaks.playerPhysics.viewSpeed * viewX;
      const ySpeed = tweaks.playerPhysics.viewSpeed * viewY;
      this.orientation = normalizeOrientation([
        clamp(
          this.orientation[0] - ySpeed * (cam.reverse ? -1 : 1),
          -0.48 * Math.PI,
          0.48 * Math.PI
        ),
        this.orientation[1] - xSpeed,
      ]);
    }
  }

  private trackingCameraTick(
    dt: number,
    trackedObject: CameraTargetObject,
    camTweaks: TrackingCamTweaks
  ) {
    this.tickCameraOrientation(camTweaks);
    const player = this.resources.get("/scene/local_player");
    const scenePlayer = this.resources.get("/scene/player", player.id);

    if (
      trackedObject.kind !== this.lastTrackedObject.kind ||
      (trackedObject.kind === "object" &&
        this.lastTrackedObject.kind === "object" &&
        trackedObject.objectId !== this.lastTrackedObject.objectId)
    ) {
      this.beginTrackedObjectTransitionPosition = this.lastTrackedPosition;
      this.beginTrackedObjectTransitionOrientation =
        this.lastTrackedOrientation;
      this.beginTrackedObjectTransition = performance.now();
      if (this.lastTrackedObject.kind === "object") {
        this.lastTrackedObject?.onExit?.();
      }
      if (trackedObject.kind === "object") {
        trackedObject?.onEnter?.();
      }
    }

    const trackedObjectInterpS = easeInOut(
      Math.min(
        (performance.now() - this.beginTrackedObjectTransition) /
          CameraScript.OBJECT_TRACKING_TRANSITION_TIME,
        1.0
      )
    );

    switch (trackedObject.kind) {
      case "object":
        const pos = trackedObject.target;
        this.trackingCameraTickForObject(
          dt,
          interp(
            this.beginTrackedObjectTransitionPosition,
            pos,
            trackedObjectInterpS
          ),
          slerpOrientations(
            this.beginTrackedObjectTransitionOrientation,
            this.orientation,
            trackedObjectInterpS
          ),
          camTweaks
        );
        trackedObject.onAfterTick?.(dt);
        this.lastTrackedPosition = [...pos];
        this.lastTrackedOrientation = this.orientation;
        break;

      case "player":
        const track = playerFirstPersonCamPosition(
          scenePlayer.position,
          scenePlayer.aabb()
        );

        if (this.lastTrackedObject.kind !== "player") {
          this.orientation = [...player.player.orientation];
        }

        const fovBoost = player.player.running;
        if (
          camTweaks.kind === "tracking_selfie" &&
          this.lastCamTweaks.kind !== "tracking_selfie"
        ) {
          this.beginSelfieTransition();
        } else if (
          this.lastCamTweaks.kind === "tracking_selfie" &&
          camTweaks.kind !== "tracking_selfie"
        ) {
          this.orientation = normalizeOrientation(
            add2(this.orientation, [0, Math.PI])
          );
          this.smoothCameraOffsetVector.src = [
            this.smoothCameraOffsetVector.src[0],
            this.smoothCameraOffsetVector.src[1],
            -this.smoothCameraOffsetVector.src[2],
          ];
        }

        if (this.selfieTransitionStartTime) {
          this.selfieTransitionTick(dt, trackedObjectInterpS, camTweaks);
        }

        if (!this.selfieTransitionStartTime) {
          this.trackingCameraTickForObject(
            dt,
            interp(
              this.beginTrackedObjectTransitionPosition,
              track,
              trackedObjectInterpS
            ),
            slerpOrientations(
              this.beginTrackedObjectTransitionOrientation,
              this.orientation,
              trackedObjectInterpS
            ),
            {
              ...camTweaks,
              offsetBack:
                camTweaks.offsetBack +
                ((fovBoost ? camTweaks.runOffsetBackIncrease : 0) ?? 0),
              fov:
                camTweaks.fov +
                ((fovBoost ? camTweaks.runFovIncrease : 0) ?? 0),
            }
          );
          this.lastTrackedPosition = track;
          this.lastTrackedOrientation = this.orientation;
          this.resources.update("/sim/player", player.id, (player) => {
            player.orientation = this.orientation;
          });
        }
        break;

      default:
        assertNever(trackedObject);
    }
    this.lastTrackedObject = trackedObject;
  }

  tick(dt: number) {
    const wpc = this.resources.get("/scene/waypoint_camera/active");
    if (wpc.kind === "active") {
      const cam = this.resources.get("/scene/camera");
      cam.three.setRotationFromQuaternion(getCamOrientation(wpc.value[1]));
      cam.three.position.fromArray(wpc.value[0]);
      return;
    }

    // Get the current camera parameters. These are affected by different game
    // modes (e.g. placing a group affects camera perspective) and player input.
    const trackedObject = this.getTrackedObject();
    this.lastCamTweaks ??= trackedObject.camTweaks;

    // Get the player resource.
    const player = this.resources.get("/scene/local_player");
    const scenePlayer = this.resources.get("/scene/player", player.id);

    if (!approxEquals2(player.player.orientation, this.lastPlayerOrientation)) {
      this.orientation = player.player.orientation;
    }

    switch (trackedObject.camTweaks.kind) {
      case "fixed":
        this.fixedCameraTick(dt, scenePlayer.position, trackedObject.camTweaks);
        break;
      default:
      case "tracking":
        this.trackingCameraTick(dt, trackedObject, trackedObject.camTweaks);
        break;
    }

    this.lastCamTweaks = trackedObject.camTweaks;
    this.lastPlayerOrientation = player.player.orientation;
  }
}

function makeFarPlaneTransition() {
  return new BezierTransition<number>(bezierFunctionsScalar, 0, 0, 1);
}
