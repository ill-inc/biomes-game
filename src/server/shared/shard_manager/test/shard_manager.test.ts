import { updateGlobalConfig } from "@/server/shared/config";
import type { DistributedNotifierKey } from "@/server/shared/distributed_notifier/api";
import {
  ShimNotifier,
  ShimNotifierService,
  zShimNotifierService,
} from "@/server/shared/distributed_notifier/shim";
import { FakeElection } from "@/server/shared/election/fake";
import type {
  ShardDomainConfig,
  ShardManager,
  ShardManagerDomain,
} from "@/server/shared/shard_manager/api";
import { FakeShardManager } from "@/server/shared/shard_manager/fake";
import {
  BalancerServiceImpl,
  ServiceShardManager,
  zBalancerService,
} from "@/server/shared/shard_manager/service";
import { makeClientFromImplementation } from "@/server/shared/zrpc/server";
import { ConditionVariable } from "@/shared/util/async";
import { autoId } from "@/shared/util/auto_id";
import assert from "assert";

interface TestShardManagerContext {
  setTotalShards: (shards: number) => void;
  manager: ShardManager;
  heldChanged: ConditionVariable;
  stopped: boolean;
}

async function waitForSumSize(
  shardManagers: TestShardManagerContext[],
  checkFn: number | ((size: number) => boolean)
) {
  if (typeof checkFn === "number") {
    const target = checkFn;
    checkFn = (sum) => sum === target;
  }
  const currentSum = () =>
    shardManagers.reduce((sum, sm) => sum + sm.manager.held.size, 0);
  while (!checkFn(currentSum())) {
    await Promise.race(shardManagers.map((sm) => sm.heldChanged.wait()));
  }
}

async function waitForSize(
  shardManager: TestShardManagerContext,
  size: number | ((size: number) => boolean)
) {
  await waitForSumSize([shardManager], size);
}

function checkNoOverlappingShards(shardManagers: TestShardManagerContext[]) {
  const seen = new Set<number>();
  for (const shardManager of shardManagers) {
    for (const index of shardManager.manager.held) {
      assert(!seen.has(index));
      seen.add(index);
    }
  }
}

function singleShardManagerTests(context: () => TestShardManagerContext) {
  it("takeAndRelease singular", async () => {
    const shardManager = context();
    assert.equal(shardManager.manager.held.size, 0);
    shardManager.setTotalShards(2);
    await shardManager.manager.start();

    await waitForSize(shardManager, 2);
    await shardManager.manager.stop();
    await waitForSize(shardManager, 0);
  });

  it("growAndShrinkPoolSize singular", async () => {
    const shardManager = context();
    assert.equal(shardManager.manager.held.size, 0);
    await shardManager.manager.start();

    await waitForSize(shardManager, 5);

    shardManager.setTotalShards(15);
    await waitForSize(shardManager, 15);

    shardManager.setTotalShards(4);
    await waitForSize(shardManager, 4);

    shardManager.setTotalShards(12);
    await waitForSize(shardManager, 12);
  });
}

