import { ok } from "assert";
import { sum } from "lodash";
import * as THREE from "three";

// Given an animation system type, will provide the union type of the different
// animation names supported by that system.
export type AnimationName<T extends AnyAnimationSystem> =
  | T["animationNames"][number]
  // TS compiler seems to need this hint to be happy, even though it's implied.
  | "idle";

// Given an animation system, will provide the union type of the different layer
// names supported by that system.
export type LayerName<T extends AnyAnimationSystem> = T["layerNames"][0];

// Provides the type of animation weights compatible with a given animation
// system.
export type Weights<T extends AnyAnimationSystem> = {
  [K in AnimationName<T>]: number;
};

// Defines animation properties for inclusion in an AnimationSystem.
export type AnimationDefinition = {
  fileAnimationName: string;
  backupFileAnimationNames?: string[];
  timeScale?: number;
};

// Defines layer properties for inclusion in an AnimationSystem.
export type LayerDefinition = {
  re: RegExp;
  negateRe?: boolean;
};

export type StringKeyOf<T extends { [K in string]: any }> = keyof T & string;

// An AnimationSystem object is defined by a set of animations and a set of
// layers of joints that those animations can apply to. The idea is that for
// a given mesh type (e.g. player, cow, bird) you associate with it an
// AnimationSystem, which establishes a set of functions and types that you
// can then use to animate the mesh. The AnimationSystem object itself is
// readonly and mostly static, however you can call the `newState()` function
// to instantiate animation state that is to be associated with a given mesh.
// Updating the animation state is done by calling `newAccumulatedActions()` to
// accumulate a sequence of animation actions with `accumulateAction()` calls,
// and then finally calling `applyAccumulatedActionsToState()` to apply the
// new animation data to the pre-existing animation state (which updates the
// THREE.js animation state).
export class AnimationSystem<
  A extends { [K in string]: AnimationDefinition } & {
    idle: AnimationDefinition;
  },
  L extends { [K in string]: LayerDefinition }
