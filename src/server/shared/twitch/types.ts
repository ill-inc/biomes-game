import { z } from "zod";

export const zTwitchChannel = z.object({
  id: z.string(),
  title: z.string(),
  displayName: z.string(),
  thumbnailUrl: z.string(),
});

export type TwitchChannel = z.infer<typeof zTwitchChannel>;
