import { typedBinaryAttribute } from "@/shared/bikkie/schema/binary";
import { memoize } from "lodash";
import type { ZodType } from "zod";
import { z } from "zod";

export type Skeleton = [string, Skeleton[]];

export const zSkeleton = z.lazy(
  memoize(() => z.tuple([z.string(), zSkeleton.array()]).default(["", []]))
) as ZodType<Skeleton>;

export const zAnimationInfo = z
  .object({
    animations: typedBinaryAttribute("gltf").optional(),
    skeleton: zSkeleton,
    jointOrdering: z.string().default("").array(),
    animationsScale: z.number().optional().default(1.0),
  })
  .default({
    skeleton: ["", []],
    jointOrdering: [],
  });

export type AnimationInfo = z.infer<typeof zAnimationInfo>;
