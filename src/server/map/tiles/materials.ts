import type { Array2 } from "@/cayley/numerics/arrays";
import { makeArray } from "@/cayley/numerics/arrays";
import type { MapResourceDeps } from "@/server/map/resources";
import { makeTerrainHelper } from "@/server/map/tiles/terrain";
import type { TileContext } from "@/server/map/tiles/types";
import { SHARD_DIM } from "@/shared/game/shard";

export interface Materials {
  block: Array2<"U32">;
  flora: Array2<"U32">;
  water: Array2<"U8">;
  muck: Array2<"U8">;
  dye: Array2<"U8">;
}

export async function genMaterials(
  { voxeloo, worldHelper }: TileContext,
  deps: MapResourceDeps,
  x: number,
  z: number
) {
  const [v0, _] = worldHelper.getWorldBounds();
  const terrain = makeTerrainHelper(voxeloo, deps);
  const heights = await deps.get("/tiles/heights", x, z);

  const ret = {
    block: makeArray("U32", [SHARD_DIM, SHARD_DIM]),
    flora: makeArray("U32", [SHARD_DIM, SHARD_DIM]),
    water: makeArray("U8", [SHARD_DIM, SHARD_DIM]),
    muck: makeArray("U8", [SHARD_DIM, SHARD_DIM]),
    dye: makeArray("U8", [SHARD_DIM, SHARD_DIM]),
  };
  for (let dz = 0; dz < SHARD_DIM; dz += 1) {
    for (let dx = 0; dx < SHARD_DIM; dx += 1) {
      const blockHeight = heights.block.get([dz, dx]);
      if (blockHeight > 0) {
        ret.block.set(
          [dz, dx],
          terrain.getBlockID([x + dx, v0[1] + blockHeight - 1, z + dz])
        );
        ret.dye.set(
          [dz, dx],
          terrain.getDye([x + dx, v0[1] + blockHeight - 1, z + dz])
        );
      }
      const floraHeight = heights.flora.get([dz, dx]);
      if (floraHeight > 0) {
        ret.flora.set(
          [dz, dx],
          terrain.getFloraID([x + dx, v0[1] + floraHeight - 1, z + dz])
        );
      }
      const waterHeight = heights.water.get([dz, dx]);
      if (waterHeight > 0) {
        ret.water.set(
          [dz, dx],
          terrain.getWater([x + dx, v0[1] + waterHeight - 1, z + dz])
        );
      }
      const muckHeight = Math.max(blockHeight, floraHeight, waterHeight) + 1;
      ret.muck.set(
        [dz, dx],
        terrain.getMuck([x + dx, v0[1] + muckHeight - 1, z + dz])
      );
    }
  }
  return ret;
}
