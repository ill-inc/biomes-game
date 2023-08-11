import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zBuffsAndProbabilities = z.tuple([zBiomesId, z.number()]).array();
export type BuffsAndProbabilities = z.infer<typeof zBuffsAndProbabilities>;

export const zBuffs = zBiomesId.array().default([]);
export type Buffs = z.infer<typeof zBuffs>;

export const zBuffType = z.enum(["food", "drink", "debuff"]);
export type BuffType = z.infer<typeof zBuffType>;
