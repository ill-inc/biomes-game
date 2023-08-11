import { z } from "zod";

export const zValueRecord = z.object({
  value: z.string(),
  expires: z.number(),
});

export type ValueRecord = z.infer<typeof zValueRecord>;
