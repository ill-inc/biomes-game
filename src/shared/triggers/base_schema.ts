import { zNavigationAid, zTriggerIcon } from "@/shared/game/types";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zStoredRewards = z.object({
  items: z.string().optional(), // Encoded item-bag.
});

export type StoredRewards = z.infer<typeof zStoredRewards>;

export const zBaseStoredTriggerDefinition = z.object({
  kind: z.string(),
  id: zBiomesId,
  name: z.string().optional(),
  description: z.string().optional(),
  icon: zTriggerIcon.optional(),
  navigationAid: zNavigationAid.optional(),
});

export type BaseStoredTriggerDefinition = z.infer<
  typeof zBaseStoredTriggerDefinition
>;

export const zMetaState = z.object({
  firedAt: z.number().optional(),
  payload: z.any(),
});

export type MetaState<T = any> = {
  firedAt?: number;
  payload?: T;
};
