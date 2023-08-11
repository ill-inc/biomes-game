import {
  identm4,
  makeScale,
  makeTranslation,
  makeXRotate,
  makeYRotate,
  makeZRotate,
  mulm4,
} from "@/shared/math/linear";
import type { Mat4 } from "@/shared/math/types";
import { zVec3f } from "@/shared/math/types";
import { asyncDefaultSymbol } from "@/shared/zfs/async_default";
import { memoize } from "lodash";
import type { ZodType } from "zod";
import { z } from "zod";

export const zScaleTransform = z
  .object({
    kind: z.literal("scale"),
    scale: z.number(),
  })
  .annotate(asyncDefaultSymbol, () => ({ kind: "scale", scale: 1 }));

export type ScaleTransform = z.infer<typeof zScaleTransform>;

export const zTranslateTransform = z
  .object({
    kind: z.literal("translate"),
    translate: zVec3f,
  })
  .annotate(asyncDefaultSymbol, () => ({
    kind: "translate",
    translate: [0, 0, 0] as [number, number, number],
  }));

export type TranslateTransform = z.infer<typeof zTranslateTransform>;

export const zRotateXTransform = z
  .object({
    kind: z.literal("rotateX"),
    rotateX: z.number(),
  })
  .annotate(asyncDefaultSymbol, () => ({
    kind: "rotateX",
    rotateX: 0,
  }));

export type RotateXTransform = z.infer<typeof zRotateXTransform>;

export const zRotateYTransform = z
  .object({
    kind: z.literal("rotateY"),
    rotateY: z.number(),
  })
  .annotate(asyncDefaultSymbol, () => ({
    kind: "rotateY",
    rotateY: 0,
  }));

export type RotateYTransform = z.infer<typeof zRotateYTransform>;

export const zRotateZTransform = z
  .object({
    kind: z.literal("rotateZ"),
    rotateZ: z.number(),
  })
  .annotate(asyncDefaultSymbol, () => ({
    kind: "rotateZ",
    rotateZ: 0,
  }));

export type RotateZTransform = z.infer<typeof zRotateZTransform>;

export const zNamedTransform = z
  .object({
    kind: z.literal("named"),
    name: z.string(),
  })
  .annotate(asyncDefaultSymbol, () => ({
    kind: "named",
    name: "",
  }));

export type NamedTransform = z.infer<typeof zNamedTransform>;

export type AffineTransform =
  | TransformList
  | ScaleTransform
  | TranslateTransform
  | RotateXTransform
  | RotateYTransform
  | RotateZTransform
  | NamedTransform;

// TODO: This is an extremely verbose schema, perhaps instead it should
// be a 4x4 matrix and left at that.
export const zAffineTransform = z.lazy(
  memoize(() =>
    z
      .discriminatedUnion("kind", [
        zTransformList,
        zScaleTransform,
        zTranslateTransform,
        zRotateXTransform,
        zRotateYTransform,
        zRotateZTransform,
        zNamedTransform,
      ])
      .annotate(
        asyncDefaultSymbol,
        () =>
          <TransformList>{
            kind: "list",
            transforms: [],
          }
      )
  )
) as ZodType<AffineTransform>;

export const zTransformList = z
  .object({
    kind: z.literal("list"),
    transforms: z.array(zAffineTransform),
  })
  .annotate(
    asyncDefaultSymbol,
    () =>
      <TransformList>{
        kind: "list",
        transforms: [],
      }
  );

export type TransformList = {
  kind: "list";
  transforms: AffineTransform[];
};

// TODO: Find a better home for this one.
const NAMED_TRANSFORMS: { [key: string]: AffineTransform } = {
  toolWithHandle: { kind: "translate", translate: [0, -6, 0] },
  fish: { kind: "rotateY", rotateY: 90 },
};

export function affineToMatrix(transform?: AffineTransform): Mat4 {
  if (!transform) {
    return identm4();
  }
  switch (transform.kind) {
    case "list":
      return transform.transforms.reduce(
        (mat, transform) => mulm4(mat, affineToMatrix(transform)),
        identm4()
      );
    case "scale":
      return makeScale([transform.scale, transform.scale, transform.scale]);
    case "translate":
      return makeTranslation(transform.translate);
    case "rotateX":
      return makeXRotate((transform.rotateX * Math.PI) / 180);
    case "rotateY":
      return makeYRotate((transform.rotateY * Math.PI) / 180);
    case "rotateZ":
      return makeZRotate((transform.rotateZ * Math.PI) / 180);
    case "named":
      const match = NAMED_TRANSFORMS[transform.name];
      if (match) {
        return affineToMatrix(match);
      }
      return identm4();
  }
}
