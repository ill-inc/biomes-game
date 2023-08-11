import { SHARD_DIM, shardAlign } from "@/shared/game/shard";
import { log } from "@/shared/logging";
import type { TilePos } from "@/shared/map/types";
import type {
  ReadonlyAABB,
  ReadonlyVec2,
  ReadonlyVec3,
  Vec2,
  Vec3,
} from "@/shared/math/types";
import { createGauge } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import type { Resolve } from "@/shared/resources/types";
import { nextImmediate, safeSetImmediate } from "@/shared/util/async";
import { DefaultMap } from "@/shared/util/collections";

const mapLoopTime = createGauge({
  name: "map_loop_time_ms",
  help: "The time to execute a loop tick in millis.",
  labelNames: ["name"],
});

export interface CloseAndWait {
  close(): Promise<void>;
}

export function loop(name: string, fn: () => Promise<void>): CloseAndWait {
  let closed = false;
  const finished = new Promise<void>((resolve) => {
    const schedule = () => {
      const timer = new Timer();
      safeSetImmediate(() => {
        fn()
          .then(() => {
            if (!closed) {
              mapLoopTime.set({ name }, timer.elapsed);
              setTimeout(schedule);
            } else {
              resolve();
            }
          })
          .catch((error) => {
            log.error("Uncaught exception inside map loop", {
              error,
            });
          });
      });
    };
    schedule();
  });
  return {
    close: () => {
      closed = true;
      return finished;
    },
  };
}

export class LoopTimer {
  prev?: number;

  constructor(private fn: (durationMs: number) => void) {}

  tick() {
    const now = performance.now();
    if (this.prev) {
      this.fn(now - this.prev);
    }
    this.prev = now;
  }
}

export function mortonSort(points: Vec2[]) {
  const lessMsb = (x: number, y: number) => {
    return x > y && y < (x ^ y) >>> 0;
  };
  return points.sort((a, b) => {
    const [x0, y0] = [a[0] >>> 0, a[1] >>> 0];
    const [x1, y1] = [b[0] >>> 0, b[1] >>> 0];
    if (lessMsb((x0 ^ x1) >>> 0, (y0 ^ y1) >>> 0)) {
      return x0 < x1 ? -1 : x0 > x1 ? 1 : 0;
    } else {
      return y0 < y1 ? -1 : y0 > y1 ? 1 : 0;
    }
  });
}

export function randomRotate<T>(values: T[]) {
  const pivot = Math.floor(Math.random() * values.length);
  return [...values.slice(pivot), ...values.slice(0, pivot)];
}

export function worldToTilePos([x, z]: ReadonlyVec2): TilePos {
  return [Math.floor(x / SHARD_DIM), Math.floor(z / SHARD_DIM)];
}

export function worldLeafTiles([v0, v1]: ReadonlyAABB) {
  const tiles: TilePos[] = [];
  for (let z = v0[2]; z < v1[2]; z += SHARD_DIM) {
    for (let x = v0[0]; x < v1[0]; x += SHARD_DIM) {
      tiles.push(worldToTilePos([x, z]));
    }
  }
  return randomRotate(mortonSort(tiles));
}

export function yielding<A extends [...any], T>(fn: (...args: A) => T) {
  return async (...args: A) => {
    return nextImmediate().then(() => fn(...args) as Resolve<T>);
  };
}

export function shardKey([x, y, z]: ReadonlyVec3) {
  return `${x}:${y}:${z}`;
}

export function columnKey([x, _, z]: ReadonlyVec3) {
  return `${x}:${z}`;
}

export class ColumnBatcher {
  private batches = new DefaultMap<string, Map<string, Vec3>>(() => new Map());
  constructor() {}

  add([x, y, z]: ReadonlyVec3) {
    const pos = shardAlign(x, y, z);
    const batch = this.batches.get(columnKey(pos));
    batch.set(shardKey(pos), [...pos]);
  }

  addBatch(batch: Vec3[]) {
    for (const pos of batch) {
      this.add(pos);
    }
  }

  *drain() {
    for (const [key, column] of Array.from(this.batches)) {
      this.batches.delete(key);
      if (column.size > 0) {
        const [x, _, z] = column.values().next().value as Vec3;
        yield [key, [x, z], Array.from(column.values())] as const;
      }
    }
  }
}
