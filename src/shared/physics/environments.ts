import type { BoxesIndex } from "@/shared/game/collision";
import { CollisionHelper } from "@/shared/game/collision";
import { clamp, lerp } from "@/shared/math/math";
import type { AABB } from "@/shared/math/types";
import type { Environment } from "@/shared/physics/movement";

export const DEFAULT_ENVIRONMENT_PARAMS: Environment = {
  airResistance: 0.12,
  escapeDampening: 100.0,
  friction: 12,
  gravity: 31.8,
};

export const GROUP_PLACEMENT_ENVIRONMENT_PARAMS: Environment = {
  ...DEFAULT_ENVIRONMENT_PARAMS,
  escapeDampening: 500.0,
};

export const WATER_ENVIRONMENT_PARAMS: Environment = {
  ...DEFAULT_ENVIRONMENT_PARAMS,
  airResistance: 8.4,
  gravity: 7.8,
  friction: 30,
};

export const NPC_SWIMMING_ENVIRONMENT_PARAMS: Environment = {
  gravity: 2,
  friction: 0,
  airResistance: 4,
  escapeDampening: 5,
};

export const NPC_FLYING_ENVIRONMENT_PARAMS: Environment = {
  gravity: 2,
  friction: 0,
  airResistance: 4,
  escapeDampening: 0,
};

export const PLAYER_SWIMMING_ENVIRONMENT_PARAMS: Environment = {
  ...DEFAULT_ENVIRONMENT_PARAMS,
  gravity: 0,
  friction: 8,
  airResistance: 5,
};

export function blendEnvironmentParams(
  src: Environment,
  dst: Environment,
  alpha: number
): Environment {
  return {
    airResistance: lerp(src.airResistance, dst.airResistance, alpha),
    escapeDampening: lerp(src.escapeDampening, dst.escapeDampening, alpha),
    friction: lerp(src.friction, dst.friction, alpha),
    gravity: lerp(src.gravity, dst.gravity, alpha),
  };
}

function computeWaterDepth(src: AABB, water: AABB) {
  return clamp((water[1][1] - src[0][1]) / (src[1][1] - src[0][1]), 0, 1);
}

export function findWaterDepth(
  waterIndex: BoxesIndex,
  aabb: AABB
): number | undefined {
  let inWater = false;
  let waterDepth = 0;
  CollisionHelper.intersectAABB(waterIndex, aabb, (hit) => {
    inWater = true;
    waterDepth = Math.max(waterDepth, computeWaterDepth(aabb, hit));
  });
  if (!inWater) {
    return undefined;
  }

  return waterDepth;
}