function twinShardManagerTests(
  context1: () => TestShardManagerContext,
  context2: () => TestShardManagerContext
) {
  it("takeAndRelease", async () => {
    const shardManager1 = context1();
    const shardManager2 = context2();

    // Only one is started, so take all the shards
    assert(shardManager1.manager.held.size === 0);
    await shardManager1.manager.start();
    await waitForSize(shardManager1, 5);

    // Start empty.
    assert(shardManager2.manager.held.size === 0);
    await shardManager2.manager.start();

    // Once both started, share all the shards.
    await waitForSumSize([shardManager1, shardManager2], 5);
    await waitForSize(shardManager1, (x) => x > 0);
    await waitForSize(shardManager2, (x) => x > 0);
    checkNoOverlappingShards([shardManager1, shardManager2]);

    // When one shuts down, the other takes the load.
    await shardManager1.manager.stop();
    await waitForSize(shardManager1, 0);
    await waitForSize(shardManager2, 5);
  }).retries(3); // Add retries to flakey test.

  it("shrinkingPool", async () => {
    const shardManager1 = context1();
    const shardManager2 = context2();
    await shardManager1.manager.start();
    await shardManager2.manager.start();
    await waitForSumSize([shardManager1, shardManager2], 5);

    // When the pool size shrinks to 2, no shard manager should contain
    // shards greater than 2.
    shardManager1.setTotalShards(2);
    await waitForSumSize([shardManager1, shardManager2], 2);
  });

  it("growingPool", async () => {
    const shardManager1 = context1();
    const shardManager2 = context2();
    await shardManager1.manager.start();
    await shardManager2.manager.start();
    await waitForSumSize([shardManager1, shardManager2], 5);

    shardManager1.setTotalShards(20);
    await waitForSumSize([shardManager1, shardManager2], 20);

    checkNoOverlappingShards([shardManager1, shardManager2]);
  });

  it("releaseOnShutdown", async () => {
    const shardManager1 = context1();
    const shardManager2 = context2();

    await shardManager1.manager.start();
    await waitForSize(shardManager1, 5);
    await shardManager2.manager.start();

    await shardManager1.manager.stop();
    shardManager1.stopped = true;
    assert.equal(shardManager1.manager.held.size, 0);

    // Now shard manager2 can take the shards from shardManager1.
    await waitForSize(shardManager2, 5);
  });
}

function makeTestContext(manager: ShardManager): TestShardManagerContext {
  const heldChanged = new ConditionVariable();
  manager.on("acquired", () => heldChanged.signal());
  manager.on("released", () => heldChanged.signal());

  const context = {
    setTotalShards: (totalShards: number) => {
      const newConfig = {
        ...CONFIG,
        shardManagerTtlMs: 20,
        shardManagerDomains: [
          {
            name: manager.name,
            shards: totalShards,
            strategy: "balanced",
          },
        ] as ShardDomainConfig[],
      };
      updateGlobalConfig(newConfig);
    },
    manager,
    heldChanged,
    stopped: false,
  };

  // Default for tests.
  context.setTotalShards(5);
  return context;
}

function chooseTestDomain() {
  return autoId() as ShardManagerDomain;
}

describe("FakeShardManager Single Tests", () => {
  let shardManager!: TestShardManagerContext;

  beforeEach(async () => {
    const domain = chooseTestDomain();
    shardManager = makeTestContext(new FakeShardManager(domain));
  });
  afterEach(async () => {
    if (!shardManager.stopped) {
      await shardManager.manager.stop();
    }
  });

  singleShardManagerTests(() => shardManager);
});

describe("BalancerShardManager Tests", () => {
  let oldConfig!: typeof CONFIG;
  let notifierService!: ShimNotifierService;
  let balancer!: BalancerServiceImpl;
  let shardManager!: TestShardManagerContext;
  let shardManager2!: TestShardManagerContext;

  beforeEach(async () => {
    oldConfig = { ...CONFIG };
    notifierService = new ShimNotifierService();
    const notifierFactory = (key: DistributedNotifierKey) =>
      new ShimNotifier(
        makeClientFromImplementation(zShimNotifierService, notifierService),
        key
      );

    const election = new FakeElection("test:1234");

    balancer = new BalancerServiceImpl(election, notifierFactory);
    const balancerClient = makeClientFromImplementation(
      zBalancerService,
      balancer
    );

    await balancer.start();

    const domain = chooseTestDomain();
    shardManager = makeTestContext(
      new ServiceShardManager(
        () => balancerClient,
        domain,
        election,
        notifierFactory
      )
    );
    shardManager2 = makeTestContext(
      new ServiceShardManager(
        () => balancerClient,
        domain,
        election,
        notifierFactory
      )
    );
  });
  afterEach(async () => {
    if (!shardManager.stopped) {
      await shardManager.manager.stop();
    }
    if (!shardManager2.stopped) {
      await shardManager2.manager.stop();
    }
    await balancer.stop();
    await notifierService.stop();
    updateGlobalConfig(oldConfig);
  });

  singleShardManagerTests(() => shardManager);
  twinShardManagerTests(
    () => shardManager,
    () => shardManager2
  );
});
