import type { ClientContext } from "@/client/game/context";
import type { AudioManager } from "@/client/game/context_managers/audio_manager";
import { BasePassMaterial } from "@/client/game/renderers/base_pass_material";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import type { SpatialLighting } from "@/client/game/renderers/util";
import {
  cloneMaterials,
  computeSpatialLighting,
  defaultSpatialLighting,
} from "@/client/game/renderers/util";
import {
  makeBezierAngleLatencyTransition,
  makeBezierVec3LatencyTransition,
} from "@/client/game/resources/latency_transitions";
import type { ParticleSystemMaterials } from "@/client/game/resources/particles";
import { ParticleSystem } from "@/client/game/resources/particles";
import {
  makePlayerLikeAppearanceMesh,
  replaceWithPlayerMaterial,
  setFrustumCulling,
} from "@/client/game/resources/player_mesh";
import type { SkyParams } from "@/client/game/resources/sky";
import type {
  ClientResourceDeps,
  ClientResources,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type {
  AnimationAction,
  AnimationDefinition,
} from "@/client/game/util/animation_system";
import { AnimationSystem } from "@/client/game/util/animation_system";
import type { MixedMesh } from "@/client/game/util/animations";
import { getVelocityBasedWeights } from "@/client/game/util/animations";
import type { Spline } from "@/client/game/util/bezier";
import {
  bezierFunctionsScalar,
  bezierMultipleDerivatives,
} from "@/client/game/util/bezier";
import {
  gltfDispose,
  gltfToThree,
  loadGltf,
} from "@/client/game/util/gltf_helpers";
import {
  npcOnDeathParticleMaterials,
  npcOnHitParticleMaterials,
} from "@/client/game/util/particles_systems";
import { TimelineMatcher } from "@/client/game/util/timeline_matcher";
import type { Transition } from "@/client/game/util/transitions";
import { fixedConstantVec3Transition } from "@/client/game/util/transitions";
import { audioAssets } from "@/galois/assets/audio";
import type { AssetPath } from "@/galois/interface/asset_paths";
import { resolveAssetUrlUntyped } from "@/galois/interface/asset_paths";
import { updatePlayerSkinnedMaterial } from "@/gen/client/game/shaders/player_skinned";
import type { Tweaks } from "@/server/shared/minigames/ruleset/tweaks";
import type { Disposable } from "@/shared/disposable";
import { makeDisposable } from "@/shared/disposable";
import type {
  ReadonlyEntity,
  ReadonlyEntityWith,
} from "@/shared/ecs/gen/entities";
import { Entity } from "@/shared/ecs/gen/entities";
import type { ReadonlyOptionalDamageSource } from "@/shared/ecs/gen/types";
import { getAabbForEntity } from "@/shared/game/entity_sizes";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import {
  centerAABB,
  pitchAndYaw,
  scale,
  sub,
  volumeAABB,
} from "@/shared/math/linear";
import type {
  AABB,
  ReadonlyVec2,
  ReadonlyVec3,
  Vec2,
  Vec3,
} from "@/shared/math/types";
import type { NpcType } from "@/shared/npc/bikkie";
import {
  getMovementTypeByNpcType,
  getRunSpeedByNpcType,
  idToNpcEffectProfile,
  idToNpcType,
  isNpcTypeId,
} from "@/shared/npc/bikkie";
import type { RegistryLoader } from "@/shared/registry";
import { ok } from "assert";
import _, { sample } from "lodash";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils";

export interface ActiveBecomeNpcState {
  kind: "active";
  entityId: BiomesId;
  position: Vec3;
  velocity: Vec3;
  orientation: Vec2;
  cannotPlaceReason?: string;
  onCommit?: () => void;
  onRevert?: () => void;
}
export type BecomeNPCState =
  | {
      kind: "empty";
    }
  | ActiveBecomeNpcState;

const walkAnimation: AnimationDefinition = {
  fileAnimationName: "Walk",
  backupFileAnimationNames: ["Walking"],
};

const runAnimation: AnimationDefinition = {
  fileAnimationName: "Run",
  backupFileAnimationNames: ["Running", "Walk", "Walking"],
};

const idleAnimation: AnimationDefinition = {
  fileAnimationName: "Idle",
};

const swimAnimation: AnimationDefinition = {
  fileAnimationName: "Swim",
};

const flyAnimation: AnimationDefinition = {
  fileAnimationName: "Fly",
};

export const npcSystem = new AnimationSystem(
  {
    attack: { fileAnimationName: "Attack" },

    walk: walkAnimation,
    run: runAnimation,
    runBackwards: walkAnimation,
    idle: idleAnimation,

    crouchIdle: idleAnimation,
    crouchWalking: walkAnimation,

    swimIdle: idleAnimation,
    swimForwards: swimAnimation,
    swimBackwards: swimAnimation,

    flyIdle: idleAnimation,
    flyForwards: flyAnimation,

    strafeRightSlow: walkAnimation,
    strafeRightFast: runAnimation,
    strafeLeftSlow: walkAnimation,
    strafeLeftFast: runAnimation,
  },
  {
    all: {
      re: /(.*)/i,
    },
  }
);

const onHitScaleCurve = bezierMultipleDerivatives(bezierFunctionsScalar, [
  { point: 1, derivative: 0, t: 0 },
  { point: 0.7, derivative: 0, t: 0.5 },
  { point: 1, derivative: 0, t: 1 },
]);
const ON_HIT_ANIMATION_DURATION_SECS = 0.2;
const onDeathScaleCurve = bezierMultipleDerivatives(bezierFunctionsScalar, [
  { point: 1, derivative: 0, t: 0 },
  { point: 0.7, derivative: 0, t: 0.5 },
  { point: 0, derivative: 0, t: 1 },
]);
const ON_DEATH_ANIMATION_DURATION_SECS = 0.2;

export type NpcAnimationAction = AnimationAction<typeof npcSystem>;

function getAttackAnimationAction(
  attackTime: number | undefined,
  timelineMatcher: TimelineMatcher,
  secondsSinceEpoch: number
): NpcAnimationAction | undefined {
  if (attackTime) {
    return {
      weights: npcSystem.singleAnimationWeight("attack", 1),
      state: {
        repeat: { kind: "once" },
        startTime: timelineMatcher.match(
          "attack",
          attackTime,
          secondsSinceEpoch
        ),
      },
      layers: {
        all: "apply",
      },
    };
  }
}

function damageSourceCausesParticles(
  damageSource: ReadonlyOptionalDamageSource
) {
  return damageSource?.kind === "attack";
}
export interface ConsecutiveFrameState {
  lastRenderFrame: number;
  position: Transition<ReadonlyVec3>;
  orientation: Transition<number>;
  spatialLighting: Transition<ReadonlyVec3>;
}

type NpcChannels = "itemOnHit" | "npcVoice";

const RENDER_NPC_COMPONENTS = [
  "rigid_body",
  "npc_metadata",
  "position",
  "size",
  "orientation",
  "health",
] as const;

export type RenderNpcEntity = ReadonlyEntityWith<
  (typeof RENDER_NPC_COMPONENTS)[number]
>;

export function isRenderNpcEntity(
  entity: ReadonlyEntity
): entity is RenderNpcEntity {
  return Entity.has(entity, ...RENDER_NPC_COMPONENTS);
}

export class NpcRenderState {
  private consecutiveFrameState: ConsecutiveFrameState | undefined;
  private interpolationNeedRetarget = true;
  private position: Vec3 | undefined;
  private orientation: Vec2 | undefined;
  private entity: RenderNpcEntity | undefined;
  private onHitParticleEffect: ParticleSystem | undefined;
  private soundChannels: {
    [K in NpcChannels]?: THREE.PositionalAudio;
  } = {};
  private wasIdle = true;

  constructor(
    public mixedMesh: MixedNpcMesh,
    private readonly commonResources: NpcCommonEffects,
    private readonly effectResources: NpcEffects,
    private audioManager: AudioManager
  ) {}

  smoothedPosition(): ReadonlyVec3 {
    return this.consecutiveFrameState
      ? this.consecutiveFrameState.position.get()
      : this.entity
      ? this.entity.position.v
      : [0, 0, 0]; // This shouldn't actually be possible.
  }

  private tickConsecutiveFrameState(
    dt: number,
    entity: RenderNpcEntity,
    frameNumber: number,
    tweaks: Tweaks,
    resources: ClientResources,
    position: ReadonlyVec3,
    orientation: ReadonlyVec2
  ) {
    const targetSpatialLighting = resources.get(
      "/scene/npc/spatial_lighting",
      entity.id
    );
    if (
      this.consecutiveFrameState === undefined ||
      frameNumber > this.consecutiveFrameState.lastRenderFrame + 1
    ) {
      // The NPC wasn't rendered in the previous frame, so reset our
      // interpolation state because we don't know how far the NPC has moved
      // since it was last rendered and we don't want giant lerps.
      this.consecutiveFrameState = {
        lastRenderFrame: frameNumber,
        position: makeBezierVec3LatencyTransition(position, tweaks),
        orientation: makeBezierAngleLatencyTransition(orientation[1], tweaks),
        spatialLighting: fixedConstantVec3Transition(
          [...targetSpatialLighting, 0.0],
          0.1
        ),
      };
    } else {
      this.consecutiveFrameState.lastRenderFrame = frameNumber;
      if (this.interpolationNeedRetarget) {
        this.consecutiveFrameState.position.target(position);
        this.consecutiveFrameState.orientation.target(orientation[1]);
      }
      // Spatial Lighting may change without a position change, so update
      // every frame
      this.consecutiveFrameState.spatialLighting.target([
        ...targetSpatialLighting,
        0.0,
      ]);

      this.consecutiveFrameState.position.tick(dt);
      this.consecutiveFrameState.orientation.tick(dt);
      this.consecutiveFrameState.spatialLighting.tick(dt);
    }

    this.interpolationNeedRetarget = false;

    return this.consecutiveFrameState;
  }

  tick(
    entity: RenderNpcEntity,
    dt: number,
    frameNumber: number,
    secondsSinceEpoch: number,
    skyParams: SkyParams,
    tweaks: Tweaks,
    resources: ClientResources
  ) {
    // Turn the NPC to face the player when the player is talking to the NPC.
    // Must do this on the client and not modify the entity on the server so
    // that only this player sees the NPC turn and nobody else.
    const becomeNPC = resources.get("/scene/npc/become_npc");
    const motionOverrides =
      becomeNPC.kind === "active" && becomeNPC.entityId === entity.id
        ? becomeNPC
        : undefined;
    const localPlayer = resources.get("/scene/local_player");
    const npcPosition = entity.position?.v;
    const npcTypeId = entity.npc_metadata.type_id;
    ok(npcTypeId);
    const npcType = idToNpcType(npcTypeId);

    const position = motionOverrides?.position ?? entity.position.v;
    const orientation =
      motionOverrides?.orientation ??
      (localPlayer.talkingToNpc === entity.id && npcPosition)
        ? (() => {
            const towardsLocalPlayer = pitchAndYaw(
              sub(localPlayer.player.position, npcPosition)
            );
            // Clone because we don't want this modification to be on the NPC permanently.
            return towardsLocalPlayer;
          })()
        : entity.orientation.v;

    if (
      !_.isEqual(this.position, position) ||
      !_.isEqual(this.orientation, orientation)
    ) {
      this.position = [...position];
      this.orientation = [...orientation];
      this.interpolationNeedRetarget = true;
    }

    this.entity = entity;

    const velocity =
      motionOverrides?.velocity ?? this.entity.rigid_body.velocity;

    // Called each frame before the NPC is rendered. Only called for visible
    // NPCs.
    const consecutiveFrameState = this.tickConsecutiveFrameState(
      dt,
      this.entity,
      frameNumber,
      tweaks,
      resources,
      position,
      orientation
    );

    // Handle position updates.
    const pos =
      motionOverrides?.position ?? consecutiveFrameState.position.get();
    this.mixedMesh.three.position.fromArray(pos);

    this.mixedMesh.three.scale.set(
      this.entity.size.v[0] / npcType.boxSize[0],
      this.entity.size.v[1] / npcType.boxSize[1],
      this.entity.size.v[2] / npcType.boxSize[2]
    );

    this.mixedMesh.three.rotation.y =
      motionOverrides?.orientation[1] ??
      consecutiveFrameState.orientation.get();

    // Lighting
    const spatialLighting = consecutiveFrameState.spatialLighting
      .get()
      .slice(0, 2) as Vec2;

    // If the NPC was hit recently, we want them to flash red.
    const timeSinceLastHit =
      this.mixedMesh.timelineMatcher.animationNow() -
      this.lastDamageAnimationTime(secondsSinceEpoch);
    const RED_FLASH_SECONDS = 0.2;
    let redFlashProgress = Math.min(
      1,
      Math.max(0, timeSinceLastHit / RED_FLASH_SECONDS)
    );

    if (
      becomeNPC.kind === "active" &&
      becomeNPC.entityId === entity.id &&
      Boolean(becomeNPC.cannotPlaceReason)
    ) {
      redFlashProgress = 0;
    }

    // Shader material update.
    this.mixedMesh.three.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof BasePassMaterial
      ) {
        updatePlayerSkinnedMaterial(child.material, {
          light: skyParams.sunDirection.toArray(),
          spatialLighting,
          baseColor: [1, redFlashProgress, redFlashProgress],
          emissiveAdd: 0.1 * Math.max(0, 1 - 2 * redFlashProgress),
        });
      }
    });

    const animAccum = npcSystem.newAccumulatedActions(
      this.mixedMesh.animationMixer.time,
      npcSystem.durationFromState(this.mixedMesh.animationSystemState)
    );

    const emote = resources.get("/ecs/c/emote", this.entity.id);

    const attackTime =
      emote?.emote_type === "attack1" ? emote?.emote_start_time : undefined;

    this.mixedMesh.animationSystem.accumulateAction(
      getAttackAnimationAction(
        attackTime,
        this.mixedMesh.timelineMatcher,
        secondsSinceEpoch
      ),
      animAccum
    );
    this.mixedMesh.animationSystem.accumulateAction(
      getVelocityBasedWeights({
        velocity: velocity,
        orientation: orientation,
        runSpeed: getRunSpeedByNpcType(npcType),
        movementType: getMovementTypeByNpcType(npcType),
        characterSystem: npcSystem,
      }),
      animAccum
    );
    this.mixedMesh.animationSystem.applyAccumulatedActionsToState(
      animAccum,
      this.mixedMesh.animationSystemState,
      dt
    );

    const aabb = getAabbForEntity(this.entity, {
      motionOverrides,
    });
    ok(aabb);
    const centerPosition = centerAABB(aabb);
    this.tickEffects(
      attackTime,
      secondsSinceEpoch,
      aabb,
      centerPosition,
      skyParams.sunDirection.toArray()
    );

    // Update threejs animations.
    this.mixedMesh.animationMixer.update(dt);

    this.mixedMesh.three.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh) {
        child.matrixWorldNeedsUpdate = true;
      }
    });
  }

  private tickEffects(
    attackTime: number | undefined,
    secondsSinceEpoch: number,
    aabb: AABB,
    centerPosition: Vec3,
    sunDirection: Vec3
  ) {
    this.tickOnHitEffects(
      secondsSinceEpoch,
      aabb,
      centerPosition,
      sunDirection
    );
    this.tickOnAttackEffects(attackTime, secondsSinceEpoch, centerPosition);

    const isIdle =
      this.mixedMesh.animationSystemState.layerWeights.all.idle >
      (this.wasIdle ? 0.5 : 0.9);
    if (isIdle && !this.wasIdle && this.effectResources.idleNpcSoundEffect) {
      // Play the idle sound if the NPC has become idle.
      this.playSound(
        "npcVoice",
        sample(this.effectResources.idleNpcSoundEffect)!,
        centerPosition
      );
    }
    this.wasIdle = isIdle;

    for (const k in this.soundChannels) {
      const key = k as NpcChannels;
      const value = this.soundChannels[key];
      if (value) {
        if (!value.isPlaying) {
          this.soundChannels[key] = undefined;
        }
      }
    }
  }

  private tickOnAttackEffects(
    attackTime: number | undefined,
    secondsSinceEpoch: number,
    centerPosition: Vec3
  ) {
    if (
      !attackTime ||
      this.mixedMesh.timelineMatcher.match(
        "onAttackEffect",
        attackTime,
        secondsSinceEpoch
      ) !== this.mixedMesh.timelineMatcher.animationNow()
    ) {
      return;
    }

    const bufferChoices = this.effectResources?.onAttackNpcSoundEffect;
    if (bufferChoices !== undefined) {
      this.playSound("npcVoice", sample(bufferChoices)!, centerPosition);
    }
  }

  private lastDamageAnimationTime(secondsSinceEpoch: number) {
    if (!this.entity?.health.lastDamageTime) {
      return -Infinity;
    }

    return this.mixedMesh.timelineMatcher.match(
      "onHit",
      this.entity.health.lastDamageTime,
      secondsSinceEpoch
    );
  }

  private tickOnHitEffects(
    secondsSinceEpoch: number,
    aabb: AABB,
    centerPosition: Vec3,
    sunDirection: Vec3
  ) {
    ok(this.entity);

    if (!this.entity.health.lastDamageTime) {
      return;
    }

    const lastDamageRenderTime =
      this.lastDamageAnimationTime(secondsSinceEpoch);
    const durationSinceLastHit =
      this.mixedMesh.timelineMatcher.animationNow() - lastDamageRenderTime;
    // Have the Npc's scale "bounce" when it's hit.
    const meshScale = (() => {
      const getScaleFromHitCurve = (
        curve: Spline<number>,
        duration: number,
        finishedScale: number
      ) => {
        const t = durationSinceLastHit / duration;
        if (t < 1) {
          return curve.value(t);
        } else {
          return finishedScale;
        }
      };

      if (this.entity.health.hp > 0) {
        return getScaleFromHitCurve(
          onHitScaleCurve,
          ON_HIT_ANIMATION_DURATION_SECS,
          1
        );
      } else {
        return getScaleFromHitCurve(
          onDeathScaleCurve,
          ON_DEATH_ANIMATION_DURATION_SECS,
          0
        );
      }
    })();
    this.mixedMesh.three.scale.set(meshScale, meshScale, meshScale);

    if (durationSinceLastHit === 0) {
      if (
        !this.onHitParticleEffect &&
        damageSourceCausesParticles(this.entity.health.lastDamageSource)
      ) {
        // Different effects depending on if this is the killing blow or not.
        const particleMaterials =
          this.entity.health.hp <= 0
            ? this.commonResources.onDeathEffectParticleMaterials
            : this.commonResources.onHitEffectParticleMaterials;

        this.onHitParticleEffect = new ParticleSystem(
          particleMaterials,
          this.mixedMesh.animationMixer.time
        );

        this.onHitParticleEffect.three.position.fromArray(centerPosition);
        const volume = volumeAABB(aabb);
        this.onHitParticleEffect.three.scale.fromArray(
          scale(Math.cbrt(volume), [1, 1, 1])
        );
      }

      this.playSound(
        "itemOnHit",
        sample(this.commonResources.onHitItemSoundEffect)!,
        centerPosition
      );

      const bufferChoices =
        this.entity.health.hp <= 0 &&
        this.effectResources?.onDeathNpcSoundEffect
          ? this.effectResources.onDeathNpcSoundEffect
          : this.effectResources?.onHitNpcSoundEffect;
      if (bufferChoices !== undefined) {
        this.playSound("npcVoice", sample(bufferChoices)!, centerPosition);
      }
    }

    if (this.onHitParticleEffect) {
      this.onHitParticleEffect.tickToTime(
        this.mixedMesh.animationMixer.time,
        sunDirection
      );

      if (this.onHitParticleEffect.allAnimationsComplete()) {
        this.onHitParticleEffect.materials.dispose();
        this.onHitParticleEffect = undefined;
      }
    }
  }

  addToScene(scenes: Scenes, now: number) {
    addToScenes(scenes, this.mixedMesh.three);
    if (this.onHitParticleEffect) {
      addToScenes(scenes, this.onHitParticleEffect.three);
    }
    for (const k in this.soundChannels) {
      const value = this.soundChannels[k as NpcChannels];
      if (value) {
        addToScenes(scenes, value);
        this.audioManager.setActive(value, now);
      }
    }
  }

  playSound(
    channel: keyof typeof this.soundChannels,
    assetPath: AssetPath,
    position: Vec3
  ) {
    const audioListener = this.audioManager.getAudioListener();
    if (!audioListener) {
      return;
    }
    const buffer = this.audioManager.getBuffer(assetPath);
    if (!buffer) {
      return;
    }

    let sound = this.soundChannels[channel];
    if (sound) {
      sound.stop();
    } else {
      sound = new THREE.PositionalAudio(audioListener);
    }

    sound.setBuffer(buffer);
    sound.position.fromArray(position);
    sound.setDistanceModel("exponential");
    sound.setRolloffFactor(1.5);
    sound.setRefDistance(5);
    sound.setLoop(false);
    sound.setVolume(this.audioManager.getVolume("settings.volume.effects"));
    sound.play();

    this.soundChannels[channel] = sound;
  }

  dispose() {
    this.mixedMesh.dispose();
    this.onHitParticleEffect?.materials.dispose();
  }
}

