import type { BiomesRedis } from "@/server/shared/redis/connection";
import { connectToRedis } from "@/server/shared/redis/connection";
import { unpackFromRedis } from "@/server/shared/world/lua/serde";
import { RedisWorld } from "@/server/shared/world/redis";
import { biomesIdToRedisKey } from "@/server/shared/world/types";
import { BackgroundTaskController } from "@/shared/abort";
import type { ChangeToApply } from "@/shared/api/transaction";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { Create, ProposedChange } from "@/shared/ecs/change";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { countOf, createBag } from "@/shared/game/items";
import { itemBagToString } from "@/shared/game/items_serde";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import assert from "assert";
import { exec } from "child_process";
import getPort from "get-port";

export const TEST_ID = 1234 as BiomesId;

export async function runRedis(): Promise<[number, BackgroundTaskController]> {
  const controller = new BackgroundTaskController();
  if (process.env.REDIS_TESTS_PORT) {
    return [parseInt(process.env.REDIS_TESTS_PORT), controller];
  }
  const port = await getPort({ port: 9736 });
  log.info("Starting test redis instance on port", { port });
  exec(`redis-server --port ${port} --save ""`, { signal: controller.signal });
  return [port, controller];
}

export class RedisWorldTestHelper {
  constructor(
    public readonly redis: BiomesRedis,
    public readonly world: RedisWorld
  ) {}

  async setTick(tick: number) {
    await this.redis.primary.set("tick", tick);
  }

  async getTick() {
    return parseInt((await this.redis.primary.get("tick")) ?? "-1");
  }

  async getEntityAndState(id?: BiomesId) {
    id ??= TEST_ID;
    const [entity, data] = await Promise.all([
      this.world.get(id),
      this.redis.primary.getBuffer(biomesIdToRedisKey(id)),
    ]);
    return [
      entity?.materialize(),
      data && unpackFromRedis(data).slice(0, 3),
    ] as const;
  }

  async applyTransaction(changeToApply: ChangeToApply) {
    const { outcome } = await this.world.apply(changeToApply);
    return outcome === "success";
  }

  async applyChanges(...changes: ProposedChange[]) {
    return this.world.apply({ changes });
  }

  async createEntity(...entities: ReadonlyEntity[]) {
    return this.applyChanges(
      ...entities.map(
        (entity) =>
          <Create>{
            kind: "create",
            entity,
          }
      )
    );
  }
}

export async function redisInitForTests(port: number): Promise<BiomesRedis> {
  const redis = await connectToRedis({
    db: 0,
    conn: {
      kind: "tcp",
      host: "127.0.0.1",
      port,
    },
  });

  const infoString = (await redis.primary.info("server")) ?? "";
  assert.ok(
    infoString.startsWith("# Server\r\nredis_version:7.0"),
    infoString.slice(0, 100)
  );
  await redis.primary.flushall();
  return redis;
}

export async function redisBeforeEachTest(port: number) {
  const redis = await redisInitForTests(port);

  const world = new RedisWorld(await redis.loadLua());
  const helper = new RedisWorldTestHelper(redis, world);
  await helper.setTick(42);

  return [redis, world, helper] as const;
}

export async function fishItemWithLength(
  world: RedisWorld,
  userId: BiomesId,
  itemId: BiomesId,
  length: number
) {
  await world.apply(<ChangeToApply>{
    events: [
      {
        kind: "fished",
        entityId: userId,
        bag: itemBagToString(
          createBag(
            countOf(
              itemId,
              {
                [attribs.fishLength.id]: length,
              },
              1n
            )
          )
        ),
      },
    ],
  });
}
