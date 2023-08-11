import type { TweakableConfig } from "@/server/shared/minigames/ruleset/tweaks";
import { serverSaveTweakableConfig } from "@/server/web/db/tweaks";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { ZodType } from "zod";
import { z } from "zod";

export const zTweaksSaveRequest = z.object({
  tweaks: z.record(z.any()) as unknown as ZodType<TweakableConfig>,
});

export type TweaksSaveRequest = z.infer<typeof zTweaksSaveRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zTweaksSaveRequest,
  },
  async ({ context: { db }, body: { tweaks } }) => {
    await serverSaveTweakableConfig(db, tweaks);
  }
);
