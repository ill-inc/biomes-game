import { getIsomorphism, zShapeName } from "@/shared/asset_defs/shapes";
import { BikkieRuntime } from "@/shared/bikkie/active";
import { zDropTable } from "@/shared/game/item_specs";
import { INVALID_BIOMES_ID, zBiomesId } from "@/shared/ids";
import { z } from "zod";

export function tilledSoilIsomorphism() {
  return getIsomorphism("path", [0, 0, 0], [0, 1, 2]);
}

export const seconds = (n: number) => n * 1000;
export const minutes = (n: number) => seconds(60 * n);
export const hours = (n: number) => minutes(60 * n);
export const days = (n: number) => hours(24 * n);
export const weeks = (n: number) => days(7 * n);

import { zBuffsAndProbabilities } from "@/shared/game/buff_specs";

export const zFertilizerEffect = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("time"),
    timeMs: z.number(),
  }),
  z.object({
    kind: z.literal("water"),
    timeMs: z.number(),
  }),
  z.object({
    kind: z.literal("buff"),
    buffs: zBuffsAndProbabilities,
  }),
]);

export type FertilizerEffect = z.infer<typeof zFertilizerEffect>;

export function defaultFertilizerEffect(
  kind: FertilizerEffect["kind"]
): FertilizerEffect {
  switch (kind) {
    case "time":
      return { kind, timeMs: hours(1) };
    case "water":
      return { kind, timeMs: hours(12) };
    case "buff":
      return { kind, buffs: [] };
  }
}

// Stage specs, used for complex farm specs
export const zBaseFarmStage = z.object({
  timeMs: z.number().describe("Growth time in milliseconds"),
  requiresWater: z.boolean().optional().describe("Requires water"),
  requiresSun: z
    .boolean()
    .optional()
    .describe(
      "True: Requires sun. False: Requires shade. Undefined: No requirement."
    ),
  name: z
    .string()
    .optional()
    .describe("Name override of the plant at this stage."),
});

export const zSaplingFarmStage = zBaseFarmStage.extend({
  kind: z.literal("sapling"),
});
export type SaplingFarmStage = z.infer<typeof zSaplingFarmStage>;

export const zLogFarmStage = zBaseFarmStage.extend({
  kind: z.literal("log"),
  logs: z.number().describe("Number of logs"),
  logShape: zShapeName.optional().describe("Log shape"),
});
export type LogFarmStage = z.infer<typeof zLogFarmStage>;

export const zGroupFarmStage = zBaseFarmStage.extend({
  kind: z.literal("group"),
  groupId: zBiomesId.describe("Group ID").optional(),
  groupBlob: z.string().describe("Group blob").optional(),
});
export type GroupFarmStage = z.infer<typeof zGroupFarmStage>;

export const zFarmStage = z.discriminatedUnion("kind", [
  zSaplingFarmStage,
  zLogFarmStage,
  zGroupFarmStage,
]);
export type FarmStage = z.infer<typeof zFarmStage>;

// Crossbreed specs
export const zCrossbreedChance = z.enum([
  "rare",
  "low",
  "medium",
  "high",
  "guaranteed",
]);
export type CrossbreedChance = z.infer<typeof zCrossbreedChance>;
export const zCrossbreedSpec = z.object({
  seeds: zBiomesId.array(),
  // Use enums for now, so we can tune these chances for all crossbreeds
  chance: zCrossbreedChance,
});
export type CrossbreedSpec = z.infer<typeof zCrossbreedSpec>;

// Farm Specs
const zBaseFarmSpec = z.object({
  name: z.string().optional().describe("Name of the plant. Empty for default."),
  waterIntervalMs: z
    .number()
    .optional()
    .describe("Water interval in milliseconds"),
  deathTimeMs: z.number().optional().describe("Death time in milliseconds"),
  crossbreeds: zCrossbreedSpec
    .array()
    .optional()
    .describe("Crossbreeds that can result in this seed"),
});

export const zDropFarmSpec = zBaseFarmSpec.extend({
  dropTable: zDropTable.optional().describe("Drop table"),
  partialGrowthDropTable: zDropTable
    .optional()
    .describe("Drop table for when the plant is destroyed before fully grown"),
  seedDropTable: zDropTable
    .optional()
    .describe("Drop table for the seed when no crossbreeds are fulfilled"),
});

