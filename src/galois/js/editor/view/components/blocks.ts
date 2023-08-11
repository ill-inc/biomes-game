import { colorIDs } from "@/galois/assets/blocks";
import { shapeIndex } from "@/galois/assets/shapes";
import * as l from "@/galois/lang";
import { assert } from "chai";

interface BlockSampleDef {
  side?: string;
  top?: string;
  bottom?: string;
  mrea?: string;
  mreatop?: string;
  mreaside?: string;
  mreabottom?: string;
}

class BlockDef {
  white = new Map<string, BlockSampleDef>();
  black = new Map<string, BlockSampleDef>();
}

function setDefault<K, V>(map: Map<K, V>, key: K, val: V) {
  const ret = map.get(key);
  if (ret) {
    return ret;
  } else {
    map.set(key, val);
    return val;
  }
}

function toTileName(s: string): keyof BlockDef {
  if (s === "black" || s === "white") {
    return s;
  }
  throw Error(`Invalid face name ${s}`);
}

function toFaceName(s: string): keyof BlockSampleDef {
  if (
    s === "side" ||
    s === "top" ||
    s === "bottom" ||
    s === "mrea" ||
    s === "mreaside" ||
    s === "mreatop" ||
    s === "mreabottom"
  ) {
    return s;
  }
  throw Error(`Invalid face name ${s}`);
}

export function createBlocksAssets(
  textures: string[],
  sharedTextures: string[]
): [string, l.BlockMesh][] {
  // Parse the texture names to produce the collection of block definitions.
  const defs = new Map<string, BlockDef>();
  for (const texture of textures) {
    const match = texture.match(/.*\/(.+)_([^_]+)_([^_]+)_([^_]+).png/);
    if (!match) {
      console.log(`Skipping invalid block texture file name: ${texture}`);
      continue;
    }
    const [name, tile, variant, face] = match.slice(1);
    const def = setDefault(defs, name, new BlockDef());
    const sample = setDefault(def[toTileName(tile)], variant, {});
    sample[toFaceName(face)] = texture;
  }

  // Parse shared textures into a map
  const shared = new Map<string, string>();
  for (const texture of sharedTextures) {
    const match = texture.match(/.*\/(.+).png/);
    if (!match) {
      console.log(
        `Skipping invalid shared block texture file name: ${texture}`
      );
      continue;
    }
    shared.set(match[1], texture);
  }

  // Turn the block defintions into actual asset definitions.
  const defaultMrea = shared.get("default_mrea");
  assert.ok(defaultMrea !== undefined, "Missing default mrea texture");
  const blocks: [string, l.BlockMesh][] = [];
  // TODO: Fix this logic to use the updated block definitions when they are added
  for (const [name, def] of defs.entries()) {
    const samples: l.BlockSample[] = [];
    for (const sample of def.black.values()) {
      const criteria = l.ToBlockSampleCriteria(
        "black",
        "empty",
        "none",
        "zero"
      );
      const mreaSide = sample.mreaside || sample.mrea || defaultMrea!;
      const mreaTop = sample.mreatop || sample.mrea || defaultMrea!;
      const mreaBottom = sample.mreabottom || sample.mrea || defaultMrea!;
      if (sample.side && sample.top && sample.bottom) {
        samples.push(
          l.ToBlockSample(
            criteria,
            l.ToBlockSampleTexture(
              l.ToCubeTexture(
                l.FlipVertical(l.ImageRGB(sample.side)),
                l.FlipVertical(l.ImageRGB(sample.top)),
                l.FlipVertical(l.ImageRGB(sample.bottom))
              ),
              l.ToCubeTexture(
                l.FlipVertical(l.ImageRGB(mreaSide)),
                l.FlipVertical(l.ImageRGB(mreaTop)),
                l.FlipVertical(l.ImageRGB(mreaBottom))
              )
            )
          )
        );
      } else {
        throw Error(`Block is missing a dark face: ${name}`);
      }
    }
    for (const sample of def.white.values()) {
      if (sample.side && sample.top && sample.bottom) {
        const criteria = l.ToBlockSampleCriteria(
          "white",
          "empty",
          "none",
          "zero"
        );
        const mreaSide = sample.mreaside || sample.mrea || defaultMrea!;
        const mreaTop = sample.mreatop || sample.mrea || defaultMrea!;
        const mreaBottom = sample.mreabottom || sample.mrea || defaultMrea!;
        samples.push(
          l.ToBlockSample(
            criteria,
            l.ToBlockSampleTexture(
              l.ToCubeTexture(
                l.FlipVertical(l.ImageRGB(sample.side)),
                l.FlipVertical(l.ImageRGB(sample.top)),
                l.FlipVertical(l.ImageRGB(sample.bottom))
              ),
              l.ToCubeTexture(
                l.FlipVertical(l.ImageRGB(mreaSide)),
                l.FlipVertical(l.ImageRGB(mreaTop)),
                l.FlipVertical(l.ImageRGB(mreaBottom))
              )
            )
          )
        );
      } else {
        throw Error(`Block is missing a light face: ${name}`);
      }
    }
    blocks.push([name, createSceneFromBlock(l.ToBlock(samples))]);
  }

  return blocks;
}

function blockSceneToMesh(
  blocks: l.BlockTensor,
  blockIndex: l.BlockIndex,
  shapeIndex: l.BlockShapeIndex
) {
  const shapes = l.ToBlockShapeTensor(blocks, l.ToBlockIsomorphism(1, 0));
  const occlusions = l.ToOcclusionTensor(shapes, shapeIndex);
  const surface = l.ToSurfaceTensor(blocks, occlusions);
  const lighting = l.ToLightingBuffer(surface, shapes);
  const blockSamples = l.ToBlockSampleTensor(
    surface,
    l.EmptyDyeTensor(),
    l.EmptyMuckTensor(),
    l.EmptyMoistureTensor(),
    blockIndex
  );
  const material = l.ToMaterialBuffer(blockSamples);
  const geometry = l.ToGeometryBuffer(shapes, occlusions, shapeIndex);
  return l.ToMesh(geometry, material, lighting, l.ToAtlas(blockIndex));
}

function createSceneFromBlock(block: l.Block) {
  const id = l.ToBlockID(1);
  const scene = l.Merge(
    l.Write(
      l.EmptyTerrainTensor(),
      l.BoxMask([
        [
          [0, 0, 0],
          [16, 6, 16],
        ],
      ]),
      l.ToTerrainID(id)
    ),
    l.Write(
      l.EmptyTerrainTensor(),
      l.BoxMask([
        [
          [8, 6, 6],
          [14, 9, 15],
        ],
      ]),
      l.ToTerrainID(id)
    )
  );

  const index = l.ToBlockIndex([[id, block]], id, Object.entries(colorIDs));
  return blockSceneToMesh(l.ToBlockTensor(scene), index, shapeIndex);
}
