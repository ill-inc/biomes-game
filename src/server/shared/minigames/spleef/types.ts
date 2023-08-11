import {
  zBaseMinigameSettings,
  zMinigameLoadoutSetting,
} from "@/server/shared/minigames/types";
import { BikkieIds } from "@/shared/bikkie/ids";
import { z } from "zod";

export const zSpleefGameMode = z.enum(["last_person_standing", "tag"]);

export const zSpleefSettings = zBaseMinigameSettings.extend({
  gameMode: zSpleefGameMode.default("last_person_standing"),
  allowPlayerCollision: z.boolean().default(true),
  minPlayers: z.number().min(0).default(0),
  roundLengthSeconds: z
    .number()
    .min(1)
    .max(3600)
    .default(5 * 60),
  roundDelaySeconds: z.number().min(0).max(3600).default(15),
  loadOut: zMinigameLoadoutSetting.default([
    [BikkieIds.megaAxe, 1],
    [BikkieIds.superStriker, 1],
    [BikkieIds.bizzyCola, 1],
  ]),
});
export type SpleefSettings = z.infer<typeof zSpleefSettings>;