export type DropFarmSpec = z.infer<typeof zDropFarmSpec>;

export const zBasicFarmSpec = zDropFarmSpec.extend({
  kind: z.literal("basic"),
  block: zBiomesId.describe("Terrain block to grow"),
  timeMs: z.number().describe("Growth time in milliseconds"),
  hasGrowthStages: z
    .boolean()
    .default(true)
    .describe("Block has growth stages defined"),
  requiresSun: z
    .boolean()
    .optional()
    .describe(
      "True: Requires sun. False: Requires shade. Undefined: No requirement."
    ),
  irradiance: z
    .number()
    .array()
    .length(4)
    .optional()
    .describe("Irradiance of the plant when fully grown"),
});
export type BasicFarmSpec = z.infer<typeof zBasicFarmSpec>;

export const zTreeFarmSpec = zDropFarmSpec.extend({
  kind: z.literal("tree"),
  leafBlock: zBiomesId.describe("Leaf block"),
  logBlock: zBiomesId.describe("Log block"),
  stages: zFarmStage.array(),
});
export type TreeFarmSpec = z.infer<typeof zTreeFarmSpec>;

export const zVariantFarmSpec = zBaseFarmSpec.extend({
  kind: z.literal("variant"),
  variants: z
    .object({
      def: z.union([zBasicFarmSpec, zTreeFarmSpec]),
      chance: z.number(),
    })
    .array(),
});
export type VariantFarmSpec = z.infer<typeof zVariantFarmSpec>;

export const zFarmSpec = z.discriminatedUnion("kind", [
  zBasicFarmSpec,
  zTreeFarmSpec,
  zVariantFarmSpec,
]);
export type FarmSpec = z.infer<typeof zFarmSpec>;

export function defaultFarmSpec(kind: FarmSpec["kind"]): FarmSpec {
  const bikkie = BikkieRuntime.get();
  const blocks = bikkie.getBiscuits("/blocks");
  const sapling = blocks.find((b) => b.name === "sapling") ?? blocks[0];
  const oakLog = blocks.find((b) => b.name === "oakLog") ?? blocks[0];
  const oakLeaf = blocks.find((b) => b.name === "oakLeaf") ?? blocks[0];

  switch (kind) {
    default:
    case "basic":
      return zFarmSpec.parse({
        kind: "basic",
        block: sapling.id,
        timeMs: days(1),
        waterIntervalMs: hours(28),
        deathTimeMs: days(5),
        hasGrowthStages: true,
      });
    case "tree":
      return zFarmSpec.parse({
        kind: "tree",
        logBlock: oakLog.id,
        leafBlock: oakLeaf.id,
        waterIntervalMs: hours(28),
        stages: [
          { kind: "sapling", timeMs: 0, requiresWater: false },
          {
            kind: "log",
            logs: 1,
            timeMs: hours(20),
            logShape: "peg",
            requiresWater: true,
          },
          {
            kind: "log",
            logs: 2,
            timeMs: hours(24),
            logShape: "shaft",
            requiresWater: true,
          },
          {
            kind: "group",
            groupId: INVALID_BIOMES_ID,
            timeMs: hours(48),
            requiresWater: false,
          },
        ],
      });
    case "variant":
      return {
        kind: "variant",
        waterIntervalMs: hours(28),
        deathTimeMs: days(5),
        variants: [
          {
            def: defaultFarmSpec("basic") as BasicFarmSpec,
            chance: 1,
          },
        ],
      };
  }
}

export function defaultFarmStageSpec(kind: FarmStage["kind"]): FarmStage {
  switch (kind) {
    default:
    case "sapling":
      return {
        kind: "sapling",
        timeMs: 0,
        requiresWater: false,
      };
    case "log":
      return {
        kind: "log",
        logs: 1,
        timeMs: hours(24),
        requiresWater: true,
      };
    case "group":
      return {
        kind: "group",
        groupId: INVALID_BIOMES_ID,
        timeMs: hours(48),
        requiresWater: false,
      };
  }
}