> {
  public readonly animationNames: StringKeyOf<A>[];
  public readonly layerNames: StringKeyOf<L>[];

  // Note all AnimationSystem properties are readonly, call `newState()` to
  // instantiate animation state associated with a given mesh.
  constructor(public readonly animations: A, public readonly layers: L) {
    this.animationNames = Array.from(
      Object.keys(animations)
    ) as StringKeyOf<A>[];
    this.layerNames = Array.from(Object.keys(layers)) as LayerName<this>[];
  }

  createEmptyAnimationWeights(): Weights<this> {
    return Object.fromEntries(this.animationNames.map((x) => [x, 0])) as {
      [K in AnimationName<this>]: number;
    };
  }

  hasAnimation(key: string): key is AnimationName<this> {
    return this.animationNames.includes(key);
  }

  singleAnimationWeight(
    key: AnimationName<this>,
    weight: number
  ): Weights<this> {
    const weights = this.createEmptyAnimationWeights();
    weights[key] = weight;
    return weights;
  }

  // Convenience function to extract animation durations from animation state,
  // which is the main way this is expected to be done outside of unit tests.
  durationFromState(state: AnimationSystemState<this>) {
    // Pull the action duration from the action. We don't care which layer
    // we pull the action from.
    const anyLayerName = (Object.keys(state.actions) as LayerName<this>[])[0];
    const layerActions = state.actions[anyLayerName];

    return (x: AnimationName<this>) => {
      const action = layerActions[x];
      if (!action) {
        return 0.0;
      }
      return action.getClip().duration / action.timeScale;
    };
  }

  // Returns a structure that can have animation actions applied to it via
  // calls to `accumulateAction()`. Ultimately can be applied to the current
  // animation state to adjust the set of currently playing animations.
  newAccumulatedActions(
    clockTime: number,
    duration: (a: AnimationName<this>) => number,
    oneShotTransitionTrim?: number
  ) {
    return {
      layers: Object.fromEntries(
        this.layerNames.map((x) => [x, {}])
      ) as LayerWeights<this>,
      animations: Object.fromEntries(
        this.animationNames.map((x) => [x, undefined])
      ) as AnimationStatuses<this>,
      clockTime: clockTime,
      duration,
      oneShotTransitionTrim,
    } as AccumulatedActions<this>;
  }

  // Applies an animation to the accumulation structure, essentially dictating
  // which animations should play on which layers, assuming no one has
  // previously specified anything. Expired one-shot animations will not be
  // applied, leaving the layers that they affect open.
  accumulateAction(
    action: AnimationAction<this> | undefined,
    accum: AccumulatedActions<this>
  ) {
    if (!action) {
      return;
    }

    // Set the animation state if the animation is active, and track if any
    // animation is active or not.
    let anyAnimationsApplied = false;
    (Object.keys(action.weights) as AnimationName<this>[]).forEach((x) => {
      if (accum.animations[x]) {
        // Somebody has already set this animation.
        return;
      }
      if (action.weights[x] !== 0) {
        if (
          action.state.repeat.kind === "once" &&
          !action.state.repeat.clampWhenFinished &&
          accum.clockTime - action.state.startTime >=
            accum.duration(x) - (accum.oneShotTransitionTrim ?? 0)
        ) {
          // If a one-shot animation has expired, don't count it.
          return;
        }

        accum.animations[x] = action.state;
        anyAnimationsApplied = true;
      }
    });

    if (!anyAnimationsApplied) {
      // If no animations are active, then don't adjust any layer settings,
      // let subsequent actions have a chance.
      return;
    }

    (Object.keys(action.layers) as LayerName<this>[]).forEach((x) => {
      switch (action.layers[x]) {
        case "apply":
          if (!accum.layers[x].desiredWeights) {
            accum.layers[x].desiredWeights = action.weights;
          }
          break;
        case "ifIdle":
          if (!accum.layers[x].idleWeights) {
            accum.layers[x].idleWeights = action.weights;
          }
          break;
        case "noApply":
          break;
      }
    });
  }

  // If accumulated action data specifies that some animation should only play
  // "ifIdle", then this function will replace "idle" weight with the "ifIdle"
  // animations.
  resolveIdleWeights(accum: AccumulatedActions<this>): void {
    (Object.keys(accum.layers) as LayerName<this>[]).forEach((x) => {
      const layer = accum.layers[x];

      if (
        !layer.idleWeights ||
        !layer.desiredWeights ||
        layer.desiredWeights["idle"] === 0
      ) {
        return;
      }

      // Factor the idle weights into the desired animation.
      const idleWeight = layer.desiredWeights["idle"];
      layer.desiredWeights["idle"] = 0;
      layer.desiredWeights = zipMapWeights(
        layer.desiredWeights,
        layer.idleWeights,
        (x, y) => x + y * idleWeight
      );

      // For bookkeeping, mark the idle weights as undefined now that we've
      // made use of them.
      layer.idleWeights = undefined;
    });
  }

  // Convenience method to accumulate and apply a single action, which is useful
  // for some corner cases like inventory select preview.
  applySingleActionToState(
    action: AnimationAction<this>,
    state: AnimationSystemState<this>
  ) {
    const accum = this.newAccumulatedActions(0, this.durationFromState(state));
    this.accumulateAction(action, accum);
    this.applyAccumulatedActionsToState(accum, state);
  }

  // Applies the accumulated set of actions to the current state, modifying all
  // relevant THREE.js animation objects to match. This is the function that
  // will actually start and stop animations.
  applyAccumulatedActionsToState(
    accum: AccumulatedActions<this>,
    state: AnimationSystemState<this>,
    weightSmoothingDt?: number
  ) {
    this.resolveIdleWeights(accum);

    // First, update the set of smoothed current weights for each animation by
    // layer.
    (
      Object.entries(state.layerWeights) as [LayerName<this>, Weights<this>][]
    ).forEach(([l, v]) => {
      const accumulatedWeights = accum.layers[l].desiredWeights;
      if (!accumulatedWeights) {
        return;
      }
      const normalizedDesiredWeights = normalizeWeights(accumulatedWeights);
      if (weightSmoothingDt) {
        this.animationNames.forEach((a) => {
          v[a] = getSmoothedWeight(
            v[a],
            normalizedDesiredWeights[a],
            weightSmoothingDt,
            accum.animations[a]?.easeInTime
          );
        });
      } else {
        // Don't apply any smoothing, apply the weights directly.
        Object.assign(v, accumulatedWeights);
      }
    });

    // First record the time/progress of any currently playing animations on
    // any layer, so that if we start the same animation on another layer, we
    // can synchronize their timings.
    const actionTimes: Map<AnimationName<this>, number> = new Map();
    (Object.keys(state.actions) as LayerName<this>[]).forEach((l) => {
      (Object.keys(state.actions[l]) as AnimationName<this>[]).forEach((a) => {
        if (actionTimes.has(a)) {
          return;
        }

        const action = state.actions[l][a];
        if (action && action.isRunning()) {
          actionTimes.set(a, action.time);
        }
      });
    });

    // And now, apply our new animation parameters to the THREE.js state.
    (Object.keys(state.actions) as LayerName<this>[]).forEach((l) => {
      (Object.keys(state.actions[l]) as AnimationName<this>[]).forEach((a) => {
        const action = state.actions[l][a];
        if (!action) {
          return;
        }

        // Set the action weight.
        const oldWeight = action.weight;
        action.weight = state.layerWeights[l][a];

        // Pause/unpause the animation depending on whether the weights are active
        // or not.
        if (action.weight === 0) {
          if (action.enabled) {
            // It's running and it shouldn't be, so stop it.
            action.enabled = false;
          }
        } else {
          const desiredWeights = accum.layers[l].desiredWeights;
          if (!desiredWeights || desiredWeights[a] === 0) {
            if (!action.paused && !action.clampWhenFinished) {
              // Naturally pause an animation at the end of its sequence if it's no longer
              // desired.
              action.clampWhenFinished = true;
              action.loop = THREE.LoopOnce;
            }
          } else {
            // Okay, the animation should be playing.
            const anim = accum.animations[a];
            ok(anim);

            if (anim.repeat.kind === "once") {
              action.loop = THREE.LoopOnce;
              action.clampWhenFinished = true;
            } else {
              if (action.clampWhenFinished) {
                action.loop = THREE.LoopRepeat;
                action.clampWhenFinished = false;
              }
            }

            const onceAnimationIsClamped =
              anim.repeat.kind === "once" &&
              anim.repeat.clampWhenFinished &&
              action.paused &&
              oldWeight !== 0;
            if (!action.isRunning() && !onceAnimationIsClamped) {
              // It's *not* running, but it should be, so start it.
              action.reset();
              // If running elsewhere, synchronize the timing with other layers.
              const actionTimeOnOtherLayer = actionTimes.get(a);
              if (actionTimeOnOtherLayer) {
                action.time = actionTimeOnOtherLayer;
              } else {
                action.time =
                  (state.mixer.time - anim.startTime) * action.timeScale;
              }
            }
          }
        }
      });
    });
  }

  // Creates a new object to represent animation state, with the intention that
  // it will be long-lived across frames. This function reads data from a
  // gltf instance and creates and associates animation data with it.
  newState<T extends Partial<Record<AnimationName<this>, number>>>(
    meshScene: THREE.Object3D,
    animations: THREE.AnimationClip[],
    animationTimingTweaks?: T
  ): AnimationSystemState<this> {
    const mixer = new THREE.AnimationMixer(meshScene);

    const clipByName = (
      name: string,
      additive: boolean,
      mask: RegExp,
      negateMask: boolean
    ) => {
      const anim = animations.find((e) => e.name === name)?.clone();
      if (!anim) {
        return undefined;
      }
      if (additive) {
        THREE.AnimationUtils.makeClipAdditive(anim);
      }
      if (negateMask) {
        anim.tracks = anim.tracks.filter((t) => !t.name.match(mask));
      } else {
        anim.tracks = anim.tracks.filter((t) => t.name.match(mask));
      }
      return mixer.clipAction(anim);
    };

    const makeLayer = (layerDefinition: LayerDefinition) => {
      return Object.fromEntries(
        (
          Object.entries(this.animations) as [
            AnimationName<this>,
            AnimationDefinition
          ][]
        ).map(([k, v]) => {
          const animationNames = [
            v.fileAnimationName,
            ...(v.backupFileAnimationNames ?? []),
          ];
          let action: THREE.AnimationAction | undefined;
          for (const animationName of animationNames) {
            action = clipByName(
              animationName,
              false,
              layerDefinition.re,
              !!layerDefinition.negateRe
            );
            if (action) {
              break;
            }
          }
          if (!action) {
            return [k, action];
          }
          action.weight = 0;

          action.timeScale = v.timeScale ?? 1;
          if (animationTimingTweaks && (k as string) in animationTimingTweaks) {
            action.timeScale *= animationTimingTweaks[k] as number;
          }
          action.play();
          action.enabled = false;

          return [k, action];
        })
      );
    };

    return {
      mixer,
      actions: Object.fromEntries(
        (
          Object.entries(this.layers) as [LayerName<this>, LayerDefinition][]
        ).map(([k, v]) => [k, makeLayer(v)])
      ) as ThreeActions<this>,
      layerWeights: Object.fromEntries(
        Object.keys(this.layers).map((k) => [
          k,
          this.createEmptyAnimationWeights(),
        ])
      ) as { [K in LayerName<this>]: Weights<this> },
    };
  }
}

