import shaperDefs from "@/shared/asset_defs/gen/shapers.json";
import {
  isomorphismShape,
  type Isomorphism,
  type ShapeID,
} from "@/shared/asset_defs/shapes";
import type { Vec2 } from "@/shared/math/types";
import { flatten } from "@/shared/util/collections";
import * as z from "zod";

export type ShaperName = keyof typeof shaperDefs;

export const zShaperName = z.enum(
  Object.keys(shaperDefs) as [ShaperName, ...ShaperName[]]
);

export type ShaperOrientation = number;

export interface Shaper {
  has(shape: ShapeID): boolean;
  next(orientation: ShaperOrientation, isomorphism: Isomorphism): Isomorphism;
}

const SHAPER_MAP = new Map(
  Array.from(Object.entries(shaperDefs), ([shaper, { index, overrides }]) => [
    shaper,
    {
      lut: new Map(index as [ShaperOrientation, Isomorphism[]][]),
      overrides: overrides as number[],
      shapes: new Set(
        flatten(
          index.map(([_, isos]) =>
            (isos as Isomorphism[]).map((iso) => isomorphismShape(iso))
          )
        )
      ),
    },
  ])
);

export function getShaper(name: ShaperName) {
  const result = SHAPER_MAP.get(name);
  if (result) {
    const { lut, shapes } = result;
    return {
      has(shape: ShapeID) {
        return shapes.has(shape);
      },
      next: (orientation: ShaperOrientation, isomorphism: Isomorphism) => {
        const isos = lut.get(orientation) ?? [];
        return isos[(isos.indexOf(isomorphism) + 1) % isos.length];
      },
    };
  }
}

export function toShaperOrientation([pitch, yaw]: Vec2) {
  const qYaw = Math.floor((2.0 * (yaw + 0.25 * Math.PI)) / Math.PI) % 4;
  const qPitch = Math.floor((3.0 * (pitch + 0.5 * Math.PI)) / Math.PI) % 3;
  return (qPitch << 2) | qYaw;
}
