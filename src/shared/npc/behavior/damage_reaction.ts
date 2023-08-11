import * as z from "zod";

export const zDamageReactionComponent = z.object({
  damageReaction: z
    .object({
      lastReactionTime: z.number().optional(),
    })
    .default({ lastReactionTime: undefined }),
});

export type DamageReactionComponent = z.infer<typeof zDamageReactionComponent>;