interface MixedNpcMeshImpl extends MixedMesh<typeof npcSystem> {}
export type MixedNpcMesh = Disposable<MixedNpcMeshImpl>;

export function makeMixedNpcMesh(gltf: GLTF, npcType: NpcType): MixedNpcMesh {
  const three = SkeletonUtils.clone(gltfToThree(gltf));
  const [materials, _oldMaterials] = cloneMaterials(three);

  const state = npcSystem.newState(three, gltf.animations, {
    attack: npcType.behavior.chaseAttack?.attackAnimationMultiplier ?? 1,
  });

  return makeDisposable(
    {
      three,
      animationMixer: state.mixer,
      animationSystem: npcSystem,
      animationSystemState: state,
      timelineMatcher: new TimelineMatcher(() => state.mixer.time),
    },
    () => {
      materials.forEach((mat) => mat.dispose());
    }
  );
}

async function makeNpcRenderState(
  { audioManager }: ClientContext,
  deps: ClientResourceDeps,
  id: BiomesId
): Promise<NpcRenderState | undefined> {
  const npcMetadata = deps.get("/ecs/c/npc_metadata", id);
  ok(npcMetadata);
  if (!isNpcTypeId(npcMetadata.type_id)) {
    log.throttledError(
      10_000,
      `Entity ${id} has npc_metadata but invalid type_id (${npcMetadata.type_id})`
    );
    return;
  }

  const gltf = await deps.get("/scene/npc/mesh", id);
  const npcType = idToNpcType(npcMetadata.type_id);
  const mixedMesh = makeMixedNpcMesh(gltf, npcType);
  const commonResources = await deps.get("/scene/npc_common_effects");

  const effectResources = npcType.effectsProfile
    ? await deps.get("/scene/npc_effects", npcType.effectsProfile)
    : {};

  return new NpcRenderState(
    mixedMesh,
    commonResources,
    effectResources,
    audioManager
  );
}

