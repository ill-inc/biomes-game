import { resolveRange } from "@/cayley/numerics/ranges";
import type { MapResourceDeps } from "@/server/map/resources";
import type { Colors } from "@/server/map/tiles/colors";
import type { Materials } from "@/server/map/tiles/materials";
import type { Surface } from "@/server/map/tiles/surface";
import { TEXTURE_SHAPE } from "@/server/map/tiles/textures";
import {
  ImageBox,
  downsample,
  lerp,
  patch3,
  tileChildren,
} from "@/server/map/tiles/utils";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { SHARD_DIM } from "@/shared/game/shard";
import { clamp } from "@/shared/math/math";
import type { Vec2 } from "@/shared/math/types";
import { createGauge } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import { awaitSequential } from "@/shared/util/async";
import assert from "assert";

const mapGenFogTime = createGauge({
  name: "map_gen_fog_time_ms",
  help: "The time to generate an image tile in millis.",
  labelNames: ["level"],
});

const mapRenderFogTime = createGauge({
  name: "map_render_fog_time_ms",
  help: "The time to render a base image tile in millis.",
});

export async function genFog(
  deps: MapResourceDeps,
  level: number,
  u: number,
  v: number
) {
  assert.ok(level >= 0);

  // Return this tile from the preload cache if it exists.
  const preload = await deps.get("/tiles/preload", "fog", level, u, v);
  if (preload) {
    return preload;
  }

  // If the tile wasn't preloaded, then generate it recursively.
  const timer = new Timer();
  try {
    if (level === 0) {
      const shard: Vec2 = [SHARD_DIM * u, SHARD_DIM * v];
      return renderFog(
        await deps.get("/tiles/materials", ...shard),
        await deps.get("/tiles/colors", ...shard),
        await deps.get("/tiles/surface", 0, u, v)
      );
    } else {
      // Recursively generate the children tiles.
      // NOTE: We await sequentially here to avoid blowing up the event loop.
      const [c00, c01, c10, c11] = await awaitSequential(
        () => deps.get("/tiles/fog", level - 1, ...tileChildren([u, v])[0]),
        () => deps.get("/tiles/fog", level - 1, ...tileChildren([u, v])[1]),
        () => deps.get("/tiles/fog", level - 1, ...tileChildren([u, v])[2]),
        () => deps.get("/tiles/fog", level - 1, ...tileChildren([u, v])[3])
      );

      // Create a 2x2 image from the children tiles and then downsample them.
      return ImageBox.fromArray(
        downsample(patch3(c00.array(), c01.array(), c10.array(), c11.array()))
      );
    }
  } finally {
    mapGenFogTime.set({ level }, timer.elapsed);
  }
}

const MAX_MUCK = 15;

function renderFog(materials: Materials, colors: Colors, surface: Surface) {
  const timer = new Timer();
  try {
    const ret = surface.array();
    const muck = colors.muck.array();
    for (let z = 0; z < SHARD_DIM; z += 1) {
      for (let x = 0; x < SHARD_DIM; x += 1) {
        const [h, w] = TEXTURE_SHAPE;
        const [i, j] = [h * z, w * x];
        const range = resolveRange(ret.shape, `${i}:${i + h},${j}:${j + w},:`);

        // Check if the surface is road.
        const isRoad = materials.block.get([z, x]) == getTerrainID("gravel");

        // Blend muck on top based on the depth.
        const muckAmount = materials.muck.get([z, x]);
        if (muckAmount > 0) {
          const t = clamp(muckAmount / MAX_MUCK, 0, isRoad ? 14 / 15 : 1);
          ret.assign(range, lerp(ret.slice(range), muck.slice(range), t));
        }
      }
    }

    return ImageBox.fromArray(ret);
  } finally {
    mapRenderFogTime.set(timer.elapsed);
  }
}
