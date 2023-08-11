import type { Array3 } from "@/cayley/numerics/arrays";
import { fillArray } from "@/cayley/numerics/arrays";
import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import type {
  MapTextureIndexData,
  TextureData,
} from "@/galois/interface/types/data";
import type { Vec3 } from "@/shared/math/types";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import assert from "assert";

export interface SampleSet {
  white: Array3<"U8">[];
  black: Array3<"U8">[];
}

export type MapTextures = Map<string, SampleSet>;

export const TEXTURE_SHAPE: Vec3 = [16, 16, 4];

export async function genTextures() {
  // Fetch the index of all of the map textures.
  const textureIndex = await jsonFetch<MapTextureIndexData>(
    resolveAssetUrl("mapping/index")
  );

  // Generate a map of all texture samples.
  const ret = new Map<string, SampleSet>();
  for (const [name, [black, white]] of textureIndex) {
    ret.set(name, {
      black: black.map((texture) => loadTexture(texture)),
      white: white.map((texture) => loadTexture(texture)),
    });
  }
  return ret;
}

function loadTexture(texture: TextureData) {
  const {
    data,
    shape: [h, w, c],
  } = texture.data;
  assert.ok(h === TEXTURE_SHAPE[0]);
  assert.ok(w === TEXTURE_SHAPE[1]);
  assert.ok([3, 4].includes(c));
  const ret = fillArray("U8", [h, w, 4], 255);
  if (c === 3) {
    ret.assign(":,:,:3", Buffer.from(data, "base64"));
  } else {
    ret.assign(":,:,:", Buffer.from(data, "base64"));
  }
  return ret;
}
