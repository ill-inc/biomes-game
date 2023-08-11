import { integralCurrencyAmount } from "@/shared/asset_defs/currency";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { ReadonlyVec3f } from "@/shared/ecs/gen/types";
import { dist } from "@/shared/math/linear";

export const WARP_BLING_ROYALTY_PERCENTAGE = 10n;
export const groupBlingCost = () => integralCurrencyAmount(BikkieIds.bling, 2);

export function calculateWarpRoyalty(cost: bigint) {
  return cost / WARP_BLING_ROYALTY_PERCENTAGE;
}

export function calculateWarpFee(
  playerPosition: ReadonlyVec3f,
  destination: ReadonlyVec3f
): bigint {
  const costPerVoxel = 0.01;
  const d = dist(playerPosition, destination);
  return BigInt(Math.floor(d * costPerVoxel));
}
