import { newPlayer } from "@/server/logic/utils/players";
import type { Vec3f } from "@/shared/ecs/gen/types";
import { SpatialIndex } from "@/shared/ecs/spatial/spatial_index";
import { SHARD_DIM } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";

const PROBES = 10_000;
const PLACEMENT_SHARDS = 1000;
const RADIUS = 256;
const ITEMS = 1000;

function randomPositionForItem(): Vec3f {
  return [
    Math.random() * SHARD_DIM * PLACEMENT_SHARDS * 2 -
      SHARD_DIM * PLACEMENT_SHARDS,
    Math.random() * SHARD_DIM * PLACEMENT_SHARDS * 2 -
      SHARD_DIM * PLACEMENT_SHARDS,
    Math.random() * SHARD_DIM * PLACEMENT_SHARDS * 2 -
      SHARD_DIM * PLACEMENT_SHARDS,
  ];
}

describe("Spatial index benchmarks", () => {
  let totalScanIndex!: SpatialIndex;
  let normalIndex!: SpatialIndex;
  beforeEach(async () => {
    normalIndex = new SpatialIndex(() => true, 1000);
    totalScanIndex = new SpatialIndex(() => true, Infinity);
    for (let i = 0; i < ITEMS; ++i) {
      const player = newPlayer((i + 1) as BiomesId, String(i));
      player.position.v = randomPositionForItem();
      normalIndex.update(player, undefined);
      totalScanIndex.update(player, undefined);
    }
  });

  it("Spatial index total scan", () => {
    for (let i = 0; i < PROBES; ++i) {
      Array.from(
        totalScanIndex.scanSphere(
          { center: [0, 0, 0], radius: RADIUS },
          { approx: true }
        )
      );
    }
  });

  it("Spatial index normal scan", () => {
    for (let i = 0; i < PROBES; ++i) {
      Array.from(
        normalIndex.scanSphere(
          { center: [0, 0, 0], radius: RADIUS },
          { approx: true }
        )
      );
    }
  });
});
