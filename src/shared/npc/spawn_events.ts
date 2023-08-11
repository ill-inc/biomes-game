import { zTerrainName } from "@/shared/asset_defs/terrain";
import type { Vec3 } from "@/shared/math/types";
import { ensureUniqueValues } from "@/shared/npc/config_helpers";
import * as z from "zod";

function numericalConstraint(
  def: number,
  options?: { max?: number; min?: number }
) {
  let entryNumber = z.number();
  if (options?.max !== undefined) {
    entryNumber = entryNumber.max(options.max);
  }
  if (options?.min !== undefined) {
    entryNumber = entryNumber.min(options.min);
  }
  let entry = entryNumber.default(def).optional();

  if (options?.max || options?.min) {
    const constraintsMsgs: string[] = [];
    if (options?.min !== undefined) {
      constraintsMsgs.push(`x >= ${options.min}`);
    }
    if (options?.max !== undefined) {
      constraintsMsgs.push(`x <= ${options.max}`);
    }
    entry = entry.describe(`Range: ${constraintsMsgs.join(", ")}`);
  }

  return z
    .object({
      lessThanOrEqualTo: entry,
      greaterThanOrEqualTo: entry,
      lessThan: entry,
      greaterThan: entry,
    })
    .default({});
}

export function satisfiesNumericalConstraint<
  S extends ReturnType<typeof numericalConstraint>
>(
  constraint: z.infer<S> | undefined,
  value: number,
  options?: { constraintTransform?: (x: number) => number }
): boolean {
  if (constraint === undefined) {
    return true;
  }

  const transform = options?.constraintTransform ?? ((x: number) => x);
  if (
    constraint.greaterThan !== undefined &&
    value <= transform(constraint.greaterThan)
  ) {
    return false;
  }
  if (
    constraint.greaterThanOrEqualTo !== undefined &&
    value < transform(constraint.greaterThanOrEqualTo)
  ) {
    return false;
  }
  if (
    constraint.lessThan !== undefined &&
    value >= transform(constraint.lessThan)
  ) {
    return false;
  }
  if (
    constraint.lessThanOrEqualTo !== undefined &&
    value > transform(constraint.lessThanOrEqualTo)
  ) {
    return false;
  }

  return true;
}

export const zSpawnConstraints = z.object({
  terrainType: ensureUniqueValues(
    z.array(zTerrainName.default("rubber_log")).min(1)
  ).describe(
    "The terrain types this NPC is eligible to spawn above. At least one must be selected."
  ),
  timeOfDay: z
    .enum(["day", "night"])
    .default("day")
    .optional()
    .describe(
      "Indicates whether the NPC will spawn only during certain times of the day/night."
    ),
  distanceFromSky: numericalConstraint(0, { min: 0, max: 15 })
    .default({ lessThanOrEqualTo: 0 })
    .optional()
    .describe(
      "If set, applies a constraint on how far a spawn point is to being visible from the sky. A value of 0 indicates the point is directly visible from the sky, and a value of 15 means the point is >= 15 voxels away from a voxel that is directly visible to the sky."
    ),
  muck: numericalConstraint(0, { min: 0, max: 255 })
    .default({ greaterThanOrEqualTo: 0 })
    .optional()
    .describe(
      "If set, applies a constraint on a spawn point to require the specified muck value."
    ),
  underWater: z
    .boolean()
    .default(false)
    .optional()
    .describe(
      "If set, will only spawn on voxels that are under water or not under water."
    ),
  depth: numericalConstraint(0)
    .optional()
    .describe(
      "Constrains the y-coordinate of the potential spawn points. Can be useful to ensure that some NPCs only spawn deep underground."
    ),
  nearPosition: z
    .object({
      position: z
        .array(z.number())
        .length(3)
        .transform((x) => x as Vec3)
        .describe("The center point of the spawn radius"),
      distance: numericalConstraint(0).describe(
        "The radius around the position that NPCs can spawn around."
      ),
    })
    .default({ position: [0, 0, 0], distance: { lessThan: 100 } })
    .optional()
    .describe(
      "NPCs with this constraint will only spawn within the specified distance from the specified absolute position."
    ),
  spawnEventMinDistance: z
    .number()
    .default(32)
    .optional()
    .describe(
      "Restricts candidate spawn locations to be at least the specified distance from any other NPCs spawned from this same spawn event."
    ),
});

export type SpawnConstraints = z.infer<typeof zSpawnConstraints>;
