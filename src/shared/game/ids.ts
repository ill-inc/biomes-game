import type { Isomorphism } from "@/shared/asset_defs/shapes";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import type { BiomesId } from "@/shared/ids";
import { safeParseBiomesId } from "@/shared/ids";

export type TypedId = string & { readonly "": unique symbol };

export function typedIdToId(
  typedId: TypedId | undefined
): BiomesId | undefined {
  if (typedId !== undefined) {
    const result = safeParseBiomesId(typedId.replace(/[^:]+:/, ""));
    if (result !== undefined) {
      return result;
    }
  }
}
//
// The below definitions must match their C++ counterparts.
//
const BLOCK_HEADER = 0x00;
const FLORA_HEADER = 0x01;
const GLASS_HEADER = 0x02;

// Keep in sync with voxeloo/galois/terrain.hpp is_block_id
export function isBlockId(id: number): boolean {
  return id !== 0 && id >> 24 === BLOCK_HEADER;
}

// Keep in sync with voxeloo/galois/terrain.hpp is_flora_id
export function isFloraId(id: number): boolean {
  return id !== 0 && id >> 24 === FLORA_HEADER;
}

// Keep in sync with voxeloo/galois/terrain.hpp is_glass_id
export function isGlassId(id: number): boolean {
  return id !== 0 && id >> 24 === GLASS_HEADER;
}

// Keep in sync with voxeloo/galois/terrain.hpp from_block_id
export function fromBlockId(id: number): TerrainID {
  return (BLOCK_HEADER << 24) | id;
}

// Keep in sync with voxeloo/galois/terrain.hpp from_flora_id
export function fromFloraId(id: number): TerrainID {
  return (FLORA_HEADER << 24) | id;
}

// Keep in sync with voxeloo/galois/terrain.hpp from_glass_id
export function fromGlassId(id: number): TerrainID {
  return (GLASS_HEADER << 24) | id;
}

// Keep in sync with voxeloo/galois/terrain.hpp to_block_id
export function toBlockId(id: number): number {
  return id & 0xffffff;
}

// Keep in sync with voxeloo/galois/terrain.hpp to_flora_id
export function toFloraId(id: number): number {
  return id & 0xffffff;
}

// Keep in sync with voxeloo/galois/terrain.hpp to_glass_id
export function toGlassId(id: number): number {
  return id & 0xffffff;
}

// Keep in sync with voxeloo/galois/shapes.hpp to_isomorphism_id
export function toIsomorphismId(
  shapeId: number,
  transformId: number
): Isomorphism {
  return (shapeId << 6) | (transformId & 0x3f);
}

// Keep in sync with voxeloo/galois/shapes.hpp to_shape_id
export function toShapeId(isomorphismId: Isomorphism): number {
  return isomorphismId >> 6;
}