function mapWeights<W extends Record<string, number>>(
  a: W,
  fn: (x: number) => number
): W {
  return Object.fromEntries(Object.entries(a).map(([k, v]) => [k, fn(v)])) as W;
}

function zipMapWeights<W extends Record<string, number>>(
  a: W,
  b: W,
  fn: (a: number, b: number) => number
): W {
  return Object.fromEntries(
    Object.keys(a).map((x) => [x, fn(a[x], b[x])])
  ) as W;
}

function normalizeWeights<W extends Record<string, number>>(a: W): W {
  const s = sum(Object.values(a));
  return mapWeights(a, (x) => x / s);
}

export function getSmoothedWeight(
  currentWeight: number,
  desiredWeight: number,
  dt: number,
  easeInTime?: number
) {
  const defaultEaseTime = 0.25;

  const weightDiff = desiredWeight - currentWeight;
  const easeTime = weightDiff > 0 && easeInTime ? easeInTime : defaultEaseTime;
  const weightVelocity = 1 / easeTime;
  const dw = Math.min(1, weightVelocity * dt);

  const newWeight = currentWeight + dw * (desiredWeight - currentWeight);

  return newWeight < 0.001 ? 0 : newWeight;
}

// Helper definition since many structures have their types derived from
// a central AnimationSystem type.
export type AnyAnimationSystem = AnimationSystem<any, any>;

