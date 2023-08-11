import { z } from "zod";

export const zCachedImage = z.object({
  url: z.string(),
});

export type CachedImage = z.infer<typeof zCachedImage>;
