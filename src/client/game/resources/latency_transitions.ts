import {
  makeBezierAngleTransition,
  makeBezierVec3Transition,
} from "@/client/game/util/transitions";
import type { TweakableConfig } from "@/server/shared/minigames/ruleset/tweaks";
import type { ReadonlyVec3, Vec2 } from "@/shared/math/types";

// Logic specific to transitioning between remote entity position/orientation
// data point samples.

// Indicates that we'd like to have y percent of the curve progress completed in
// x percent of the duration. This is useful for latency masking where we'd like
// to have responsiveness on incoming new data, but still keep things smooth
// when data doesn't arrive for large gaps.
const FRONTLOAD_MIDPOINT: Vec2 = [0.25, 0.85];

export function makeBezierVec3LatencyTransition(
  src: ReadonlyVec3,
  tweaks: TweakableConfig
) {
  return makeBezierVec3Transition(
    src,
    tweaks.networking.playerSmoothing.interpDuration,
    FRONTLOAD_MIDPOINT
  );
}

export function makeBezierAngleLatencyTransition(
  src: number,
  tweaks: TweakableConfig
) {
  return makeBezierAngleTransition(
    src,
    tweaks.networking.playerSmoothing.interpDuration,
    FRONTLOAD_MIDPOINT
  );
}
