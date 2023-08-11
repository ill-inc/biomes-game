import { shapeIDs, shapeIndex } from "@/galois/assets/shapes";
import * as l from "@/galois/lang";

const pegger = l.ToShaper(shapeIndex, shapeIDs.peg, []);

const stepper = l.ToShaper(
  shapeIndex,
  shapeIDs.step,
  [shapeIDs.corner, shapeIDs.knob],
  l.Reflect(false, false, true)
);

const slabber = l.ToShaper(shapeIndex, shapeIDs.wall, [], l.Permute("zyx"));

const shaperDefs = {
  pegger,
  slabber,
  stepper,
} as const;

export function getAssets(): Record<string, l.Asset> {
  return {
    "definitions/shapers": l.ToShaperTable(Object.entries(shaperDefs)),
  };
}
