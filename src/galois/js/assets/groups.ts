import { blockIndex } from "@/galois/assets/blocks";
import { floraIndex } from "@/galois/assets/florae";
import { glassIndex } from "@/galois/assets/glass";
import { shapeIndex } from "@/galois/assets/shapes";
import * as l from "@/galois/lang";

export const groupIndex = l.ToGroupIndex(
  blockIndex,
  shapeIndex,
  floraIndex,
  glassIndex
);

export function getAssets(): Record<string, l.Asset> {
  return {
    "indices/groups": groupIndex,
  };
}
