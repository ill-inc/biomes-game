import type { Block } from "@/cayley/graphics/blocks";
import {
  toBlockAtlas,
  toBlockGeometry,
  toBlockSampleTensor,
} from "@/cayley/graphics/blocks";
import type { IndexedGeometry } from "@/cayley/graphics/geometry";
import type { Array4 } from "@/cayley/numerics/arrays";
import { fillArray } from "@/cayley/numerics/arrays";
import { dirtBlock, grassBlock } from "@/client/components/art/common/db";
import {
  makeThreeGeometry,
  makeThreeMesh,
  makeThreeTextureArray,
} from "@/client/components/art/common/three";
import { makeVoxelsMaterial } from "@/gen/client/game/shaders/voxels";
import { makeVoxelsTranslucentMaterial } from "@/gen/client/game/shaders/voxels_translucent";

interface BlockMesh {
  geometry: IndexedGeometry;
  colorMap: Array4<"U8">;
  mreaMap: Array4<"U8">;
}

export function blockUnitMesh(block: Block) {
  const mask = fillArray("U32", [1, 1, 1], 1);
  return {
    geometry: toBlockGeometry(toBlockSampleTensor(mask, [block])),
    colorMap: toBlockAtlas([block], "color"),
    mreaMap: toBlockAtlas([block], "mrea"),
  };
}

export function blockSlabMesh(block: Block) {
  const mask = fillArray("U32", [12, 12, 12], 0);
  mask.assign(":,0:3,:", 1);
  mask.assign("2:8,1:5,2:8", 1);
  return {
    geometry: toBlockGeometry(toBlockSampleTensor(mask, [block])),
    colorMap: toBlockAtlas([block], "color"),
    mreaMap: toBlockAtlas([block], "mrea"),
  };
}

export function blockGardenMesh() {
  const index = [dirtBlock(), grassBlock()];

  const mask = fillArray("U32", [12, 4, 12], 0);
  mask.assign(":,0:3,:", 1);
  mask.assign(":,3,:", 2);
  return {
    geometry: toBlockGeometry(toBlockSampleTensor(mask, index)),
    colorMap: toBlockAtlas(index, "color"),
    mreaMap: toBlockAtlas(index, "mrea"),
  };
}

export function blockMeshToThree(block: BlockMesh) {
  return makeThreeMesh(
    makeThreeGeometry(block.geometry),
    makeVoxelsMaterial({
      colorMap: makeThreeTextureArray(block.colorMap),
      mreaMap: makeThreeTextureArray(block.mreaMap, false),
    })
  );
}

export function glassMeshToThree(block: BlockMesh) {
  return makeThreeMesh(
    makeThreeGeometry(block.geometry),
    makeVoxelsTranslucentMaterial({
      colorMap: makeThreeTextureArray(block.colorMap),
      mreaMap: makeThreeTextureArray(block.mreaMap, false),
    })
  );
}
