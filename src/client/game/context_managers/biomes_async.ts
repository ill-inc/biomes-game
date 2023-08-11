import type { ClientContext } from "@/client/game/context";
import type { Camera } from "@/client/game/resources/camera";
import type { ClientResources } from "@/client/game/resources/types";
import { SHARD_RADIUS } from "@/shared/game/shard";
import { distSq } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import type { TaskPriorityQueueOptions } from "@/shared/util/async";
import { TaskPriorityQueue } from "@/shared/util/async";
import { makeCvalHook } from "@/shared/util/cvals";

const PRIORITIES = ["low", "default", "high", "critical"] as const;
const PRIORITIES_MAP = new Map(PRIORITIES.map((p, i) => [p, i]));
export type Priority = (typeof PRIORITIES)[number];

// This is chosen to be a bit more than the radius of a shard so that changes
// in shards directly adjacent to the player are always processed first.
// This for example helps with terrain edit latency.
const VERY_HIGH_PRI_DIST_SQ = (SHARD_RADIUS + 3) ** 2;

export function priorityForPosition(camera: Camera, position: Vec3) {
  const dSq = distSq(camera.three.position.toArray(), position);
  if (dSq < VERY_HIGH_PRI_DIST_SQ) {
    return "critical";
  } else if (dSq < 96 * 96) {
    return "high";
  } else if (dSq < 196 * 196) {
    return "default";
  } else {
    return "low";
  }
}

export type YieldFn = () => Promise<void>;

export class BiomesAsync {
  private taskQueue: TaskPriorityQueue;

  constructor(
    private resources: ClientResources,
    options?: Partial<TaskPriorityQueueOptions>
  ) {
    this.taskQueue = new TaskPriorityQueue(
      PRIORITIES.map((x, i) => i),
      options
    );

    PRIORITIES.forEach((x) => {
      makeCvalHook({
        path: ["async", "pendingTaskCountByPriority", x],
        help: `Number of Async tasks with priority "${x}".`,
        collect: () => {
          return this.taskQueue.numPendingTasks(PRIORITIES_MAP.get(x)!);
        },
      });
    });
  }

  hotHandoff(old: BiomesAsync) {
    this.taskQueue = old.taskQueue;
  }

  async runWithPriorityFn<T>(
    fn: (yieldTask: YieldFn) => T,
    priorityFn: () => Priority
  ) {
    return this.taskQueue.queueTask(
      fn,
      () => PRIORITIES_MAP.get(priorityFn())!
    );
  }

  async runWithPriority<T>(priority: Priority, fn: (yieldTask: YieldFn) => T) {
    return this.runWithPriorityFn(fn, () => priority);
  }

  async runWithPosition<T>(position: Vec3, fn: (yieldTask: YieldFn) => T) {
    return this.runWithPriorityFn(fn, () => {
      return priorityForPosition(this.resources.get("/scene/camera"), position);
    });
  }

  async run<T>(fn: (yieldTask: YieldFn) => T) {
    return this.runWithPriority("default", fn);
  }
}

export async function loadAsync(loader: RegistryLoader<ClientContext>) {
  const [resources, clientConfig] = await Promise.all([
    loader.get("resources"),
    loader.get("clientConfig"),
  ]);
  return new BiomesAsync(resources, {
    // On lower end machines, run less tasks per frame to reduce stuttering.
    maxTaskCount: (() => {
      switch (clientConfig.gpuTier) {
        case 0:
          return 1;
        case 1:
          return 2;
        default:
          return 3;
      }
    })(),
  });
}
