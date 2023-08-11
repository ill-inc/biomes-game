import { getDyeNames } from "@/shared/asset_defs/blocks";
import { z } from "zod";

const zBlockPosition = z.union([z.literal("white"), z.literal("black")]);
const zBlockDye = z.enum(["none", ...getDyeNames()]);
const zBlockMuck = z.union([
  z.literal("any"),
  z.literal("none"),
  z.literal("muck"),
]);
const zBlockMoisture = z.union([
  z.literal("any"),
  z.literal("zero"),
  z.literal("low"),
  z.literal("moderate"),
  z.literal("high"),
  z.literal("full"),
]);

const zBlockCriteria = z.object({
  position: zBlockPosition,
  dye: zBlockDye,
  muck: zBlockMuck.default("any"),
  moisture: zBlockMoisture,
});

const zBlockTexture = z.object({
  x_neg: z.string(),
  x_pos: z.string(),
  y_neg: z.string(),
  y_pos: z.string(),
  z_neg: z.string(),
  z_pos: z.string(),
});

const zBlockMaterial = z.object({
  color: zBlockTexture,
  mrea: zBlockTexture,
});

const zBlockSample = z.object({
  criteria: zBlockCriteria,
  material: zBlockMaterial,
});

export const zBlock = z.object({
  name: z.string(),
  samples: z.array(zBlockSample),
});

export type BlockCriteria = z.infer<typeof zBlockCriteria>;
export type BlockMaterial = z.infer<typeof zBlockMaterial>;
export type BlockSample = z.infer<typeof zBlockSample>;
export type Block = z.infer<typeof zBlock>;
