import type { RenderPassName } from "@/client/game/renderers/passes/composer";
import type { SyncShape } from "@/shared/api/sync";
import { DEFAULT_ENVIRONMENT_PARAMS } from "@/shared/physics/environments";
import { deepMerge } from "@/shared/util/collections";
import { AssertJSONable } from "@/shared/util/type_helpers";
import { cloneDeep } from "lodash";

export type Tweaks = typeof defaultTweakableConfigValues;

export function inheritTweaks(base: Tweaks, child: Tweaks): Tweaks {
  return deepMerge(cloneDeep(base), child);
}

export interface TrackingCamTweaks {
  kind?: "tracking" | "tracking_selfie";
  offsetBack: number;
  offsetRight: number;
  offsetUp: number;
  fov: number;
  runFovIncrease?: number;
  runOffsetBackIncrease?: number;
  reverse?: boolean;
  startMarchDistance?: number;
}

export interface PlayerFixedCameraTweaks {
  kind: "fixed";
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  fov: number;
  reverse: false;
}

export type CamTweaks = TrackingCamTweaks | PlayerFixedCameraTweaks;

export interface OnDamageCameraShake {
  minDamageFractionForShake: number;
  minDampedMagnitude: number;
  maxDampedMagnitude: number;
  repeats: number;
  duration: number;
}

export type CharacterAnimationTiming = {
  attack1: number;
  attack2: number;
  destroy: number;
  place: number;
  walk: number;
  run: number;
  runBackwards: number;
  idle: number;
  strafeLeftSlow: number;
  strafeLeftFast: number;
  strafeRightSlow: number;
  strafeRightFast: number;
  wave: number;
  dance: number;
  laugh: number;
  point: number;
  rock: number;
  sit: number;
  camera: number;
  jump: number;
  fall: number;
  crouchWalking: number;
  crouchIdle: number;
  swimForwards: number;
  swimBackwards: number;
  swimIdle: number;
  equip: number;
  unequip: number;
};

export type Rendering = {
  remotePlayerRenderLimit: number;
  npcRenderLimit: number;
  placeableRenderLimit: number;
  disabledRenderers: { [K in string]?: boolean };
  disabledPasses: { [K in RenderPassName]?: boolean };
  disabledDynamicPerformanceUpdates: { [K in string]?: boolean };
};

export interface Simulation {
  frameRate: number;
  maxCatchupTicks: number;
  smoothLocalPlayer: boolean;
}

export const baseIsometric: PlayerFixedCameraTweaks = {
  kind: "fixed",
  offsetX: 50,
  offsetZ: 50,
  offsetY: 50,
  fov: 10,
  reverse: false,
};

export const fishingChargingCastParams = {
  // Casting
  powerScaling: 20,
  powerIntercept: 5,
  extraUpVector: 2.0,

  // Charging
  fullPowerDuration: 2.0,
} as const;

export const fishingBiteParams = {
  biteMinTime: -0.5,
  biteMaxTime: 1.5,
  biteMinDuration: -2.5,
  biteMaxDuration: 2.5,
};
export type FishingBiteParams = typeof fishingBiteParams;

export type FishingChargingCastParams = typeof fishingChargingCastParams;

export const fishingCatchMinigameParams = {
  fishStartLocation: 0.1,
  fishRandomWalkVelocityPerSecondIntercept: 1.0,
  fishRandomWalkVelocityPerSecondFishLengthScaling: 0.1,

  catchBarAccelerationClicked: 2.0,
  catchBarAccelerationUnclicked: -2.0,
  catchBarBottomSpringCoefficient: 0.6,

  fillBarStart: 0.2,
  fillBarSizeIntercept: 1.0,
  fillBarSizeFishLengthScaling: 0.05,
  fillBarIncreasePerSecond: 0.15,
  fillBarDecreasePerSecond: -0.1,
} as const;

export type FishingCatchMinigameParams = typeof fishingCatchMinigameParams;

