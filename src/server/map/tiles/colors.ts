import { positionRNG } from "@/cayley/graphics/utils";
import type { Array3 } from "@/cayley/numerics/arrays";
import { makeArray } from "@/cayley/numerics/arrays";
import type { MapResourceDeps } from "@/server/map/resources";
import type { MapTextures } from "@/server/map/tiles/textures";
import { TEXTURE_SHAPE } from "@/server/map/tiles/textures";
import { ImageBox } from "@/server/map/tiles/utils";
import { getDyeName } from "@/shared/asset_defs/blocks";
import { getTerrainName } from "@/shared/asset_defs/terrain";
import { fromBlockId, fromFloraId } from "@/shared/game/ids";
import { SHARD_DIM } from "@/shared/game/shard";
import { mapTextureKey } from "@/shared/map/textures";
import type { Vec2, Vec3 } from "@/shared/math/types";
import { createGauge } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";

export interface Colors {
  block: ImageBox;
  flora: ImageBox;
  water: ImageBox;
  muck: ImageBox;
}

export const COLORS_SHAPE: Vec3 = [
  SHARD_DIM * TEXTURE_SHAPE[0],
  SHARD_DIM * TEXTURE_SHAPE[1],
  4,
];

const mapRenderColorsTime = createGauge({
  name: "map_render_color_time_ms",
  help: "The time to render a colors tile in millis.",
  labelNames: ["kind"],
});

export async function genColors(deps: MapResourceDeps, x: number, z: number) {
  const textures = await deps.get("/textures");
  const materials = await deps.get("/tiles/materials", x, z);

  // Render textures into the output color array based on the material arrays.
  return {
    block: renderTextures("block", ([x, z]) => {
      const id = materials.block.get([z, x]);
      if (id) {
        const name = getTerrainName(fromBlockId(id));
        const muck = selectMuck(materials.muck.get([z, x]), [x, z]);
        const dye = getDyeName(materials.dye.get([z, x])) ?? "none";
        return sampleTexture(textures, mapTextureKey(name, muck, dye), [x, z]);
      }
    }),
    flora: renderTextures("flora", ([x, z]) => {
      const id = materials.flora.get([z, x]);
      if (id) {
        return sampleTexture(textures, getTerrainName(fromFloraId(id)), [x, z]);
      }
    }),
    water: renderTextures("water", ([x, z]) => {
      if (materials.water.get([z, x]) > 0) {
        return sampleTexture(textures, "water", [x, z]);
      }
    }),
    muck: renderTextures("muck", ([x, z]) => {
      if (materials.muck.get([z, x]) > 0) {
        return sampleTexture(textures, "muck", [x, z]);
      }
    }),
  };
}

function renderTextures(
  kind: string,
  sampler: (pos: Vec2) => Array3<"U8"> | undefined
) {
  const timer = new Timer();
  try {
    const ret = makeArray("U8", COLORS_SHAPE);
    for (let z = 0; z < SHARD_DIM; z += 1) {
      for (let x = 0; x < SHARD_DIM; x += 1) {
        const texture = sampler([x, z]);
        if (texture) {
          const [h, w] = TEXTURE_SHAPE;
          const [i, j] = [h * z, w * x];
          ret.assign(`${i}:${i + h},${j}:${j + w},:`, texture);
        }
      }
    }
    return ImageBox.fromArray(ret);
  } finally {
    mapRenderColorsTime.set({ kind }, timer.elapsed);
  }
}

function selectMuck(muck: number, [x, z]: Vec2) {
  // REFERENCE: src/server/gaia/growth/muck.ts:shouldBeMucked
  if (muck == 0) {
    return "none";
  } else if (muck == 1) {
    return positionRNG([x, 0, z]).get() % 3 == 0 ? "none" : "muck";
  } else {
    return "muck";
  }
}

function sampleTexture(textures: MapTextures, key: string, [x, z]: Vec2) {
  const samples = textures.get(key);
  if (samples) {
    if ((x + z) % 2 == 0) {
      return positionRNG([x, 0, z]).sample(samples.black);
    } else {
      return positionRNG([x, 0, z]).sample(samples.white);
    }
  }
}
