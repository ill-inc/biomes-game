import { RESERVED_GREMLIN_IDS } from "@/server/gizmo/reserved_ids";
import { connectToRedis } from "@/server/shared/redis/connection";
import { scriptInit } from "@/server/shared/script_init";
import { biomesIdToRedisKey } from "@/server/shared/world/types";
import { BackgroundTaskController } from "@/shared/abort";

export async function cleanRedisLeaderboard() {
  await scriptInit();

  const redis = await connectToRedis("ecs");

  const keys = await redis.primary.keys("leaderboard:*");
  const controller = new BackgroundTaskController();

  const allGremlinKeys = RESERVED_GREMLIN_IDS.map((id) =>
    biomesIdToRedisKey(id)
  );

  for (const key of keys) {
    controller.runInBackground(key, () =>
      redis.primary.zrem(key, ...allGremlinKeys)
    );
  }

  await controller.wait();
  await redis.quit("Script exit");
  console.log("Done!");
}

cleanRedisLeaderboard();
