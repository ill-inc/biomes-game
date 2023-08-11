import type { Player } from "@/client/game/resources/players";
import { EMOTE_PROPERTIES } from "@/client/game/resources/players";
import type { ClientResources } from "@/client/game/resources/types";
import type {
  AnimationAction,
  AnimationName,
  AnimationSystemState,
} from "@/client/game/util/animation_system";
import { AnimationSystem } from "@/client/game/util/animation_system";
import type { MixedMesh } from "@/client/game/util/animations";
import { getVelocityBasedWeights } from "@/client/game/util/animations";
import { gltfToThree } from "@/client/game/util/gltf_helpers";
import { TimelineMatcher } from "@/client/game/util/timeline_matcher";
import type { CharacterAnimationTiming } from "@/server/shared/minigames/ruleset/tweaks";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

const RUN_SPEED = 8;

const armsRe = /(.*(arm|hand|tool|chest).*)/i;

export const playerSystem = new AnimationSystem(
  {
    attack1: { fileAnimationName: "Attack" },
    attack2: { fileAnimationName: "Attack2" },

    destroy: { fileAnimationName: "DiggingTool" },
    place: { fileAnimationName: "DiggingTool" },

    walk: { fileAnimationName: "Walking" },
    idle: { fileAnimationName: "Idle" },
    crouchWalking: { fileAnimationName: "CrouchWalking" },
    crouchIdle: { fileAnimationName: "CrouchIdle" },
    run: { fileAnimationName: "Running" },
    runBackwards: { fileAnimationName: "RunningBackward" },

    strafeLeftSlow: { fileAnimationName: "StrafeLeftWalking" },
    strafeLeftFast: { fileAnimationName: "StrafeLeftRunning" },
    strafeRightSlow: { fileAnimationName: "StrafeRightWalking" },
    strafeRightFast: { fileAnimationName: "StrafeRightRunning" },

    jump: { fileAnimationName: "Jump" },
    fall: { fileAnimationName: "Fall" },

    swimForwards: { fileAnimationName: "SwimmingForward" },
    swimBackwards: { fileAnimationName: "SwimmingBackward" },
    swimIdle: { fileAnimationName: "SwimmingIdle" },

    // Flying not yet supported because only admins should be able to fly
    // so using swimming animations temporarily.
    flyIdle: { fileAnimationName: "SwimmingIdle" },
    flyForwards: { fileAnimationName: "SwimmingForward" },

    camera: { fileAnimationName: "HoldingCamera" },
    wave: { fileAnimationName: "Waving" },
    dance: { fileAnimationName: "Dancing" },
    laugh: { fileAnimationName: "Laugh" },
    sit: { fileAnimationName: "Sit" },
    flex: { fileAnimationName: "Flex" },
    applause: { fileAnimationName: "Applause" },
    point: { fileAnimationName: "Point" },
    drink: { fileAnimationName: "Drink" },
    eat: { fileAnimationName: "Eat" },

    fishingCastPull: { fileAnimationName: "FishingCastPull" },
    fishingCastRelease: { fileAnimationName: "FishingCastRelease" },
    fishingIdle: { fileAnimationName: "FishingIdle" },
    fishingReel: { fileAnimationName: "FishingReel" },
    fishingShow: { fileAnimationName: "FishingShow" },

    diggingHand: { fileAnimationName: "DiggingHand" },
    diggingTool: { fileAnimationName: "DiggingTool" },
    watering: { fileAnimationName: "Watering" },

    rock: { fileAnimationName: "Rock" },
    sick: { fileAnimationName: "Sick" },

    equip: { fileAnimationName: "ItemPutBack" },
    unequip: { fileAnimationName: "ItemPutBack" },
  },
  {
    arms: {
      re: armsRe,
    },
    notArms: {
      re: armsRe,
      negateRe: true,
    },
  }
);

export type PlayerAnimationName = AnimationName<typeof playerSystem>;
export type PlayerAnimationAction = AnimationAction<typeof playerSystem>;

export interface AnimatedPlayerMesh extends MixedMesh<typeof playerSystem> {
  threeWeaponAttachment: THREE.Object3D;
}

export function loadPlayerAnimatedMesh(
  gltf: GLTF,
  characterAnimationTimingTweaks: CharacterAnimationTiming
): AnimatedPlayerMesh {
  let weaponParentBone: THREE.Object3D | undefined;
  const meshScene = gltfToThree(gltf);
  let mesh: THREE.Mesh | undefined;
  meshScene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      mesh = child;
    } else if (child.name === "Equipped_Attach" || child.name === "R_Arm") {
      weaponParentBone = child;
    }
  });

  if (!mesh) {
    throw new Error("Could not find any meshes in GLTF");
  }

  if (!weaponParentBone) {
    throw new Error("Unable to find weapon parent bone");
  }

  const weaponAttachment = new THREE.Group();
  weaponParentBone.add(weaponAttachment);

  const state = playerSystem.newState(
    gltfToThree(gltf),
    gltf.animations,
    characterAnimationTimingTweaks
  );

  return {
    three: meshScene,
    animationSystem: playerSystem,
    animationMixer: state.mixer,
    animationSystemState: state,
    threeWeaponAttachment: weaponAttachment,
    timelineMatcher: new TimelineMatcher(() => state.mixer.time),
  };
}

