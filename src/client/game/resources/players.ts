import type { ClientContext, ClientContextSubset } from "@/client/game/context";
import type { AudioManager } from "@/client/game/context_managers/audio_manager";
import type { Events } from "@/client/game/context_managers/events";
import type { PlaceEffect } from "@/client/game/helpers/place_effect";
import { computeNonDarkSpatialLighting } from "@/client/game/renderers/util";
import {
  makeBezierAngleLatencyTransition,
  makeBezierVec3LatencyTransition,
} from "@/client/game/resources/latency_transitions";
import type { MeleeAttackRegion } from "@/client/game/resources/melee_attack_region";
import {
  getPlayerMeleeAttackRegion,
  meleeAttackRegionTemplate,
} from "@/client/game/resources/melee_attack_region";
import type { ParticleSystem } from "@/client/game/resources/particles";
import type {
  ClientReactResources,
  ClientResourceDeps,
  ClientResources,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type {
  ActionPriority,
  AnimationSystemState,
  RepeatType,
} from "@/client/game/util/animation_system";
import type { playerSystem } from "@/client/game/util/player_animations";
import type { Transition } from "@/client/game/util/transitions";
import {
  directionalConstantVec3Transition,
  fixedConstantVec3Transition,
} from "@/client/game/util/transitions";
import type { AudioAssetType } from "@/galois/assets/audio";
import { getAudioAssetPaths } from "@/galois/assets/audio";
import type { Tweaks } from "@/server/shared/minigames/ruleset/tweaks";
import {
  isClimbableShape,
  isClimbableTerrain,
} from "@/shared/asset_defs/shapes";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import type { ReadonlyEmote } from "@/shared/ecs/gen/components";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { EmoteEvent } from "@/shared/ecs/gen/events";
import type {
  CameraMode,
  EmoteType,
  Item,
  RichEmoteComponents,
  ShardId,
} from "@/shared/ecs/gen/types";
import { CollisionHelper } from "@/shared/game/collision";
import {
  MAX_VOXELS_TO_CHECK_FOR_BUFF_BLOCKS,
  getBlockBelowPlayer,
  getPlayerModifiersFromBuffs,
  playerAABB,
} from "@/shared/game/players";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import type { BiomesId } from "@/shared/ids";
import { add, centerAABB, scale, sub, viewDir } from "@/shared/math/linear";
import type {
  AABB,
  Mat4,
  ReadonlyVec2,
  ReadonlyVec3,
  Vec2,
  Vec3,
} from "@/shared/math/types";
import { Timer, TimerNeverSet } from "@/shared/metrics/timer";
import { findWaterDepth } from "@/shared/physics/environments";
import type { Force, HitFn } from "@/shared/physics/types";
import { grounded, yawVector } from "@/shared/physics/utils";
import type { RegistryLoader } from "@/shared/registry";
import { fireAndForget } from "@/shared/util/async";
import { makeCvalHook } from "@/shared/util/cvals";
import type { Optional } from "@/shared/util/type_helpers";
import _, { sample } from "lodash";
import * as THREE from "three";

const DUMMY_EMOTE_DURATION = 1;
const EMOTE_EXPIRY_SECONDS = 10;

export type EmoteProperties = {
  [K in EmoteType]: {
    // If true, the last frame of the animation will stick until the player moves.
    repeatType: RepeatType;
    easeInTime?: number;
    notArms?: ActionPriority;
    cancelOnMove?: boolean;
    itemOverrideSpan?: {
      start?: number;
      end?: number;
    };
  };
};
export const EMOTE_PROPERTIES: EmoteProperties = {
  attack1: {
    repeatType: { kind: "once" },
    easeInTime: 0.01,
    notArms: "ifIdle",
    cancelOnMove: false,
  },
  attack2: {
    repeatType: { kind: "once" },
    easeInTime: 0.01,
    notArms: "ifIdle",
    cancelOnMove: false,
  },
  destroy: {
    repeatType: { kind: "repeat" },
    easeInTime: 0.01,
    notArms: "ifIdle",
    cancelOnMove: false,
  },
  place: {
    repeatType: { kind: "once" },
    easeInTime: 0.01,
    notArms: "ifIdle",
    cancelOnMove: false,
  },
  applause: { repeatType: { kind: "repeat" } },
  sit: { repeatType: { kind: "once", clampWhenFinished: true } },
  flex: { repeatType: { kind: "once", clampWhenFinished: true } },
  dance: { repeatType: { kind: "repeat" } },
  drink: { repeatType: { kind: "once" } },
  eat: { repeatType: { kind: "once" } },
  laugh: { repeatType: { kind: "once" } },
  point: { repeatType: { kind: "once", clampWhenFinished: true } },
  warp: { repeatType: { kind: "once" } },
  splash: { repeatType: { kind: "once" } },
  warpHome: { repeatType: { kind: "once" } },
  wave: { repeatType: { kind: "once" } },
  fishingCastPull: {
    repeatType: { kind: "once", clampWhenFinished: true },
  },
  fishingCastRelease: {
    repeatType: { kind: "once", clampWhenFinished: true },
  },
  fishingIdle: {
    repeatType: {
      kind: "repeat",
    },
  },
  fishingReel: {
    repeatType: {
      kind: "repeat",
    },
  },
  fishingShow: {
    repeatType: {
      kind: "repeat",
    },
  },
  diggingHand: {
    repeatType: {
      kind: "once",
    },
    easeInTime: 0.01,
    notArms: "ifIdle",
    cancelOnMove: false,
  },
  diggingTool: {
    repeatType: {
      kind: "once",
    },
    easeInTime: 0.01,
    notArms: "ifIdle",
    cancelOnMove: false,
  },
  watering: {
    repeatType: {
      kind: "once",
    },
    easeInTime: 0.01,
    notArms: "ifIdle",
    cancelOnMove: false,
  },
  rock: { repeatType: { kind: "repeat" } },
  sick: { repeatType: { kind: "once" } },
  equip: {
    repeatType: { kind: "once" },
    easeInTime: 0.01,
    notArms: "ifIdle",
    cancelOnMove: false,
    itemOverrideSpan: { start: 0.5 },
  },
  unequip: {
    repeatType: { kind: "once" },
    easeInTime: 0.01,
    notArms: "ifIdle",
    cancelOnMove: false,
    itemOverrideSpan: { end: 0.5 },
  },
};

function playsUntilInterrupted(repeatType: RepeatType) {
  if (repeatType.kind === "repeat") {
    return true;
  }

  return repeatType.clampWhenFinished;
}

function emoteDuration(
  emoteType: EmoteType,
  animationSystemState: AnimationSystemState<typeof playerSystem>
): number {
  return emoteType === "warp" ||
    emoteType === "warpHome" ||
    emoteType === "splash" ||
    animationSystemState.actions.arms[emoteType] === undefined
    ? DUMMY_EMOTE_DURATION
    : playsUntilInterrupted(EMOTE_PROPERTIES[emoteType].repeatType)
    ? Infinity
    : animationSystemState.actions.arms[emoteType]!.getClip().duration;
}

export type PlayerKnockback = {
  knockback?: {
    force: Force;
    startTime: number;
  };
};

export type SoundType =
  | "attack"
  | "footsteps"
  | "hit"
  | "break"
  | "place"
  | "collect"
  | "jump"
  | "warp"
  | "warpHome"
  | "splash"
  | "applause";

export class Player {
  // TODO: Make the below vectors readonly.
  position: Vec3 = [0, 0, 0];
  velocity: Vec3 = [0, 0, 0];
  orientation: Vec2 = [0, 0];
  previousPosition: ReadonlyVec3 = [0, 0, 0];
  sounds: Map<SoundType, THREE.PositionalAudio>;
  smoothedSpatialLighting: Transition<Vec3>;
  smoothedEyeAdaptationSpatialLighting: Transition<Vec3>;
  username = "TBD";
  emoteInfo:
    | {
        emoteStartTime: number;
        emoteEndTime: number;
        emoteExpiryTime: number;
        emoteType: EmoteType;
        richEmoteComponents?: ReadonlyEmote["rich_emote_components"];
      }
    | undefined;
  private lastEmoteTime: number | undefined;
  private lastEmoteNonce: number | undefined;
  private serverEmote: ReadonlyEmote | undefined;
  private serverEmoteUpdateTime: number | undefined;
  scale = 1.0;
  cameraMode?: CameraMode;
  lastJumpTime?: number;
  previewId?: BiomesId;
  currentlyHealing?: boolean;
  initialized = false;

  // Particle effects.
  healingParticleEffect?: ParticleSystem;
  warpParticleEffect?: ParticleSystem;
  placeEffect?: PlaceEffect;
  // Map from a buff's item ID to a particle system.
  buffParticleEffects: Record<BiomesId, Optional<ParticleSystem>> = {};

  // For animation purposes, we need to know these state variables.
  crouching = false;
  running = false;
  onGround = false;
  swimming = false;
  flying = false;
  isLocal = false;
  takingSelfie = false;

  constructor(deps: ClientResourceDeps, public readonly id: BiomesId) {
    const syncTarget = deps.get("/server/sync_target");
    this.isLocal =
      syncTarget.kind === "localUser" ? syncTarget.userId === id : false;

    const playerPosition = deps.get("/ecs/c/position", this.id);
    const playerOrientation = deps.get("/ecs/c/orientation", this.id);
    const playerRigidBody = deps.get("/ecs/c/rigid_body", this.id);

    // Set initial state from ECS.
    this.position = [...(playerPosition?.v ?? this.position)];
    this.previousPosition = [...this.position];
    this.orientation = [...(playerOrientation?.v ?? this.orientation)];
    this.velocity = [...(playerRigidBody?.velocity ?? this.velocity)];

    if (this.isLocal) {
      makeCvalHook({
        path: ["localPlayer", "position"],
        help: "Current world position of the local player.",
        collect: () => {
          const pos = this.position;
          return { x: pos[0], y: pos[1], z: pos[2] };
        },
        toHumanReadable: (p) =>
          `${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}`,
      });
      makeCvalHook({
        path: ["localPlayer", "id"],
        help: "The local player's player id.",
        collect: () => this.id,
      });
    }

    const spatialLighting = computeNonDarkSpatialLighting(
      deps,
      ...this.centerPos(),
      [1, 1.5, 1]
    );
    this.smoothedSpatialLighting = fixedConstantVec3Transition(
      [...spatialLighting, 0],
      0.08
    );
    // Eye adaptation just transitions much more slowly
    this.smoothedEyeAdaptationSpatialLighting =
      directionalConstantVec3Transition([...spatialLighting, 0], 0.05, 0.002);

    this.sounds = new Map();
  }

  viewEuler() {
    return new THREE.Euler(this.orientation[0], this.orientation[1], 0, "YXZ");
  }

  sideDir() {
    return new THREE.Vector3(0, -1, 0).cross(this.viewDir()).normalize();
  }

  viewDir() {
    return new THREE.Vector3(...viewDir(this.orientation));
  }

  emoteItemOverride(selectedItem: Item | undefined, time: number) {
    if (!this.emoteInfo) {
      return selectedItem;
    }
    const item = this.emoteInfo.richEmoteComponents?.item_override;
    const overrideSpan =
      EMOTE_PROPERTIES[this.emoteInfo.emoteType].itemOverrideSpan;
    if (!overrideSpan) {
      return item ?? selectedItem;
    }
    const emoteStartTime = this.emoteInfo.emoteStartTime;
    if (overrideSpan.start && time < emoteStartTime + overrideSpan.start) {
      return;
    }
    if (overrideSpan.end && time > emoteStartTime + overrideSpan.end) {
      return;
    }
    return item ?? selectedItem;
  }

  eagerEmote(
    events: Events,
    resources: ClientResources | ClientReactResources,
    emoteType: EmoteType,
    richEmoteComponents?: RichEmoteComponents
  ) {
    const mesh = resources.get("/scene/player/mesh", this.id);
    const time = resources.get("/clock").time;
    const nonce = Math.random();
    this.lastEmoteTime = time;
    const expiryTime = time + EMOTE_EXPIRY_SECONDS;
    this.lastEmoteNonce = nonce;
    fireAndForget(
      mesh.then((mesh) => {
        if (mesh) {
          this.startEmote(
            mesh.animationSystemState,
            time,
            expiryTime,
            emoteType,
            richEmoteComponents
          );
          fireAndForget(
            events.publish(
              new EmoteEvent({
                id: this.id,
                emote_type: emoteType,
                nonce: nonce,
                rich_emote_components: richEmoteComponents,
                start_time: time,
                expiry_time: expiryTime,
              })
            )
          );
        }
      })
    );
  }

  prolongEmote(
    events: Events,
    resources: ClientResources | ClientReactResources
  ) {
    if (!this.emoteInfo || !this.isLocal) {
      return;
    }

    const time = resources.get("/clock").time;
    const timeLeftToExpire = this.emoteInfo.emoteExpiryTime - time;
    if (timeLeftToExpire > EMOTE_EXPIRY_SECONDS / 2 || timeLeftToExpire <= 0) {
      return;
    }

    const newExpiryTime = time + EMOTE_EXPIRY_SECONDS;
    this.emoteInfo.emoteExpiryTime = newExpiryTime;
    fireAndForget(
      events.publish(
        new EmoteEvent({
          id: this.id,
          emote_type: this.emoteInfo.emoteType,
          nonce: this.lastEmoteNonce,
          rich_emote_components:
            this.emoteInfo.richEmoteComponents &&
            (this.emoteInfo.richEmoteComponents as RichEmoteComponents),
          start_time: this.emoteInfo.emoteStartTime,
          expiry_time: newExpiryTime,
        })
      )
    );
  }

  private startEmote(
    animationSystemState: AnimationSystemState<typeof playerSystem>,
    startTime: number,
    expiryTime: number,
    emoteType: EmoteType,
    richEmoteComponents?: ReadonlyEmote["rich_emote_components"]
  ) {
    this.emoteInfo = {
      emoteStartTime: startTime,
      emoteEndTime: startTime + emoteDuration(emoteType, animationSystemState),
      emoteExpiryTime: expiryTime,
      emoteType,
      richEmoteComponents,
    };
  }

  isEmoting(time: number, emoteType?: EmoteType) {
    const isEmote = this.emoteInfo && this.emoteInfo.emoteEndTime > time;
    if (!isEmote) {
      return false;
    }

    if (emoteType) {
      return this.emoteInfo?.emoteType === emoteType;
    }

    return true;
  }

  shouldCancelEmoteOnMove() {
    if (!this.emoteInfo) {
      return false;
    }

    return EMOTE_PROPERTIES[this.emoteInfo?.emoteType].cancelOnMove ?? true;
  }

  eagerCancelEmote(events: Events) {
    fireAndForget(events.publish(new EmoteEvent({ id: this.id })));
    this.cancelEmote();
  }

  private cancelEmote() {
    this.emoteInfo = undefined;
  }

  aabb(): AABB {
    return playerAABB(this.position, this.scale);
  }

  centerPos(): Vec3 {
    return scale(0.5, add(...this.aabb()));
  }

  intersectsVoxel(x: number, y: number, z: number) {
    const aabb = this.aabb();
    const xTest = aabb[0][0] < x + 1 && aabb[1][0] > x;
    const yTest = aabb[0][1] < y + 1 && aabb[1][1] > y;
    const zTest = aabb[0][2] < z + 1 && aabb[1][2] > z;
    return xTest && yTest && zTest;
  }

  setPlaceEffect(placeEffect: PlaceEffect) {
    this.clearPlaceEffect();
    this.placeEffect = placeEffect;
  }
  clearPlaceEffect() {
    this.placeEffect?.dispose();
  }

  update(deps: ClientResourceDeps): void {
    const syncTarget = deps.get("/server/sync_target");
    this.isLocal =
      syncTarget.kind === "localUser" ? syncTarget.userId === this.id : false;
    const player = deps.get("/ecs/entity", this.id);
    const tweaks = deps.get("/tweaks");
    if (!player) {
      return;
    }

    this.scale = tweaks.playerPhysics.scale;
    this.previewId = player.group_preview_reference?.ref;
    this.initialized = !!player.player_status?.init;

    // For local players, these fields are updated externally by the player
    // script, and we consider ourselves the owner of them so we ignore any
    // updates coming from the server.
    if (!this.isLocal) {
      if (player.position) {
        this.previousPosition = [...this.position];
        this.position = [...player.position.v];
      }
      if (player.orientation) {
        this.orientation = [...player.orientation.v];
      }
      if (player.rigid_body) {
        this.velocity = [...player.rigid_body.velocity];
      }
    }
    if (player.label) {
      this.username = player.label.text;
    }
    if (player.position) {
      const spatialLighting = computeNonDarkSpatialLighting(
        deps,
        player.position.v[0],
        player.position.v[1] + 1,
        player.position.v[2],
        [1, 1.5, 1]
      );
      this.smoothedSpatialLighting.target([...spatialLighting, 0]);
      this.smoothedEyeAdaptationSpatialLighting.target([...spatialLighting, 0]);
    }

    const selectedItem = this.isLocal
      ? deps.get("/hotbar/selection")?.item
      : player.selected_item?.item?.item;

    if (selectedItem?.id === BikkieIds.camera && player.player_behavior) {
      this.cameraMode = player.player_behavior.camera_mode;
    } else {
      this.cameraMode = undefined;
    }

    this.takingSelfie = this.cameraMode === "selfie";

    if (!_.isEqual(this.serverEmote, player.emote)) {
      const clock = deps.get("/clock");
      this.serverEmoteUpdateTime = clock.time;
      this.serverEmote = player.emote;
    }
  }

  updateEmoteState(
    animationSystemState: AnimationSystemState<typeof playerSystem>,
    now: number
  ) {
    if (
      this.lastEmoteTime &&
      (!this.serverEmoteUpdateTime ||
        this.lastEmoteTime >= this.serverEmoteUpdateTime)
    ) {
      // Nothing to do if there are no server updates since the last time we
      // started an emote, which may have been local-only (e.g. waving when
      // switching to selfie mode).
      return;
    }

    if (this.emoteInfo && now > this.emoteInfo.emoteExpiryTime) {
      this.cancelEmote();
    }

    const emote = this.serverEmote;
    if (!emote?.emote_type) {
      this.cancelEmote();
      return;
    }

    const passesTimeCheck =
      this.lastEmoteTime === undefined ||
      emote.emote_start_time > this.lastEmoteTime;

    const passesNonce =
      this.lastEmoteNonce === undefined ||
      emote.emote_nonce !== this.lastEmoteNonce;
    if (passesTimeCheck && passesNonce) {
      this.lastEmoteTime = emote.emote_start_time;
      this.lastEmoteNonce = emote.emote_nonce;
      const duration = emoteDuration(emote.emote_type, animationSystemState);

      // To forgive latency, start emotes even if they arrive late.
      const EMOTE_START_WIGGLE_ROOM_SECONDS = 2;
      if (
        now <
        emote.emote_start_time + duration + EMOTE_START_WIGGLE_ROOM_SECONDS
      ) {
        this.startEmote(
          animationSystemState,
          now,
          emote.emote_expiry_time,
          emote.emote_type,
          emote.rich_emote_components
        );
      }
    }
  }

  getFootstepsSound(resources: ClientResources, audioManager: AudioManager) {
    const audioListener = audioManager.getAudioListener();
    if (!audioListener) {
      return;
    }
    let sound = this.sounds.get("footsteps");
    if (sound) {
      sound.setVolume(
        audioManager.getVolume("settings.volume.effects", "footsteps")
      );
      return sound;
    }
    const buffer = resources.cached("/audio/buffer", "audio/footsteps-130-bpm");
    if (!buffer) {
      // If the audio hasn't been loaded yet, don't return anything.
      return;
    }
    sound = new THREE.PositionalAudio(audioListener);
    sound.setBuffer(buffer);
    sound.setRefDistance(3);
    sound.setLoop(true);
    this.sounds.set("footsteps", sound);
    sound.setVolume(
      audioManager.getVolume("settings.volume.effects", "footsteps")
    );
    return sound;
  }

  getSounds() {
    return this.sounds;
  }

  setSound(
    resources: ClientResources,
    audioManager: AudioManager,
    soundType: SoundType,
    assetType: AudioAssetType,
    options?: {
      resetIfAlreadyPlaying?: boolean;
    }
  ) {
    const audioListener = audioManager.getAudioListener();
    if (!audioListener) {
      return;
    }
    const volume = audioManager.getVolume("settings.volume.effects", assetType);
    if (volume === 0) {
      return;
    }
    let sound = this.sounds.get(soundType);
    if (sound && sound.isPlaying && !options?.resetIfAlreadyPlaying) {
      return sound;
    } else if (!sound) {
      sound = new THREE.PositionalAudio(audioListener);
    } else {
      sound.stop();
    }

    const assetPath = sample(getAudioAssetPaths(assetType))!;
    const buffer = resources.cached("/audio/buffer", assetPath);
    if (!buffer) {
      // If the audio buffer hasn't been loaded yet, then just don't set the
      // sound.
      return;
    }

    sound.setBuffer(buffer);
    sound.setRefDistance(3);
    sound.setLoop(false);
    sound.setVolume(volume);
    sound.play();
    this.sounds.set(soundType, sound);
    return sound;
  }

  getSpatialLighting(): Vec2 {
    return this.smoothedSpatialLighting.get().slice(0, 2) as Vec2;
  }

  getEyeAdaptationSpatialLighting(): Vec2 {
    return this.smoothedEyeAdaptationSpatialLighting.get().slice(0, 2) as Vec2;
  }
}

export interface PlayerEnvironment {
  onGround: boolean;
  lastOnGround: Timer;
  blockUnderPlayer: Biscuit | undefined;
  standingOnBlock: Biscuit | undefined;
  collidingEntities: Set<ReadonlyEntity>;
}

export interface PlayerEnvironmentMuck {
  muckyness: number;
}

function genPlayerEnvironmentMuck(
  context: ClientContext,
  deps: ClientResourceDeps,
  id: BiomesId
): PlayerEnvironmentMuck {
  const player = deps.get("/sim/player", id);
  const aabb = player.aabb();
  const center = centerAABB(aabb);
  const terrainHelper = TerrainHelper.fromResources(context.voxeloo, deps);
  // Check to see how mucky it is around the player.
  const muckyness = terrainHelper.getMuck(center);
  return {
    muckyness,
  };
}

export interface PlayerEnvironmentWater {
  inWater: boolean;
  waterDepth: number;
}

function genPlayerEnvironmentWater(
  deps: ClientResourceDeps,
  id: BiomesId
): PlayerEnvironmentWater {
  const player = deps.get("/sim/player", id);
  const aabb = player.aabb();

  const waterIndex = (id: ShardId) => deps.get("/water/boxes", id);
  // Check if the player is in water (and if so, how deep).
  const waterDepth = findWaterDepth(waterIndex, aabb);

  return {
    inWater: waterDepth !== undefined,
    waterDepth: waterDepth ?? 0,
  };
}

function genPlayerEnvironment(
  { table, voxeloo }: ClientContextSubset<"table" | "voxeloo">,
  deps: ClientResourceDeps,
  id: BiomesId,
  previous?: PlayerEnvironment
): PlayerEnvironment {
  const player = deps.get("/sim/player", id);
  const aabb = player.aabb();
  const metadata = deps.get("/ecs/metadata");

  const boxesIndex = (id: ShardId) => deps.get("/physics/boxes", id);

  // Check if the player is standing on ground.
  // NOTE: This resource is not invalidated when table entities are updated.
  const onGround = grounded(
    (aabb: AABB, fn: HitFn) =>
      CollisionHelper.intersect(
        boxesIndex,
        table,
        metadata,
        aabb,
        (aabb: AABB, entity?: ReadonlyEntity) => {
          if (!entity || entity.id !== id) {
            fn(aabb);
          }
        }
      ),
    aabb
  );

  const lastOnGround = previous?.lastOnGround ?? new Timer(TimerNeverSet);
  if (onGround) {
    lastOnGround.reset();
  }

  const [blockUnderPlayer, depth] = getBlockBelowPlayer(
    voxeloo,
    deps,
    id,
    MAX_VOXELS_TO_CHECK_FOR_BUFF_BLOCKS
  );
  const standingOnBlock = depth === 0 ? blockUnderPlayer : undefined;

  const epsilon = [0.1, 0.1, 0.1] as Vec3;
  const expandedAabb = [sub(aabb[0], epsilon), add(aabb[1], epsilon)] as AABB;
  const collidingEntities = new Set<ReadonlyEntity>();
  CollisionHelper.intersectEntities(table, expandedAabb, (hit, entity) => {
    if (entity) {
      collidingEntities.add(entity);
    }
  });

  return {
    lastOnGround,
    onGround,
    blockUnderPlayer,
    standingOnBlock,
    collidingEntities,
  };
}

export interface PlayerPossibleTerrainActions {
  canBreathe: boolean;
  canSwim: boolean;
  canClimb: boolean;
}

function genPlayerPossibleTerrainActions(
  context: ClientContext,
  deps: ClientResourceDeps,
  id: BiomesId
): PlayerPossibleTerrainActions {
  const waterIndex = (id: ShardId) => deps.get("/water/boxes", id);
  // Define a terrain helper for terrain queries.
  const player = deps.get("/sim/player", id);
  const aabb = player.aabb();
  const center = centerAABB(aabb);

  // Check if the player is able to breathe.
  const playerModifiers = deps.get("/player/modifiers");
  const canBreatheUnderwater = playerModifiers.underwaterBreathing.enabled;

  const canBreathe =
    canBreatheUnderwater ||
    !CollisionHelper.pointInAABB(waterIndex, [
      center[0],
      aabb[1][1],
      center[2],
    ]);

  // Check if the player is submerged enough to be able to swim.
  const canSwim = CollisionHelper.pointInAABB(waterIndex, [
    center[0],
    center[1],
    center[2],
  ]);

  // Check if the player is submerged enough to be able to swim.
  const forwardPos = add(center, scale(0.4, yawVector(player.orientation[1])));
  const terrainHelper = TerrainHelper.fromResources(context.voxeloo, deps);
  const canClimb =
    isClimbableTerrain(terrainHelper.getTerrainID(forwardPos)) ||
    isClimbableShape(terrainHelper.getShapeID(forwardPos));

  return {
    canBreathe,
    canSwim,
    canClimb,
  };
}

function genStaticMeleeAttackRegionTemplate(deps: ClientResourceDeps): Mat4 {
  const tweaks = deps.get("/tweaks");
  return meleeAttackRegionTemplate(tweaks);
}

function genStaticMeleeAttackRegion(
  deps: ClientResourceDeps,
  playerId: BiomesId
): MeleeAttackRegion {
  const template = deps.get("/player/melee_attack_region_template");
  return getPlayerMeleeAttackRegion(
    deps.get("/sim/player", playerId),
    template
  );
}
function genPlayerModifiers(context: ClientContext, deps: ClientResourceDeps) {
  const buffs = deps.get("/player/applicable_buffs").buffs;
  return getPlayerModifiersFromBuffs(buffs);
}

export interface PlayerControlModifiers {
  // Move up -> Move down.
  flipVertical: boolean;
  // Move left -> Move right.
  flipHorizontal: boolean;
  // Move forward -> Move backwards.
  flipForward: boolean;
}

function genPlayerControlModifiers(
  context: ClientContext,
  deps: ClientResourceDeps,
  playerId: BiomesId
): PlayerControlModifiers {
  const player = deps.get("/sim/player", playerId);
  const { input } = context;
  const reverse = player.takingSelfie || input.motion("reverse_camera") > 0;

  return {
    flipHorizontal: reverse,
    flipForward: reverse,
    flipVertical: false,
  };
}

export interface ScenePlayerData {
  position: ReadonlyVec3;
  orientation: ReadonlyVec2;
  scale: number;
}

export class ScenePlayer implements ScenePlayerData {
  position: ReadonlyVec3;
  orientation: ReadonlyVec2;
  scale: number;

  constructor(data: ScenePlayerData) {
    this.position = data.position;
    this.orientation = data.orientation;
    this.scale = data.scale;
  }

  aabb(): AABB {
    return playerAABB(this.position, this.scale);
  }
}

export abstract class UpdatableScenePlayer {
  abstract update(deps: ClientResourceDeps): ScenePlayer;
}

class RemoteScenePlayer extends UpdatableScenePlayer {
  private smoothedPosition: Transition<Vec3>;
  private smoothedOrientation: Transition<number>;
  private previousTime: number | undefined;

  constructor(tweaks: Tweaks, player: Player, private id: BiomesId) {
    super();

    this.smoothedPosition = makeBezierVec3LatencyTransition(
      player.position,
      tweaks
    );
    this.smoothedOrientation = makeBezierAngleLatencyTransition(
      player.orientation[1],
      tweaks
    );
  }

  update(deps: ClientResourceDeps) {
    const newTime = deps.get("/scene/clock");
    const player = deps.get("/sim/player", this.id);
    const dt = newTime.time - (this.previousTime ?? newTime.time);
    this.previousTime = newTime.time;

    this.smoothedPosition.target(player.position);
    this.smoothedPosition.tick(dt);
    this.smoothedOrientation.target(player.orientation[1]);
    this.smoothedOrientation.tick(dt);

    return new ScenePlayer({
      position: this.smoothedPosition.get(),
      orientation: [player.orientation[0], this.smoothedOrientation.get()],
      scale: player.scale,
    });
  }
}

class LocalScenePlayer extends UpdatableScenePlayer {
  constructor(private id: BiomesId) {
    super();
  }

  update(deps: ClientResourceDeps) {
    const tweaks = deps.get("/tweaks");
    const player = deps.get("/sim/player", this.id);

    return new ScenePlayer({
      position: (() => {
        if (!tweaks.sim.smoothLocalPlayer) {
          return [...player.position];
        } else {
          const renderNow = deps.get("/scene/clock").time;
          const simUpdateTime = deps.get("/sim/clock").lastUpdateRenderTime;
          const dt = renderNow - simUpdateTime;

          const t = dt * tweaks.sim.frameRate;
          return add(
            player.previousPosition,
            scale(t, sub(player.position, player.previousPosition))
          );
        }
      })(),
      orientation: [...player.orientation],
      scale: player.scale,
    });
  }
}

function makeScenePlayer(
  deps: ClientResourceDeps,
  cache: UpdatableScenePlayer | undefined,
  id: BiomesId
): UpdatableScenePlayer {
  const player = deps.get("/sim/player", id);

  if (player.isLocal) {
    return cache instanceof LocalScenePlayer ? cache : new LocalScenePlayer(id);
  } else {
    return cache instanceof RemoteScenePlayer
      ? cache
      : new RemoteScenePlayer(deps.get("/tweaks"), player, id);
  }
}

export async function addPlayerResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addDynamic(
    "/sim/player",
    (deps: ClientResourceDeps, id: BiomesId) => new Player(deps, id),
    (deps: ClientResourceDeps, player: Player) => player.update(deps)
  );
  builder.addWithCache(
    "/scene/player",
    (
      deps: ClientResourceDeps,
      cache: UpdatableScenePlayer | undefined,
      id: BiomesId
    ) => makeScenePlayer(deps, cache, id),
    (deps: ClientResourceDeps, cache: UpdatableScenePlayer, _id: BiomesId) =>
      cache.update(deps)
  );
  const playerEnvironmentUpdate = loader.provide(genPlayerEnvironment);
  builder.addDynamic(
    "/players/environment",
    (deps, id) => playerEnvironmentUpdate(deps, id),
    (deps, prev, id) => {
      Object.assign(prev, playerEnvironmentUpdate(deps, id, prev));
    }
  );
  builder.add(
    "/players/environment/muckyness",
    loader.provide(genPlayerEnvironmentMuck)
  );
  builder.add("/players/environment/water", genPlayerEnvironmentWater);
  builder.add(
    "/players/possible_terrain_actions",
    loader.provide(genPlayerPossibleTerrainActions)
  );
  builder.add(
    "/player/melee_attack_region_template",
    genStaticMeleeAttackRegionTemplate
  );
  builder.add("/player/melee_attack_region", genStaticMeleeAttackRegion);
  builder.addGlobal("/player/applicable_buffs", { buffs: [] });
  builder.add("/player/modifiers", loader.provide(genPlayerModifiers));
  builder.addGlobal("/player/effective_acl", {
    acls: [],
  });
  builder.addGlobal("/player/effective_robot", {
    value: undefined,
  });
  builder.addGlobal("/player/knockback", {});
  builder.add(
    "/player/control_modifiers",
    loader.provide(genPlayerControlModifiers)
  );
}
