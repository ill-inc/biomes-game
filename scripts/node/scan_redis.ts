import { materializeLazyChange } from "@/server/shared/ecs/lazy";
import { connectToRedisWithLua } from "@/server/shared/redis/connection";
import { scriptInit } from "@/server/shared/script_init";
import { RedisWorld } from "@/server/shared/world/redis";
import { changedBiomesId } from "@/shared/ecs/change";
import { log } from "@/shared/logging";

export async function scanRedis() {
  await scriptInit();

  const world = new RedisWorld(await connectToRedisWithLua("ecs"));
  await world.waitForHealthy();

  let errors = 0;
  for await (const { changes, bootstrapped } of world.subscribe()) {
    for (const change of changes) {
      try {
        materializeLazyChange(change);
      } catch (error) {
        log.error(`Could not read entity: ${changedBiomesId(change)}`, {
          error,
        });
        errors++;
      }
    }
    if (bootstrapped) {
      break;
    }
  }
  await world.stop();
  if (errors > 0) {
    log.error(`Found ${errors} errors!`);
  } else {
    log.info("Scanned cleanly!");
  }
}

scanRedis();
