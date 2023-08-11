import { BikkieIds } from "@/shared/bikkie/ids";
import { CAVE_OCCLUSION_THRESHOLD } from "@/shared/constants";
import { INVALID_BIOMES_ID, zBiomesId } from "@/shared/ids";
import { EPSILON } from "@/shared/math/linear";
import { zAABB } from "@/shared/math/types";
import { assertNever } from "@/shared/util/type_helpers";
import type { ZodRawShape } from "zod";
import { z } from "zod";

// Numerical predicates can be queried with min/max, or a specific value
// Typed predicates can only be queried with a specific value
function typedPredicate<T extends string, V extends z.ZodTypeAny>(
  kind: T,
  value: V
) {
  return z.object({
    kind: z.literal(kind),
    value,
    invert: z.boolean().optional(),
  });
}

function numPredicate<T extends string>(kind: T) {
  return z.object({
    kind: z.literal(kind),
    value: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    invert: z.boolean().optional(),
  });
}

function derivedPredicate<T extends string>(kind: T) {
  return z.object({
    kind: z.literal(kind),
  });
}

function derivedBodyPredicate<T extends string, B extends ZodRawShape>(
  kind: T,
  body: B
) {
  return z
    .object({
      kind: z.literal(kind),
    })
    .extend(body);
}

export const zSharedGameStatePredicate = z.discriminatedUnion("kind", [
  numPredicate("muck"),
  numPredicate("timeOfDay"),
  numPredicate("positionX"),
  numPredicate("positionY"),
  numPredicate("positionZ"),

  // Derived predicates are defined in terms of other predicates
  derivedPredicate("isDay"),
  derivedPredicate("isNight"),
  derivedPredicate("inMuck"),
  derivedPredicate("notMuck"),
  derivedBodyPredicate("position", { bounds: zAABB }),
]);

export const zBlockGameStatePredicate = z.discriminatedUnion("kind", [
  ...zSharedGameStatePredicate.options,
  typedPredicate("seedBlock", z.boolean()),
  numPredicate("toolHardnessClass"),
  numPredicate("toolDestroyerClass"),
  typedPredicate("block", zBiomesId),
]);
export type BlockGameStatePredicate = z.infer<typeof zBlockGameStatePredicate>;

export const zFishingGameStatePredicate = z.discriminatedUnion("kind", [
  ...zSharedGameStatePredicate.options,
  numPredicate("toolHardnessClass"),
  numPredicate("toolDestroyerClass"),
  numPredicate("waterDepth"),
  typedPredicate("bait", zBiomesId),
  numPredicate("skyOcclusion"),

  derivedPredicate("isShallowWater"),
  derivedPredicate("isNormalDepthWater"),
  derivedPredicate("isDeepWater"),
  derivedPredicate("anyBait"),
  derivedPredicate("inCave"),
  derivedPredicate("inOpen"),
]);
export type FishingGameStatePredicate = z.infer<
  typeof zFishingGameStatePredicate
>;

export const zGameStatePredicate = z.union([
  zBlockGameStatePredicate,
  zFishingGameStatePredicate,
]);
export type GameStatePredicate = z.infer<typeof zGameStatePredicate>;

export type ExecutableGameStatePredicate = Extract<
  GameStatePredicate,
  { value?: any }
>;
export type DerivedGameStatePredicate = Exclude<
  GameStatePredicate,
  { value?: any }
>;

export function gameStatePredicateDefault(
  kind: GameStatePredicate["kind"]
): GameStatePredicate | undefined {
  switch (kind) {
    case "muck":
    case "timeOfDay":
    case "toolHardnessClass":
    case "positionX":
    case "positionY":
    case "positionZ":
    case "waterDepth":
    case "skyOcclusion":
      // Range default
      return { kind, min: -Infinity, max: Infinity };
    case "seedBlock":
      return { kind, value: true };
    case "toolDestroyerClass":
      return { kind, value: 0 };
    case "block":
      return { kind, value: BikkieIds.dirt };
    case "bait":
      return { kind, value: BikkieIds.baitShrimp };
    case "isDay":
    case "isNight":
    case "inMuck":
    case "notMuck":
    case "isDeepWater":
    case "isShallowWater":
    case "isNormalDepthWater":
    case "anyBait":
    case "inCave":
    case "inOpen":
      // Derived
      return { kind };
    case "position":
      return {
        kind,
        bounds: [
          [-Infinity, -Infinity, -Infinity],
          [Infinity, Infinity, Infinity],
        ],
      };
  }
  assertNever(kind);
}

// Derived predicates -> executable predicates
const DEEP_WATER = 16;
const SHALLOW_WATER = 3;
export function getExecutablePredicates(
  predicates: GameStatePredicate[],
  defaults: GameStatePredicate[] = []
): ExecutableGameStatePredicate[] {
  // Convert to executable predicates
  const execPredicates: ExecutableGameStatePredicate[] = predicates.flatMap(
    (predicate) => {
      switch (predicate.kind) {
        case "isDay":
          return [{ kind: "timeOfDay", min: 0.2, max: 0.8 }];
        case "isNight":
          return [{ kind: "timeOfDay", min: 0.2, max: 0.8, invert: true }];
        case "inMuck":
          return [{ kind: "muck", min: 1 }];
        case "notMuck":
          return [{ kind: "muck", min: 1, invert: true }];
        case "isDeepWater":
          return [{ kind: "waterDepth", min: DEEP_WATER }];
        case "isShallowWater":
          return [{ kind: "waterDepth", max: SHALLOW_WATER }];
        case "isNormalDepthWater":
          return [
            {
              kind: "waterDepth",
              min: SHALLOW_WATER + EPSILON,
              max: DEEP_WATER - EPSILON,
            },
          ];
        case "anyBait":
          return [{ kind: "bait", value: INVALID_BIOMES_ID, invert: true }];
        case "position":
          return [
            {
              kind: "positionX",
              min: Math.min(predicate.bounds[0][0], predicate.bounds[1][0]),
              max: Math.max(predicate.bounds[0][0], predicate.bounds[1][0]),
            },
            {
              kind: "positionY",
              min: Math.min(predicate.bounds[0][1], predicate.bounds[1][1]),
              max: Math.max(predicate.bounds[0][1], predicate.bounds[1][1]),
            },
            {
              kind: "positionZ",
              min: Math.min(predicate.bounds[0][2], predicate.bounds[1][2]),
              max: Math.max(predicate.bounds[0][2], predicate.bounds[1][2]),
            },
          ];
        case "inCave":
          return [
            { kind: "skyOcclusion", min: CAVE_OCCLUSION_THRESHOLD + 1 },
            // Cave fish don't care about depth; override default
            { kind: "waterDepth", min: -Infinity, max: Infinity },
          ];
        case "inOpen":
          return [
            {
              kind: "skyOcclusion",
              min: CAVE_OCCLUSION_THRESHOLD + 1,
              invert: true,
            },
          ];
      }
      // Already an executable predicate
      return [predicate];
    }
  );

  // Fill in defaults by context
  if (defaults.length > 0) {
    const execDefaults = getExecutablePredicates(defaults);
    const definedPredicates = new Set(
      execPredicates.map((predicates) => predicates.kind)
    );
    for (const predicate of execDefaults) {
      if (!definedPredicates.has(predicate.kind)) {
        execPredicates.push(predicate);
      }
    }
  }
  return execPredicates;
}
