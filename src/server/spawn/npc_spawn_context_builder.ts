import type { SpawnResourcePaths } from "@/server/spawn/main";
import type { TerrainColumn } from "@/server/spawn/terrain_column";
import { columnPosAsMapKey } from "@/server/spawn/terrain_column";
import type { ShardId } from "@/shared/game/shard";
import { SHARD_DIM, shardEncode } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { growAABB } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { createGauge } from "@/shared/metrics/metrics";
import { allSpawnEvents, idToSpawnEvent } from "@/shared/npc/bikkie";
import type { TypedResources } from "@/shared/resources/types";
import { DefaultMap } from "@/shared/util/collections";
import { weightedRandomIndex } from "@/shared/util/helpers";

const terrainColumnsManaged = createGauge({
  name: "anima_terrain_columns_managed",
  help: "Number of terrain shard columns managed.",
});

// Shuffle an array into a random order in place.
function shuffle<T>(array: T[]) {
  for (let i = array.length - 1; i >= 0; --i) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
  }
}

// Returns a shuffled version of the input array.
function shuffled<T>(array: T[]) {
  const copy = [...array];
  shuffle(copy);
  return copy;
}

// Tracks the set of terrain shard columns we're responsible for updating, as
// well as the order they should be updated in.
class TerrainUpdateQueue {
  private terrain: Map<ReturnType<typeof columnPosAsMapKey>, TerrainColumn> =
    new Map();
  // Used to ensure that newly added terrain is updated before existing
  // terrain.
  private newTerrainQueue: Set<TerrainColumn> = new Set();

  get size() {
    return this.terrain.size;
  }

  add(terrainColumn: TerrainColumn) {
    const key = columnPosAsMapKey(terrainColumn.xzShard);
    if (!this.terrain.has(key)) {
      this.terrain.set(key, terrainColumn);
      this.newTerrainQueue.add(terrainColumn);
    }
  }

  getTerrainFromKey(key: ReturnType<typeof columnPosAsMapKey>) {
    return this.terrain.get(key);
  }

  // Loops through the terrain in order, with newly added terrain being
  // referenced first.
  next(): TerrainColumn | undefined {
    // Return newly added terrain first.
    if (this.newTerrainQueue.size > 0) {
      const next = this.newTerrainQueue.keys().next().value;
      this.newTerrainQueue.delete(next);
      return next;
    }

    if (this.terrain.size == 0) {
      return;
    }

    // Now return existing terrain.
    const [nextKey, next] = this.terrain.entries().next().value;
    // Refresh its position in the queue.
    this.terrain.delete(nextKey);
    this.terrain.set(nextKey, next);

    return next;
  }
}

class CandidateSpawnPointSampler {
  private _total = 0;
  private countByShard = new Map<ShardId, number>();

  // Adjusts the number of candidate spawn points in a particular shard.
  setCount(shardId: ShardId, count: number) {
    this._total += count - (this.countByShard.get(shardId) ?? 0);
    if (count === 0) {
      this.countByShard.delete(shardId);
    } else {
      this.countByShard.set(shardId, count);
    }
  }

  get total() {
    return this._total;
  }

  sample(): ShardId | undefined {
    if (this.countByShard.size === 0) {
      return undefined;
    }

    const entries = Array.from(this.countByShard.entries());
    const sampledIndex = weightedRandomIndex(entries.map((x) => x[1]));
    return entries[sampledIndex][0];
  }
}

// Unlike a standard "Builder" object, this object is intended to be long-lived,
// "building" many NpcSpawnContext instances over its lifetime.
export class NpcSpawnContextBuilder {
  private spawnEventCandidates = new DefaultMap<
    BiomesId,
    CandidateSpawnPointSampler
  >(() => new CandidateSpawnPointSampler());

  // Keep track of the terrain managed by this spawn service, for which we will
  // track spawn points.
  private terrainQueue = new TerrainUpdateQueue();

  constructor(
    private readonly resources: TypedResources<SpawnResourcePaths>,
    readonly ownedTerrainColumns: TerrainColumn[]
  ) {
    const metadata = resources.get("/ecs/metadata");
    // Narrow the boundaries a bit, so we don't spawn NPCs too close to the
    // edges.
    const WORLD_BOUNDS_SHRINK_AMOUNT = SHARD_DIM * 1.5;
    const npcSpawnBounds = growAABB(
      [metadata.aabb.v0, metadata.aabb.v1],
      -WORLD_BOUNDS_SHRINK_AMOUNT
    );
    const terrainColumnInBounds = (x: TerrainColumn) => {
      return (
        x.xzShard[0] * SHARD_DIM >= npcSpawnBounds[0][0] &&
        x.xzShard[0] * SHARD_DIM < npcSpawnBounds[1][0] &&
        x.xzShard[1] * SHARD_DIM >= npcSpawnBounds[0][2] &&
        x.xzShard[1] * SHARD_DIM < npcSpawnBounds[1][2]
      );
    };

    // Add the terrain in shuffled order because we process the terrain in order
    // over time, but start spawning on whatever's available right away. So
    // to avoid bias on where NPCs are spawned on server startup, make sure
    // we process the terrain in random order.
    shuffled(ownedTerrainColumns.filter(terrainColumnInBounds)).forEach((x) => {
      this.terrainQueue.add(x);
    });
    terrainColumnsManaged.set(this.terrainQueue.size);

    createGauge({
      name: "anima_candidate_spawn_points",
      help: "Potential spawn points for each spawn event.",
      labelNames: ["type"],
      collect: (gauge) => {
        for (const [spawnEventId, sampler] of this.spawnEventCandidates) {
          gauge.set({ type: idToSpawnEvent(spawnEventId).name }, sampler.total);
        }
      },
    });
  }

  terrainCount() {
    return this.terrainQueue.size;
  }

  private update(terrainColumn: TerrainColumn) {
    const columnShardHeight =
      terrainColumn.yShardRange[1] - terrainColumn.yShardRange[0];

    for (const i of Array(columnShardHeight).keys()) {
      const y = i + terrainColumn.yShardRange[0];
      const shardPos = [
        terrainColumn.xzShard[0],
        y,
        terrainColumn.xzShard[1],
      ] as Vec3;
      const shardId = shardEncode(...shardPos);

      for (const spawnEvent of allSpawnEvents()) {
        const candidates = this.resources.get(
          "/terrain/candidate_spawn_points",
          shardId,
          spawnEvent.id
        );
        this.spawnEventCandidates
          .get(spawnEvent.id)
          .setCount(shardId, candidates.length);
      }
    }
  }

  updateNext() {
    const terrainColumn = this.terrainQueue.next();
    if (!terrainColumn) {
      return;
    }

    this.update(terrainColumn);
  }

  numCandidates(spawnEventId: BiomesId) {
    return this.spawnEventCandidates.get(spawnEventId).total;
  }

  sampleCandidateSpawnPointShard(spawnEventId: BiomesId) {
    return this.spawnEventCandidates.get(spawnEventId).sample();
  }
}