export const defaultTweakableConfigValues = {
  characterAnimationTiming: {
    applause: 1,
    attack: 2,
    attack1: 1.5,
    attack2: 1.5,
    camera: 1,
    crouchIdle: 1,
    crouchWalking: 1.3,
    dance: 1,
    destroy: 2.5,
    equip: 1,
    fall: 1,
    flex: 1,
    idle: 1,
    jump: 1.5,
    laugh: 1,
    place: 2.5,
    point: 1,
    rock: 1,
    run: 0.9,
    runBackwards: 1,
    sit: 1,
    strafeLeftFast: 1,
    strafeLeftSlow: 1,
    strafeRightFast: 1,
    strafeRightSlow: 1,
    swimBackwards: 1,
    swimForwards: 1,
    swimIdle: 1,
    unequip: 1,
    walk: 1.2,
    wave: 1,
  } as CharacterAnimationTiming,
  physics: {
    ...DEFAULT_ENVIRONMENT_PARAMS,
    airResistance: 0.002,
    autojumpRatio: 2,
    escapeDampening: 0.1,
    friction: 0.2,
    friction_force: 0.21,
    gravity: 0.53,
    gravity_force: -0.4,
    inAirFriction: 0.2,
    jump: 0.18,
    jump_force: 7.67,
    moveForward: 1,
    moveForwardDiagonal: 1,
    moveLateral: 1,
    moveReverse: 0.9,
    moveReverseDiagonal: 0.9,
    playerScale: 2.6,
    run_force: 1.2,
    viewSpeed: 0.06,
    walk_force: 1.18,
  },
  playerPhysics: {
    autoJumpRatio: 2,
    autojump: 0.15,
    climbingRise: 0.5,
    crouch: 0.5,
    flyingDescend: -1.5,
    flyingJump: 2.0,
    forward: 55,
    groundJump: 10.8,
    inAirMultiplier: 1,
    jump: 0.18,
    jumpWindowMs: 200,
    lateralMultiplier: 0.95,
    reverse: 54,
    runMultiplier: 2,
    scale: 1.0,
    swimmingDescend: -0.3,
    swimmingPitchOffset: 0.1,
    swimmingRise: 1,
    swimmingSpeed: 0.9,
    viewSpeed: 0.001,
    waterEscape: 10.0,
    waterRise: 0.8,
  },

  protectionField: {
    shader: "hexagonal_bloom",
    ring: false,
    fadeOutOpacityOnly: true,
    hideWhenCameraHeld: true,
    hideBehindCharacter: true,
    texture: "textures/protection_grid_experiment4",
    textureScale: 0.2,
    opacity: 0.23,
    fadeOut: true,
    highlight: "pixel",
    hexThickness: 0.01,
    hexGridScale: 0.7,
    hexQuantization: 0,
    hexSmoothing: 1.01,
    hexIntensity: 0.008,
    heightScaling: 2,
    hexShimmerBrightness: 1,
    hexShimmerSpeed: 0.35,
    hexShimmerFatness: 0.41,
    hexShimmerFrequency: 2.33,
  },
  night: {
    purkinje: true,
    purkinjeStrength: 0.1,
    eyeAdaptation: true,
  },

  pixelatedWater: false,
  water: {
    normalQuantization: 10,
    normalIntensity: 0.25,
    normalOctave1: 0.85,
    normalOctave2: 0.85,
    normalSpeed: 0.1,
    normalDistortion: 1.25,
  },
  trackingCamSmoothMomentum: 0,
  trackingCamOverlapRequired: 0,
  trackingCamNPCEntityCollisions: false,

  firstPersonCam: {
    offsetBack: 0,
    offsetRight: 0,
    offsetUp: 0.2,
    snapIn: 0.5,
    fov: 60,
    firstPersonThreshold: 100000,
    kind: "tracking",
    runFovIncrease: 0,
    runOffsetBackIncrease: 0,
  } as TrackingCamTweaks,
  thirdPersonCam: {
    offsetBack: 4.25,
    offsetRight: 0.37,
    offsetUp: 0.2,
    snapIn: 0.5,
    fov: 60,
    firstPersonThreshold: 1,
    startMarchDistance: 1.35,
    kind: "tracking",
    runFovIncrease: 0,
    runOffsetBackIncrease: 0,
  } as TrackingCamTweaks,
  reverseThirdPersonCam: {
    offsetBack: -4,
    offsetRight: 0,
    offsetUp: 0,
    snapIn: 0.5,
    fov: 56,
    reverse: true,
    kind: "tracking",
  } as TrackingCamTweaks,
  inGameCamera: {
    normal: {
      offsetBack: 3.6,
      offsetRight: 0.37,
      offsetUp: 0.2,
      snapIn: 0.5,
      fov: 60,
      kind: "tracking",
    } as TrackingCamTweaks,
    fps: {
      offsetBack: 0,
      offsetRight: 0,
      offsetUp: 0,
      snapIn: 0.5,
      fov: 60,
      firstPersonThreshold: 10,
      kind: "tracking",
    } as TrackingCamTweaks,
    selfie: {
      offsetBack: -4,
      offsetRight: 0,
      offsetUp: -0.5,
      snapIn: 0.5,
      fov: 56,
      reverse: true,
      kind: "tracking_selfie",
    } as TrackingCamTweaks,
    iso_ne: {
      kind: "fixed",
      offsetX: 50,
      offsetZ: -50,
      offsetY: 50,
      fov: 10,
      reverse: false,
    },
    iso_nw: {
      kind: "fixed",
      offsetX: -50,
      offsetZ: -50,
      offsetY: 50,
      fov: 10,
      reverse: false,
    },
    iso_sw: {
      kind: "fixed",
      offsetX: -50,
      offsetZ: 50,
      offsetY: 50,
      fov: 10,
      reverse: false,
    },
    iso_se: {
      kind: "fixed",
      offsetX: 50,
      offsetZ: 50,
      offsetY: 50,
      fov: 10,
      reverse: false,
    },
  },
  onDamageCameraShake: <OnDamageCameraShake>{
    minDamageFractionForShake: 0.02,
    minDampedMagnitude: 0.05,
    maxDampedMagnitude: 0.1,
    repeats: 2,
    duration: 150,
  },
  groupPlacementCam: {
    offsetBack: 14,
    offsetRight: 0,
    offsetUp: 0,
    snapIn: 0.5,
    fov: 70,
    firstPersonThreshold: 1.35,
    startMarchDistance: 2,
  } as CamTweaks,
  fishingCam: {
    offsetBack: 6,
    offsetRight: 0,
    offsetUp: 1,
    fov: 75,
    startMarchDistance: 2,
  } as CamTweaks,
  fishingCamCaught: {
    offsetBack: 3,
    offsetRight: 0.2,
    offsetUp: 0,
    fov: 60,
    startMarchDistance: 2,
  } as CamTweaks,
  npcCam: {
    offsetBack: 3,
    offsetRight: 0.2,
    offsetUp: 0,
    fov: 60,
    startMarchDistance: 2,
  } as CamTweaks,
  robotPlacementPreviewCam: {
    offsetBack: 25,
    offsetRight: 0,
    offsetUp: 0,
    fov: 100,
    startMarchDistance: 2,
  } as CamTweaks,
  building: {
    blockPlacementRadius: 7.98,
    allowSelfIntersecting: false,
    changeRadius: 8.78,
    placementRadius: 5,
    eagerBlocks: true,
    terrainMeshShortCircuiting: true,
  },
  combat: {
    meleeAttackRegion: {
      left: -1,
      right: 1,
      near: 0.2,
      far: 3.5,
      top: 2,
      bottom: -2,
    },
  },
  networking: {
    playerSmoothing: {
      // Keeps track of the transition duration that `positionTransition` is
      // currently using. This usually doesn't change, but it can be modified
      // through the tweak menu. The higher the number, the smoother (and laggier)
      // remote player movement will appear.
      interpDuration: 0.8,
    },
  },
  clientRendering: {
    // Maximum number of remote players that a client should render.
    remotePlayerRenderLimit: 30,
    npcRenderLimit: 30,
    placeableRenderLimit: 30,
    disabledRenderers: {},
    disabledPasses: {},
    disabledDynamicPerformanceUpdates: {},
    smoothLocalPlayer: true,
  } as Rendering,
  sim: {
    frameRate: 30,
    maxCatchupTicks: 2,
    // Whether or not to smooth the local player's position between simulation
    // frames, in the renderer.
    smoothLocalPlayer: true,
  } as Simulation,
  chatVoices: true,
  chatTranslation: true,
  additionalLanguage: "pt-BR",
  flyModeScaling: 10.0,
  showPlayerAABB: false,
  showPlayerMeleeAttackRegion: false,
  showEditedVoxels: false,
  showPlacerVoxels: false,
  performOverlayOcclusion: true,
  showDanglingOccupancy: false,
  showWaterSources: false,
  syncPlayerPosition: true,
  showWireframe: false,
  showInspectedIds: false,
  showHiddenInspects: false,
  showCollisionBoxes: false,
  showShardBoundaries: false,
  showOcclusionMask: false,
  showOccluderMesh: false,
  occlusionMeshStep: 400,
  showStaleBlockShards: false,
  showStaleGlassShards: false,
  showStaleFloraShards: false,
  showGroupBoxes: false,
  dragInventory: false,
  showGremlins: true,
  showNpcs: true,
  showPlaceables: true,
  css3DEnabled: true,
  css3DRadius: 32,
  css3DUnloadRadius: 64,

  healthRegenTimeThresholdS: 5,
  healthRegenAmount: 1,
  healthRegenTickTimeS: 1,

  healthWaterDamageTickTimeS: 2.0,
  healthWaterDamageAmount: 5,
  healthWaterDamageThresholdS: 2.0,

  healthLavaDamageAmount: 60,
  healthLavaDamageThresholdS: 2.0,

  fireHealth: {
    regenRadius: 2,
    regenHp: 1,
    regenDelayS: 1,
    regenIntervalS: 1,
    damageRadius: 1.2,
    damageHp: 10,
    damageDelayS: 1,
    damageIntervalS: 1,
    healRadius: 2,
    healHp: 10,
    healDelayS: 1,
    healIntervalS: 1,
  },

  pannableMapMaxZoom: 3,
  pannableMapMinZoom: -1,
  pannableMapBoundsViscosity: 0.5,
  minimapZoom: 1,
  bigNavigationAids: false,
  mapIconFilters: false,

  overrideTimeOfDay: false,
  timeOfDay: 50,
  sunDilation: true,

  youAreTheGroupSnappingCharacteristic: 3,
  youAreTheGroupDamping: 0.3,

  synchronizeServerTime: false,

  overrideSyncRadius: false,
  syncRadius: 100,
  syncShape: "sphere" as SyncShape,
  permitVoidMovement: false,
  fishingChargingCastParams,
  fishingBiteParams,
  fishingCatchMinigameParams,
  useCSSCapture: true,
  fogStartFar: 0.5,
  deferSceneRender: false,
  enableGpuTimer: true,
  confirmToCloseTab: false,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line unused-imports/no-unused-vars
function typeCheck() {
  AssertJSONable(defaultTweakableConfigValues);
}

export type TweakableConfig = typeof defaultTweakableConfigValues;
