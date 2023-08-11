import type { Election } from "@/server/shared/election/api";
import { RedisElection } from "@/server/shared/election/redis";
import type { BiomesRedis } from "@/server/shared/redis/connection";
import {
  redisInitForTests,
  runRedis,
} from "@/server/shared/world/test/test_helpers";
import { BackgroundTaskController } from "@/shared/abort";
import { Latch, yieldToOthers } from "@/shared/util/async";
import { autoId } from "@/shared/util/auto_id";
import assert, { ok } from "assert";

describe("RedisElection", () => {
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
  let campaign!: `test:${string}`;
  let election!: Election;

  beforeEach(async () => {
    campaign = `test:${autoId()}`;

    redis = await redisInitForTests(port);
    election = new RedisElection(redis, campaign);
  });

  afterEach(async () => {
    await redis.quit("test ended");
  });

  it("Is not leader by default", () => {
    ok(!election.isLeader);
  });

  it("Can become leader", async () => {
    const controller = new BackgroundTaskController();
    const latch = new Latch();

    controller.runInBackground("test", async (signal) => {
      await election.waitUntilElected(
        "test-value",
        async (signal) => {
          while (await yieldToOthers(signal)) {
            latch.signal();
          }
        },
        signal
      );
    });

    await latch.wait();
    ok(election.isLeader);
    await controller.abortAndWait();
    ok(!election.isLeader);
  });

  it("Only permits one leader at a time", async () => {
    const otherElection = new RedisElection(redis, campaign);

    ok(!election.isLeader);
    ok(!otherElection.isLeader);

    const controller = new BackgroundTaskController();
    const latch = new Latch();

    controller.runInBackground("test", async (signal) => {
      await election.waitUntilElected(
        "test-value",
        async (signal) => {
          while (await yieldToOthers(signal)) {
            latch.signal();
          }
        },
        signal
      );
    });

    await latch.wait();
    ok(election.isLeader);
    ok(!otherElection.isLeader);

    const otherController = new BackgroundTaskController();
    const otherStartLatch = new Latch();
    const otherLatch = new Latch();
    otherController.runInBackground("other-test", async (signal) => {
      otherStartLatch.signal();
      await otherElection.waitUntilElected(
        "test-value",
        async (signal) => {
          while (await yieldToOthers(signal)) {
            otherLatch.signal();
          }
        },
        signal
      );
    });

    await otherStartLatch.wait();
    ok(election.isLeader);
    ok(!otherElection.isLeader);

    await controller.abortAndWait();
    await otherLatch.wait();

    ok(!election.isLeader);
    ok(otherElection.isLeader);

    await otherController.abortAndWait();

    ok(!election.isLeader);
    ok(!otherElection.isLeader);
  });
});
