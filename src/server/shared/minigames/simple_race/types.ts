import { zBaseMinigameSettings } from "@/server/shared/minigames/types";
import { z } from "zod";

export const zSimpleRaceSettings = zBaseMinigameSettings.extend({
  twoStarTimeSeconds: z.number().min(0).default(0),
  threeStarTimeSeconds: z.number().min(0).default(0),
});
export type SimpleRaceSettings = z.infer<typeof zSimpleRaceSettings>;
