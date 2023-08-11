import {
  loadBakedTrayFromProd,
  loadTrayDefinitionFromProd,
} from "@/server/shared/bikkie/dev";
import { RedisBikkieStorage } from "@/server/shared/bikkie/storage/redis";
import { SyncBootstrap } from "@/server/shared/bootstrap/sync";
import {
  connectToRedis,
  connectToRedisWithLua,
} from "@/server/shared/redis/connection";
import { scriptInit } from "@/server/shared/script_init";
import { RedisWorld } from "@/server/shared/world/redis";
import { Timer, TimerNeverSet } from "@/shared/metrics/timer";
import { chunk } from "lodash";

export async function bootstrapRedis() {
  await scriptInit();

  console.log("Loading from sync bootstrap...");
  const bootstrap = new SyncBootstrap();
  const [changes] = await bootstrap.load();

  console.log(`Loaded ${changes.length} changes, placing into redis.`);

  const storage = new RedisBikkieStorage(await connectToRedis("bikkie"));
  await loadTrayDefinitionFromProd(storage);
  await storage.save(await loadBakedTrayFromProd());

  const world = new RedisWorld(await connectToRedisWithLua("ecs"));
  await world.waitForHealthy();

  const timer = new Timer();
  const lastMessage = new Timer(TimerNeverSet);
  let processed = 0;

  const printStatus = () => {
    console.log(
      `Processed ${processed} changes, at ${
        (processed / timer.elapsed) * 1000
      } changes/s`
    );
    lastMessage.reset();
  };

  for (const batch of chunk(changes, CONFIG.redisMaxKeysPerBatch - 1)) {
    await world.apply({ changes: batch });
    processed += batch.length;
    if (lastMessage.elapsed > 5000) {
      printStatus();
    }
  }

  printStatus();
  await world.stop();
  console.log("Done!");
}

bootstrapRedis();
