import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { keys } from "lodash";
import type { ZodType } from "zod";
import { z } from "zod";

// Raw storage format of an item.
export const zRawItem = z.object({
  id: zBiomesId,
  payload: z
    .record(
      z
        .union([z.number(), z.string()])
        .transform((x) => (typeof x === "number" ? x : parseInt(x))),
      z.any()
    )
    .optional()
    .transform((x) => (keys(x).length === 0 ? undefined : x)),
}) as ZodType<{
  id: BiomesId;
  payload?: Record<number, any> | undefined;
}>;

export type RawItem = z.infer<typeof zRawItem>;
