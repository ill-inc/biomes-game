import * as z from "zod";

const zKnockbackParams = z.object({
  popup: z.number(),
  force: z.number(),
});

export const zNpcGlobals = z
  .object({
    knockback: zKnockbackParams,
    gravity: z.number(),
    wardRange: z
      .number()
      .describe("Distance that muckers are warded by mucker wards."),
    playerAttackInterval: z
      .number()
      .describe(
        "The time the player must wait between attacks, in seconds. Note that this will not modify the player's damage per second, so e.g. reducing the interval will *also* cause each attack to do less damage."
      ),
    offLimitDeeds: z.array(z.number()).optional(), // TODO: remove me
  })
  .strict();

export type NpcGlobals = z.infer<typeof zNpcGlobals>;
