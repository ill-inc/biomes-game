import type { Array2 } from "@/cayley/numerics/arrays";
import { fromBuffer } from "@/cayley/numerics/arrays";
import type { MapResourceDeps } from "@/server/map/resources";
import type { TileContext } from "@/server/map/tiles/types";
import { SHARD_DIM } from "@/shared/game/shard";
import { createGauge } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";

const mapGenHeightsTime = createGauge({
  name: "map_gen_heights_time_ms",
  help: "The time to generate a heights tile in millis.",
});

export interface Heights {
  block: Array2<"I32">;
  flora: Array2<"I32">;
  water: Array2<"I32">;
  muck: Array2<"I32">;
}

export function genHeights(
  { worldHelper, voxeloo }: TileContext,
  deps: MapResourceDeps,
  x: number,
  z: number
) {
  const timer = new Timer();
  const config = deps.get("/config");
  const [v0, v1] = worldHelper.getWorldBounds();
  const builder = new voxeloo.MapHeightsBuilder(
    [x, v0[1], z],
    [SHARD_DIM, SHARD_DIM],
    config.blockFilter,
    config.floraFilter
  );
  try {
    for (let y = v0[1]; y < v1[1]; y += SHARD_DIM) {
      const terrain = deps.get("/world/terrain", x, y, z);
      if (terrain) {
        builder.loadTerrain([x, y, z], terrain.cpp);
      }

      const water = deps.get("/world/water", x, y, z);
      if (water) {
        builder.loadWater([x, y, z], water.cpp);
      }

      const muck = deps.get("/world/muck", x, y, z);
      if (muck) {
        builder.loadMuck([x, y, z], muck.cpp);
      }
    }

    const heights = builder.build();
    try {
      return {
        block: fromBuffer("I32", [SHARD_DIM, SHARD_DIM], heights.block()),
        flora: fromBuffer("I32", [SHARD_DIM, SHARD_DIM], heights.flora()),
        water: fromBuffer("I32", [SHARD_DIM, SHARD_DIM], heights.water()),
        muck: fromBuffer("I32", [SHARD_DIM, SHARD_DIM], heights.muck()),
      };
    } finally {
      heights.delete();
    }
  } finally {
    builder.delete();
    mapGenHeightsTime.set(timer.elapsed);
  }
}
