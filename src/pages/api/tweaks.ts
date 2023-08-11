import type { TweakableConfig } from "@/server/shared/minigames/ruleset/tweaks";
import { serverFetchTweakableConfig } from "@/server/web/db/tweaks";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { ZodType } from "zod";
import { z } from "zod";

export const zTweaksReadResponse = z.object({
  tweaks: z.record(z.any()) as unknown as ZodType<TweakableConfig>,
});

export type TweaksReadResponse = z.infer<typeof zTweaksReadResponse>;

export default biomesApiHandler(
  {
    auth: "optional",
    response: zTweaksReadResponse,
  },
  async ({ context: { db } }) => ({
    tweaks: await serverFetchTweakableConfig(db),
  })
);