function makeNpcSpatialLighting(
  deps: ClientResourceDeps,
  id: BiomesId
): SpatialLighting {
  const pos = deps.get("/ecs/c/position", id);
  if (!pos) {
    return defaultSpatialLighting();
  }
  return computeSpatialLighting(deps, pos.v[0], pos.v[1] + 0.75, pos.v[2]);
}

export async function makeNpcTypeMesh(type: BiomesId) {
  const npcType = idToNpcType(type);

  ok(!npcType.isPlayerLikeAppearance);
  ok(npcType.galoisPath, `Could not find galoisPath for ${type}`);

  const url = resolveAssetUrlUntyped(npcType.galoisPath);
  if (!url) {
    throw new Error(
      `Failed to lookup URL for galoisPath ${npcType.galoisPath}, type ${type}.`
    );
  }
  const gltf = await loadGltf(url);

  replaceWithPlayerMaterial(gltf);
  // We will do frustum culling for NPCs manually, so no-need for three.js
  // to re-do this work.
  setFrustumCulling(gltf, false);

  return makeDisposable(gltf, () => {
    gltfDispose(gltf);
  });
}

async function makeNpcMesh(deps: ClientResourceDeps, id: BiomesId) {
  const npcMetadata = deps.get("/ecs/c/npc_metadata", id);
  ok(npcMetadata);
  const npcType = idToNpcType(npcMetadata.type_id);
  if (npcType.isPlayerLikeAppearance) {
    const mesh = await makePlayerLikeAppearanceMesh(deps, id);
    setFrustumCulling(mesh, false);
    return mesh;
  }

  return deps.get("/scene/npc_type_mesh", npcMetadata.type_id);
}

