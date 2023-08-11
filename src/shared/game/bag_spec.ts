import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zBagSpec = z.tuple([zBiomesId, z.number()]).array();
export type BagSpec = z.infer<typeof zBagSpec>;