// Animation weight data associated with a layer while we are accumulating
// animation actions.
interface LayerWeight<A extends AnyAnimationSystem> {
  desiredWeights?: Weights<A>;
  // If set, the idle animation's weights should be replaced with these
  // weights. Acts as "low-priority" weights.
  idleWeights?: Weights<A>;
}
type LayerWeights<A extends AnyAnimationSystem> = {
  [K in LayerName<A>]: LayerWeight<A>;
};

export type RepeatType =
  | { kind: "repeat" }
  | { kind: "once"; clampWhenFinished?: boolean };

// Information about a specific animation and how it should play, which is to
// apply across *all* layers (though not all layers may be playing the
// animation).
interface AnimationStatus {
  repeat: RepeatType;
  startTime: number;
  easeInTime?: number;
}

type AnimationStatuses<A extends AnyAnimationSystem> = {
  [K in AnimationName<A>]: AnimationStatus | undefined;
};

// This is the structure that manages the accumulated desired animation state
// across all actions, compiling and flattening them together. Note that
// there is both per-layer/per-animation information (e.g. weights) and
// per-animation information (e.g. play progress and repeat/play once status).
// If multiple layers are playing the same animation, we want the per-animation
// data to apply across all layers.
interface AccumulatedActions<A extends AnyAnimationSystem> {
  layers: LayerWeights<A>;
  animations: AnimationStatuses<A>;
  // The current time, to be provided by the caller. Used to determine whether
  // one-shot animations are expired or not during accumulation.
  readonly clockTime: number;
  // A function to provide the duration of a given animation, which is not
  // easy to access if we don't have the THREE.js actions, which we don't at
  // animation accumulation time.
  readonly duration: (a: AnimationName<A>) => number;
  // How many seconds to trim off the end of a one shot animation in order to
  // allow it to transition to another animation before it completely ends.
  readonly oneShotTransitionTrim?: number;
}

export type ActionPriority =
  // Apply the animation to the given layer, and don't let any other action
  // modify the layer afterwards.
  | "apply"
  // Essentially a "low-priority" animation, that will be applied only if the
  // "idle" animation ends up being active.
  | "ifIdle"
  // The animation action should not affect the given layer.
  | "noApply";

// An expression of desire that a given set of animations play on the specified
// set of layers. Can be accumulated together with other animation actions.
export type AnimationAction<A extends AnyAnimationSystem> = {
  weights: Weights<A>;
  state: AnimationStatus;
  layers: {
    [K in LayerName<A>]: ActionPriority;
  };
};

type ThreeActions<A extends AnyAnimationSystem> = {
  [K in LayerName<A>]: {
    [K in AnimationName<A>]: THREE.AnimationAction | undefined;
  };
};
// Instantiated animation state, associated with a given mesh. This structure
// is intended to be long-lived, across frames, and contains the hooks into
// THREE.js necessary for actually triggering the animations.
export type AnimationSystemState<A extends AnyAnimationSystem> = {
  layerWeights: { [K in LayerName<A>]: Weights<A> };
  mixer: THREE.AnimationMixer;
  actions: ThreeActions<A>;
};
