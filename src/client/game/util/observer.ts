import { zSyncTarget } from "@/shared/api/sync";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zFixedObserverMode = z.object({
  kind: z.literal("fixed"),
  initialSyncTarget: zSyncTarget,
});
export type FixedObserverMode = z.infer<typeof zFixedObserverMode>;

export const zMinigameObserverMode = z.object({
  kind: z.literal("minigame"),
  minigameId: zBiomesId,
  initialSyncTarget: zSyncTarget,
});
export type MinigameObserverMode = z.infer<typeof zMinigameObserverMode>;

export const zRotateObserverMode = z.object({
  kind: z.literal("rotate"),
  initialSyncTarget: zSyncTarget,
  syncTargets: z.array(zSyncTarget),
});

export type RotateObserverMode = z.infer<typeof zRotateObserverMode>;

export const zObserverMode = z.discriminatedUnion("kind", [
  zFixedObserverMode,
  zRotateObserverMode,
  zMinigameObserverMode,
]);

export type ObserverMode = z.infer<typeof zObserverMode>;