// Resources shared by all NPC types.
export interface NpcCommonEffects {
  onDeathEffectParticleMaterials: ParticleSystemMaterials;
  onHitEffectParticleMaterials: ParticleSystemMaterials;
  onHitItemSoundEffect: AssetPath[];
}

async function makeNpcCommonEffects(
  _deps: ClientResourceDeps
): Promise<NpcCommonEffects> {
  return {
    onDeathEffectParticleMaterials: await npcOnDeathParticleMaterials(),
    onHitEffectParticleMaterials: await npcOnHitParticleMaterials(),
    onHitItemSoundEffect: audioAssets.block_break as AssetPath[],
  };
}

export interface NpcEffects {
  onHitNpcSoundEffect?: AssetPath[];
  onAttackNpcSoundEffect?: AssetPath[];
  onDeathNpcSoundEffect?: AssetPath[];
  idleNpcSoundEffect?: AssetPath[];
}

async function makeNpcEffects(
  _deps: ClientResourceDeps,
  effectProfileId: BiomesId
): Promise<NpcEffects> {
  const effectProfile = idToNpcEffectProfile(effectProfileId);
  return {
    onHitNpcSoundEffect: effectProfile.onHitSound as AssetPath[],
    onAttackNpcSoundEffect: effectProfile.onAttackSound as AssetPath[],
    onDeathNpcSoundEffect: effectProfile.onDeathSound as AssetPath[],
    idleNpcSoundEffect: effectProfile.idleSound as AssetPath[],
  };
}

export function addNpcResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/scene/npc/become_npc", {
    kind: "empty",
  });
  builder.add("/scene/npc_type_mesh", (_deps, id) => makeNpcTypeMesh(id));
  builder.add("/scene/npc/mesh", makeNpcMesh);
  builder.add("/scene/npc/render_state", loader.provide(makeNpcRenderState));
  builder.add("/scene/npc/spatial_lighting", makeNpcSpatialLighting);
  builder.add("/scene/npc_common_effects", makeNpcCommonEffects);
  builder.add("/scene/npc_effects", makeNpcEffects);
}