type ToAnimationTimeFunction = (label: string, worldTime: number) => number;
function getJumpWeights(
  player: Player,
  toAnimationTime: ToAnimationTimeFunction
): PlayerAnimationAction | undefined {
  if (player.swimming) {
    return;
  }
  if (player.lastJumpTime && !player.onGround && player.velocity[1] > 0) {
    return {
      weights: playerSystem.singleAnimationWeight("jump", 1),
      state: {
        repeat: { kind: "once" },
        startTime: toAnimationTime("jump", player.lastJumpTime),
        // We significantly increase the ease in time for the jump animation so
        // that the player sees the animation start as soon as possible. This
        // is important because the animation is triggered *after* the player
        // actually jumps, so it needs to react ASAP.
        easeInTime: 0.01,
      },
      layers: {
        arms: "apply",
        notArms: "apply",
      },
    };
  }
}

function getFallWeights(player: Player): PlayerAnimationAction | undefined {
  if (player.swimming) {
    return;
  }
  if (!player.onGround && player.velocity[1] < 0) {
    return {
      weights: playerSystem.singleAnimationWeight("fall", 1),
      state: {
        repeat: { kind: "repeat" },
        startTime: 0,
      },
      layers: {
        arms: "apply",
        notArms: "apply",
      },
    };
  }
}

function getEmoteBasedWeights(
  player: Player,
  toAnimationTime: ToAnimationTimeFunction
): PlayerAnimationAction | undefined {
  if (!player.emoteInfo) {
    return;
  }

  const { emoteStartTime, emoteType } = player.emoteInfo;
  if (
    emoteType !== "warp" &&
    emoteType !== "warpHome" &&
    emoteType !== "splash"
  ) {
    return {
      weights: playerSystem.singleAnimationWeight(emoteType, 1),
      state: {
        repeat: EMOTE_PROPERTIES[emoteType].repeatType,
        startTime: toAnimationTime("emote", emoteStartTime),
        easeInTime: EMOTE_PROPERTIES[emoteType].easeInTime,
      },
      layers: {
        arms: "apply",
        notArms: EMOTE_PROPERTIES[emoteType].notArms ?? "apply",
      },
    };
  }
}

function getCameraModeWeights(
  player: Player
): PlayerAnimationAction | undefined {
  if (player.cameraMode) {
    switch (player.cameraMode) {
      case "fps":
      case "normal":
        return {
          weights: playerSystem.singleAnimationWeight("camera", 1),
          state: { repeat: { kind: "repeat" }, startTime: 0 },
          layers: {
            arms: "apply",
            notArms: "ifIdle",
          },
        };
      case "selfie":
        return undefined;
    }
  } else {
    return undefined;
  }
}

export function syncAnimationsToPlayerState(
  animationState: AnimationSystemState<typeof playerSystem>,
  player: Player,
  dt: number,
  toAnimationTime: ToAnimationTimeFunction,
  resources: ClientResources
) {
  const accum = playerSystem.newAccumulatedActions(
    animationState.mixer.time,
    playerSystem.durationFromState(animationState),
    // Expire one shot animations a bit early so they can transition into
    //another animation while they're ending.
    0.1
  );

  let swimming = player.swimming;

  if (!player.isLocal) {
    const { canSwim } = resources.get(
      "/players/possible_terrain_actions",
      player.id
    );
    swimming = canSwim;
  }

  playerSystem.accumulateAction(
    getEmoteBasedWeights(player, toAnimationTime),
    accum
  );
  playerSystem.accumulateAction(getCameraModeWeights(player), accum);
  playerSystem.accumulateAction(getJumpWeights(player, toAnimationTime), accum);
  playerSystem.accumulateAction(getFallWeights(player), accum);
  playerSystem.accumulateAction(
    getVelocityBasedWeights({
      velocity: player.velocity,
      orientation: player.orientation,
      movementType: player.crouching
        ? "crouching"
        : player.flying
        ? "flying"
        : swimming
        ? "swimming"
        : "walking",
      runSpeed: RUN_SPEED,
      characterSystem: playerSystem,
    }),
    accum
  );

  playerSystem.applyAccumulatedActionsToState(accum, animationState, dt);
}
