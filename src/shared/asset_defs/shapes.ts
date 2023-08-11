import isomorphismDefs from "@/shared/asset_defs/gen/isomorphisms.json";
import shapeDefs from "@/shared/asset_defs/gen/shapes.json";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { toIsomorphismId } from "@/shared/game/ids";
import { ok } from "assert";
import * as z from "zod";

export type ShapeName = keyof typeof shapeDefs;
export type ShapeID = (typeof shapeDefs)[keyof typeof shapeDefs];

export const zShapeName = z.enum(
  Object.keys(shapeDefs) as [ShapeName, ...ShapeName[]]
);

const nameToId = new Map(Object.entries(shapeDefs));
const idToName = new Map(Object.entries(shapeDefs).map(([n, i]) => [i, n]));

export type Isomorphism = number;
type Axis = 0 | 1 | 2;
export type Permute = readonly [Axis, Axis, Axis];
export type Reflect = readonly [0 | 1, 0 | 1, 0 | 1];

const permutations: Permute[] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

const reflections: Reflect[] = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
];

function transformHash(permute: Permute, reflect: Reflect) {
  const [px, py, pz] = permute;
  const [rx, ry, rz] = reflect;
  return `${rx}:${ry}:${rz}:${px}:${py}:${pz}`;
}

const transforms = new Map<string, number>();
const reverseTransforms: [Permute, Reflect][] = [];
for (const permute of permutations) {
  for (const reflect of reflections) {
    transforms.set(transformHash(permute, reflect), transforms.size);
    reverseTransforms.push([permute, reflect]);
  }
}

export function getShapeID(name: ShapeName) {
  return nameToId.get(name);
}

export function getShapeName(id: ShapeID) {
  return idToName.get(id) as ShapeName;
}

export function getIsomorphism(
  shape: ShapeName,
  reflect: Reflect,
  permute: Permute
): Isomorphism {
  const hash = transformHash(permute, reflect);
  ok(transforms.has(hash), `Invalid transform: ${permute}, ${reflect}`);
  return toIsomorphismId(getShapeID(shape)!, transforms.get(hash)!);
}

export function getPermuteReflect(
  isomorphism: Isomorphism
): [Permute, Reflect] {
  return reverseTransforms[isomorphism];
}

export function isomorphismsEquivalent(
  a: Isomorphism,
  b: Isomorphism
): boolean {
  const aShapeId = a >> 6;
  const bShapeId = b >> 6;
  return (
    (aShapeId <= 1 && bShapeId <= 1) ||
    isomorphismDefs[a.toString() as keyof typeof isomorphismDefs] ===
      isomorphismDefs[b.toString() as keyof typeof isomorphismDefs]
  );
}

export function isomorphismShape(isomorphism: Isomorphism): ShapeID {
  return isomorphism >> 6;
}

export function shapesEquivalent(a: Isomorphism, b: Isomorphism): boolean {
  return isomorphismShape(a) === isomorphismShape(b);
}

const CLIMBABLE_SHAPES = new Set([getShapeID("fence")]);

export function isClimbableShape(id: ShapeID) {
  return CLIMBABLE_SHAPES.has(id);
}

const CLIMBABLE_TERRAIN = new Set([
  getTerrainID("ivy_vine"),
  getTerrainID("bamboo_bush"),
]);

export function isClimbableTerrain(id: TerrainID) {
  return CLIMBABLE_TERRAIN.has(id);
}
