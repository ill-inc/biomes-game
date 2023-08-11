import type {
  DistributedNotifierKey,
  Notifier,
} from "@/server/shared/distributed_notifier/api";
import { RedisNotifier } from "@/server/shared/distributed_notifier/redis";
import {
  ShimNotifier,
  ShimNotifierService,
  zShimNotifierService,
} from "@/server/shared/distributed_notifier/shim";
import {
  redisInitForTests,
  runRedis,
} from "@/server/shared/world/test/test_helpers";
import { makeClientFromImplementation } from "@/server/shared/zrpc/server";
import { Delayed, Semaphore, yieldToOthers } from "@/shared/util/async";
import assert, { ok } from "assert";

const TEST_NOTIFIER_KEY = "bikkie";

function notifierTests(
  createNotifier: (
    key: DistributedNotifierKey
  ) => Promise<[Notifier, () => Promise<void>]>
) {
  let notifier!: Notifier;
  let cleanup!: () => Promise<void>;

  beforeEach(async () => {
    [notifier, cleanup] = await createNotifier(TEST_NOTIFIER_KEY);
  });

  afterEach(async () => {
    await cleanup();
  });

  it("should be constructible", async () => {
    ok(notifier);
  });

  it("should emit change events", async () => {
    let events = 0;
    const sem = new Semaphore();
    notifier.on("change", () => {
      events++;
      sem.release();
    });
    await yieldToOthers();
    assert.equal(events, 0);

    await notifier.notify("foo");
    await sem.acquire();
    assert.equal(events, 1);

    await notifier.notify("bar");
    await sem.acquire();
    assert.equal(events, 2);
  });

  it("should give you the value if listening late", async () => {
    await notifier.notify("foo");
    await yieldToOthers();

    const got = new Delayed<string>();
    notifier.on("change", (value) => got.resolve(value));
    assert.equal(await got.wait(), "foo");
  });
}

describe("ShimNotifier", () => {
  notifierTests(async (key) => {
    const impl = new ShimNotifierService();
    const client = makeClientFromImplementation(zShimNotifierService, impl);
    const notifier = new ShimNotifier(client, key);
    return [
      notifier,
      async () => {
        await notifier.stop();
        await client.close();
        await impl.stop();
      },
    ];
  });
});

describe("RedisNotifier", () => {
  if (process.env.REDIS_TESTS === "1") {
    let port!: number;
    let controller!: AbortController;

    before(async () => {
      [port, controller] = await runRedis();
    });

    after(async () => {
      controller?.abort();
    });

    notifierTests(async (key) => {
      const redis = await redisInitForTests(port);
      const notifier = new RedisNotifier(key, redis);
      return [notifier, () => notifier.stop()];
    });
  } else {
    it("are being skipped as we lack env.REDIS_TESTS=1", () => {
      assert.ok(true);
    });
  }
});
