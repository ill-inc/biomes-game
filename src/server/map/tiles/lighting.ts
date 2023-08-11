import {
  renderAlphaMap,
  toAmbientOcclusion,
  toShadows,
} from "@/cayley/graphics/mapping";
import type { Array2 } from "@/cayley/numerics/arrays";
import { makeArray } from "@/cayley/numerics/arrays";
import type { MapResourceDeps } from "@/server/map/resources";
import { ImageBox } from "@/server/map/tiles/utils";
import { SHARD_DIM } from "@/shared/game/shard";
import { createGauge } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";

const mapLightingTime = createGauge({
  name: "map_gen_lighting_time_ms",
  help: "The time to generate a lighting tile in millis.",
});

export type Occlusions = Array2<"I32">;
export type Lighting = ImageBox;

const DPI = 16;
const SHADOW_PARAMS = {
  lightDir: [-1.0, 2.0, -1.0] as const,
  jitter: 0.2,
  sampleDistance: 48,
  sampleCount: 32,
};

export async function genOcclusions(
  deps: MapResourceDeps,
  x: number,
  z: number
) {
  const heights = await deps.get("/tiles/heights", x, z);
  return heights.block.view().max(heights.flora.view()).eval();
}

export async function genLighting(deps: MapResourceDeps, x: number, z: number) {
  const timer = new Timer();
  try {
    // Fetch the local occlusion map and all neighboring maps.
    const [x0, x1, x2] = [x - SHARD_DIM, x, x + SHARD_DIM];
    const [z0, z1, z2] = [z - SHARD_DIM, z, z + SHARD_DIM];
    const m00 = await deps.get("/tiles/occlusions", x0, z0);
    const m10 = await deps.get("/tiles/occlusions", x1, z0);
    const m20 = await deps.get("/tiles/occlusions", x2, z0);
    const m01 = await deps.get("/tiles/occlusions", x0, z1);
    const m11 = await deps.get("/tiles/occlusions", x1, z1);
    const m21 = await deps.get("/tiles/occlusions", x2, z1);
    const m02 = await deps.get("/tiles/occlusions", x0, z2);
    const m12 = await deps.get("/tiles/occlusions", x1, z2);
    const m22 = await deps.get("/tiles/occlusions", x2, z2);

    // Stich all of the maps together into one final occlusion map.
    const [i0, i1, i2, i3] = [0, SHARD_DIM, 2 * SHARD_DIM, 3 * SHARD_DIM];
    const [j0, j1, j2, j3] = [0, SHARD_DIM, 2 * SHARD_DIM, 3 * SHARD_DIM];
    const occlusions = makeArray("I32", [3 * SHARD_DIM, 3 * SHARD_DIM]);
    occlusions.assign(`${i0}:${i1},${j0}:${j1}`, m00);
    occlusions.assign(`${i0}:${i1},${j1}:${j2}`, m10);
    occlusions.assign(`${i0}:${i1},${j2}:${j3}`, m20);
    occlusions.assign(`${i1}:${i2},${j0}:${j1}`, m01);
    occlusions.assign(`${i1}:${i2},${j1}:${j2}`, m11);
    occlusions.assign(`${i1}:${i2},${j2}:${j3}`, m21);
    occlusions.assign(`${i2}:${i3},${j0}:${j1}`, m02);
    occlusions.assign(`${i2}:${i3},${j1}:${j2}`, m12);
    occlusions.assign(`${i2}:${i3},${j2}:${j3}`, m22);

    // Generate the ambient occlusion map and the shadow map.
    // NOTE: We dampen each components intensity to the range [0.5, 1.0].
    // TODO: Optimize these routines by giving them a viewport.
    const ambientOcclusion = toAmbientOcclusion(occlusions)
      .view()
      .cast("F32")
      .div(255)
      .mul(0.5)
      .add(0.5);
    const shadows = toShadows(occlusions, SHADOW_PARAMS)
      .view()
      .cast("F32")
      .div(255)
      .mul(0.5)
      .add(0.5);
    const alpha = ambientOcclusion.mul(shadows).mul(255).cast("U8").eval();

    // Render the lighting components to an image of alpha values.
    const [v0, v1] = [DPI * SHARD_DIM, 2 * DPI * SHARD_DIM];
    const [u0, u1] = [DPI * SHARD_DIM, 2 * DPI * SHARD_DIM];
    return ImageBox.fromArray(
      renderAlphaMap(alpha, DPI).slice(`${v0}:${v1},${u0}:${u1},:`)
    );
  } finally {
    mapLightingTime.set(timer.elapsed);
  }
}
