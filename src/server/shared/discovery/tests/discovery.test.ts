import type { ServiceDiscoveryApi } from "@/server/shared/discovery/api";
import { RedisServiceDiscovery } from "@/server/shared/discovery/redis";
import type { BiomesRedis } from "@/server/shared/redis/connection";
import {
  redisInitForTests,
  runRedis,
} from "@/server/shared/world/test/test_helpers";
import { autoId } from "@/shared/util/auto_id";
import assert from "assert";

describe("RedisServiceDiscovery", () => {
  if (process.env.REDIS_TESTS !== "1") {
    it("are being skipped as we lack env.REDIS_TESTS=1", () => {
      assert.ok(true);
    });
    return;
  }

  let port!: number;
  let controller!: AbortController;

  before(async () => {
    [port, controller] = await runRedis();
  });

  after(async () => {
    controller?.abort();
  });

  let redis!: BiomesRedis;
  let service!: string;
  let discovery!: ServiceDiscoveryApi;

  beforeEach(async () => {
    service = autoId();
    redis = await redisInitForTests(port);
    discovery = new RedisServiceDiscovery(redis, service);
  });

  afterEach(async () => {
    await discovery.stop();
    await redis.quit("test ended");
  });

  it("Starts Empty", async () => {
    assert.deepEqual(await discovery.discover(), new Set());
  });

  it("Can publish membership changes", async () => {
    const eventLog: Set<string>[] = [];
    discovery.on("change", (v) => eventLog.push(new Set(v)));

    await discovery.publish("A");

    assert.deepEqual(await discovery.discover(), new Set(["A"]));

    await discovery.unpublish();
    assert.deepEqual(eventLog, [new Set(), new Set(["A"]), new Set()]);
  });

  it("Can appropriately update with multiple members", async () => {
    const otherDiscovery = new RedisServiceDiscovery(redis, service);
    try {
      await otherDiscovery.publish("A");
      await discovery.publish("B");
      assert.deepEqual(await discovery.discover(), new Set(["A", "B"]));
    } finally {
      await otherDiscovery.stop();
    }
    assert.deepEqual(await discovery.discover(), new Set(["B"]));
  });

  it("Can scan all known services", async () => {
    const otherService = autoId();
    const otherDiscovery = new RedisServiceDiscovery(redis, otherService);
    try {
      // Publish something, no publishing means no service.
      await otherDiscovery.publish("A");
      await discovery.publish("B");
      assert.deepEqual(
        await discovery.getKnownServices(),
        new Set([service, otherService])
      );
    } finally {
      await otherDiscovery.stop();
    }
  });
});
