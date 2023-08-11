import { zBaseMinigameSettings } from "@/server/shared/minigames/types";
import type { z } from "zod";

export const zDeathmatchSettings = zBaseMinigameSettings.extend({});
export type DeathmatchSettings = z.infer<typeof zDeathmatchSettings>;
