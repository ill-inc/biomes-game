import type { PubSub } from "@/server/shared/pubsub/api";
import { RedisPubSub } from "@/server/shared/pubsub/redis";
import {
  ShimPubSubService,
  ShimPubsub,
  zShimPubSubService,
} from "@/server/shared/pubsub/shim";
import {
  redisInitForTests,
  runRedis,
} from "@/server/shared/world/test/test_helpers";
import { makeClientFromImplementation } from "@/server/shared/zrpc/server";
import { Semaphore, yieldToOthers } from "@/shared/util/async";
import assert, { ok } from "assert";

function pubSubTests(
  createPubSub: () => Promise<[PubSub<"test">, () => Promise<void>]>
) {
  let pubsub!: PubSub<"test">;
  let cleanup!: () => Promise<void>;

  beforeEach(async () => {
    [pubsub, cleanup] = await createPubSub();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("should be constructible", async () => {
    ok(pubsub);
  });

  it("should emit change events", async () => {
    const sem = new Semaphore();
    pubsub.on(() => sem.release());
    await yieldToOthers();
    assert.ok(!sem.tryAcquire());

    while (!sem.tryAcquire()) {
      await pubsub.publish("foo");
    }
    while (!sem.tryAcquire()) {
      await pubsub.publish("bar");
    }
  });
}

describe("ShimPubSub", () => {
  pubSubTests(async () => {
    const impl = new ShimPubSubService();
    const client = makeClientFromImplementation(zShimPubSubService, impl);
    const pubsub = new ShimPubsub(client, "test");
    return [
      pubsub,
      async () => {
        await pubsub.stop();
        await client.close();
        await impl.stop();
      },
    ];
  });
});

describe("RedisPubSub", () => {
  if (process.env.REDIS_TESTS === "1") {
    let port!: number;
    let controller!: AbortController;

    before(async () => {
      [port, controller] = await runRedis();
    });

    after(async () => {
      controller?.abort();
    });

    pubSubTests(async () => {
      const redis = await redisInitForTests(port);
      const pubsub = new RedisPubSub("test", redis);
      return [pubsub, () => pubsub.stop()];
    });
  } else {
    it("are being skipped as we lack env.REDIS_TESTS=1", () => {
      assert.ok(true);
    });
  }
});
