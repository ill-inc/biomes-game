import { connectToRedisWithLua } from "@/server/shared/redis/connection";
import { scriptInit } from "@/server/shared/script_init";
import { RedisWorld } from "@/server/shared/world/redis";
import { log } from "@/shared/logging";
import { Timer } from "@/shared/metrics/timer";
import { EntityStats } from "@/shared/stats";

// Script to sample ECS change log stream and print stats about ti.
// Usage: ./b script ecs
// It will connect to a 'local' Redis instance by default, or you can do
// > kubectl port-forward redis-0 6379
// To connect to prod.
export async function listenToEcs() {
  await scriptInit();

  const controller = new AbortController();
  const gracefulShutdown = () => {
    log.warn("Shutting down subscription...");
    controller.abort();
    log.warn("Done!");
  };
  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);

  const world = new RedisWorld(await connectToRedisWithLua("ecs"));

  log.warn("Starting subscription!");
  const stats = new EntityStats();
  let deletes = 0;
  const timer = new Timer();
  for await (const { changes } of world.subscribe(
    { skipBootstrap: true },
    controller.signal
  )) {
    if (stats.totalEntities === 0) {
      // Only count from when we got changes.
      timer.reset();
    }
    for (const change of changes) {
      if (change.kind === "delete") {
        deletes++;
      } else {
        stats.observe(change.entity.materialize());
      }
    }
  }
  stats.finalize();
  log.info(`Stats (over ${(timer.elapsed / 1000).toFixed(2)}):\n${stats}`);
  gracefulShutdown();
  process.exit(0);
}

listenToEcs();
