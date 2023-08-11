import { makeArray } from "@/cayley/numerics/arrays";
import { resolveRange } from "@/cayley/numerics/ranges";
import type { MapResourceDeps } from "@/server/map/resources";
import type { Colors } from "@/server/map/tiles/colors";
import { COLORS_SHAPE } from "@/server/map/tiles/colors";
import type { Heights } from "@/server/map/tiles/heights";
import type { Lighting } from "@/server/map/tiles/lighting";
import { TEXTURE_SHAPE } from "@/server/map/tiles/textures";
import {
  ImageBox,
  downsample,
  lerp,
  patch3,
  tileChildren,
} from "@/server/map/tiles/utils";
import { SHARD_DIM } from "@/shared/game/shard";
import { clamp } from "@/shared/math/math";
import type { Vec2, Vec3 } from "@/shared/math/types";
import { createGauge } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import { awaitSequential } from "@/shared/util/async";
import assert from "assert";

const mapGenSurfaceTime = createGauge({
  name: "map_gen_surface_time_ms",
  help: "The time to generate an surface tile in millis.",
  labelNames: ["level"],
});

const mapRenderSurfaceTime = createGauge({
  name: "map_render_surface_time_ms",
  help: "The time to render a base surface tile in millis.",
});

export const SURFACE_SHAPE: Vec3 = [...COLORS_SHAPE];
export type Surface = ImageBox;

export async function genSurface(
  deps: MapResourceDeps,
  level: number,
  u: number,
  v: number
) {
  assert.ok(level >= 0);

  // Return this tile from the preload cache if it exists.
  const preload = await deps.get("/tiles/preload", "surface", level, u, v);
  if (preload) {
    return preload;
  }

  // If the tile wasn't preloaded, then generate it recursively.
  const timer = new Timer();
  try {
    if (level === 0) {
      const shard: Vec2 = [SHARD_DIM * u, SHARD_DIM * v];
      return renderSurface(
        await deps.get("/tiles/heights", ...shard),
        await deps.get("/tiles/lighting", ...shard),
        await deps.get("/tiles/colors", ...shard)
      );
    } else {
      // Recursively generate the children tiles.
      // NOTE: We await sequentially here to avoid blowing up the event loop.
      const [c00, c01, c10, c11] = await awaitSequential(
        () => deps.get("/tiles/surface", level - 1, ...tileChildren([u, v])[0]),
        () => deps.get("/tiles/surface", level - 1, ...tileChildren([u, v])[1]),
        () => deps.get("/tiles/surface", level - 1, ...tileChildren([u, v])[2]),
        () => deps.get("/tiles/surface", level - 1, ...tileChildren([u, v])[3])
      );

      // Create a 2x2 image from the children tiles and then downsample them.
      return ImageBox.fromArray(
        downsample(patch3(c00.array(), c01.array(), c10.array(), c11.array()))
      );
    }
  } finally {
    mapGenSurfaceTime.set({ level }, timer.elapsed);
  }
}

function renderSurface(heights: Heights, lighting: Lighting, colors: Colors) {
  const timer = new Timer();
  try {
    const block = colors.block.array();
    const flora = colors.flora.array();
    const water = colors.water.array();

    // Darken the block and flora colors.
    const light = lighting.array().view().cast("F32").div(255);
    block.assign(
      ":,:,:3",
      block.slice(":,:,:3").view().cast("F32").mul(light).cast("U8")
    );
    flora.assign(
      ":,:,:3",
      flora.slice(":,:,:3").view().cast("F32").mul(light).cast("U8")
    );

    const ret = makeArray("U8", SURFACE_SHAPE);
    for (let z = 0; z < SHARD_DIM; z += 1) {
      for (let x = 0; x < SHARD_DIM; x += 1) {
        const [h, w] = TEXTURE_SHAPE;
        const [i, j] = [h * z, w * x];
        const range = resolveRange(ret.shape, `${i}:${i + h},${j}:${j + w},:`);

        // Sample all height values.
        const blockHeight = heights.block.get([z, x]);
        const floraHeight = heights.flora.get([z, x]);
        const waterHeight = heights.water.get([z, x]);

        // Render either block or flora texture, whichever is higher.
        if (blockHeight > floraHeight) {
          ret.assign(range, block.slice(range));
        } else {
          ret.assign(range, flora.slice(range));
        }

        // Blend water on top based on the depth.
        const waterDepth = waterHeight - Math.max(blockHeight, floraHeight);
        if (waterDepth > 0) {
          const t = clamp(0.1 * waterDepth, 0, 1);
          ret.assign(range, lerp(ret.slice(range), water.slice(range), t));
        }
      }
    }

    return ImageBox.fromArray(ret);
  } finally {
    mapRenderSurfaceTime.set(timer.elapsed);
  }
}
