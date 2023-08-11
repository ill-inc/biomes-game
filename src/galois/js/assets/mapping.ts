import { blockDefs, colorIDs } from "@/galois/assets/blocks";
import * as l from "@/galois/lang";
import { mapTextureKey } from "@/shared/map/textures";

const mapTextures: [string, l.MapTextureLike][] = [];

// Add all block textures.
for (const [name, block] of Object.entries(blockDefs)) {
  for (const dye of ["none", ...Object.keys(colorIDs)]) {
    for (const muckness of ["none", "muck"]) {
      mapTextures.push([
        mapTextureKey(name, muckness, dye),
        l.ToMapTexture(block, muckness, dye),
      ]);
    }
  }
}

// Add all the leaf and water textures.
mapTextures.push([
  "oak_leaf",
  [
    [l.ImageRGB("mapping/textures/oak_leaf.png")],
    [l.ImageRGB("mapping/textures/oak_leaf.png")],
  ],
]);
mapTextures.push([
  "birch_leaf",
  [
    [l.ImageRGB("mapping/textures/birch_leaf.png")],
    [l.ImageRGB("mapping/textures/birch_leaf.png")],
  ],
]);
mapTextures.push([
  "rubber_leaf",
  [
    [l.ImageRGB("mapping/textures/rubber_leaf.png")],
    [l.ImageRGB("mapping/textures/rubber_leaf.png")],
  ],
]);
mapTextures.push([
  "water",
  [
    [l.ImageRGB("mapping/textures/water.png")],
    [l.ImageRGB("mapping/textures/water.png")],
  ],
]);
mapTextures.push([
  "muck",
  [
    [l.ImageRGB("mapping/textures/muck_dark.png")],
    [l.ImageRGB("mapping/textures/muck_dark.png")],
  ],
]);
mapTextures.push([
  "sakura_leaf",
  [
    [l.ImageRGB("mapping/textures/sakura_leaf.png")],
    [l.ImageRGB("mapping/textures/sakura_leaf.png")],
  ],
]);

export function getAssets(): Record<string, l.Asset> {
  return {
    "mapping/index": l.toMapTextureIndex(mapTextures),
  };
}
