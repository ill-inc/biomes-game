import { add, mul, shiftAABB, viewDir } from "@/shared/math/linear";
import type { AABB, Vec3 } from "@/shared/math/types";
import type { CollisionIndex } from "@/shared/physics/types";

export function intersecting(index: CollisionIndex, aabb: AABB) {
  let ret = false;
  index(aabb, () => {
    ret = true;
    return true;
  });
  return ret;
}

export function grounded(index: CollisionIndex, aabb: AABB) {
  return intersecting(index, shiftAABB(aabb, [0, -1e-3, 0]));
}

export function toClimbableIndex(index: CollisionIndex) {
  return (aabb: AABB, dir: Vec3) => canClimbBlock({ index, aabb, dir });
}

export function toGroundedIndex(index: CollisionIndex) {
  return (aabb: AABB) => grounded(index, aabb);
}

export function yawVector(yaw: number): Vec3 {
  return viewVector(0, yaw);
}

export function viewVector(pitch: number, yaw: number): Vec3 {
  return viewDir([pitch, yaw]);
}

export function canClimbBlock({
  index,
  aabb,
  dir,
}: {
  index: CollisionIndex;
  aabb: AABB;
  dir: Vec3;
}) {
  // Try placing the player slightly forward and up and see if they are
  // still intersecting to determine if the player can climb. Try climbing
  // increasing fractions of a full block to account for the case where
  // the player is already half way up climbing a block and the destination
  // block has a roof. If you only try a full block, it will fail since their
  // head would intersect with the roof.

  // Number of fractions of a block to check.
  const blockFractions = 11;

  return Array.from(
    { length: blockFractions },
    (_, i) => (i + 1) / blockFractions
  ).some(
    (fraction) =>
      !intersecting(
        index,
        shiftAABB(aabb, add(mul(1e-3, dir), [0, fraction + 1e-3, 0]))
      )
  );
}
