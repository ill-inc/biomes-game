import { GenericCache } from "@/server/shared/cache/generic_cache";
import type { ChatApi } from "@/server/shared/chat/api";
import { InMemoryChatApi } from "@/server/shared/chat/memory";
import { PlayerSpatialObserver } from "@/server/shared/chat/player_observer";
import { RedisChatDistributor } from "@/server/shared/chat/redis/distribution";
import { RedisChatApi } from "@/server/shared/chat/redis/redis";
import {
  ExposeChatService,
  RemoteChatApi,
  zChatService,
} from "@/server/shared/chat/remote";
import { copyConfig, updateGlobalConfig } from "@/server/shared/config";
import type { WorldApi } from "@/server/shared/world/api";
import { ShimWorldApi } from "@/server/shared/world/shim/api";
import { InMemoryWorld } from "@/server/shared/world/shim/in_memory_world";
import {
  redisInitForTests,
  runRedis,
} from "@/server/shared/world/test/test_helpers";
import { makeClientFromImplementation } from "@/server/shared/zrpc/server";
import type { ServerCache } from "@/server/web/server_cache";
import { BackgroundTaskController } from "@/shared/abort";
import type { ChatMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import { PlayerStatus } from "@/shared/ecs/gen/components";
import type { BiomesId } from "@/shared/ids";
import type { WithStop } from "@/shared/registry";
import { ConditionVariable, SignallingValue } from "@/shared/util/async";
import assert from "assert";
import { caching } from "cache-manager";

const PLAYER_A = 1 as BiomesId;
const PLAYER_B = 2 as BiomesId;
const PLAYER_C = 3 as BiomesId;
const PLAYER_D = 4 as BiomesId;

interface ChatApiTestContext {
  world: InMemoryWorld;
  worldApi: WorldApi;
  players: PlayerSpatialObserver;
}

function chatApiTests(
  create: (context: ChatApiTestContext) => Promise<ChatApi>,
  waitForDistribution?: () => Promise<void>,
  waitForPush?: () => Promise<void>,
  pushCount?: () => number
) {
  const originalConfig = copyConfig();

  let world!: InMemoryWorld;
  let players!: PlayerSpatialObserver;
  let api!: ChatApi;

  beforeEach(async () => {
    CONFIG.playerWhisperRadius = 10;
    CONFIG.playerChatRadius = 100;
    CONFIG.playerYellRadius = 1000;

    world = new InMemoryWorld();

    // Create some test players in our world.
    world.applyChanges([
      {
        kind: "create",
        entity: {
          // Should not get the message due to distance.
          id: PLAYER_A,
          remote_connection: {},
          player_status: PlayerStatus.create({ init: true }),
          position: {
            v: [0, 1001, 0],
          },
        },
      },
      {
        kind: "create",
        entity: {
          // Should get the message.
          id: PLAYER_B,
          remote_connection: {},
          player_status: PlayerStatus.create({ init: true }),
          position: {
            v: [0, 0, 0],
          },
        },
      },
      {
        kind: "create",
        entity: {
          // Should also get the message as they're near
          id: PLAYER_C,
          remote_connection: {},
          player_status: PlayerStatus.create({ init: true }),
          position: {
            v: [0, 100, 0],
          },
        },
      },
      {
        kind: "create",
        entity: {
          // Should not get the message as they lack position.
          id: PLAYER_D,
          remote_connection: {},
          player_status: PlayerStatus.create({ init: true }),
        },
      },
    ]);

    const worldApi = ShimWorldApi.createForWorld(world);
    players = new PlayerSpatialObserver(worldApi);
    await players.start();
    api = await create({
      world,
      worldApi,
      players,
    });
  });

  afterEach(async () => {
    if ("stop" in api) {
      await (api as WithStop<ChatApi>).stop();
    }
    await players.stop();
    updateGlobalConfig(originalConfig);
  });

  it("Is healthy", async () => assert.ok(await api.healthy()));

  it("Starts empty for a given user", async () => {
    const chats = await api.export(PLAYER_A);
    assert.deepEqual(
      chats.reduce((acc, d) => acc + (d.mail?.length ?? 0), 0),
      0
    );
  });

  const getMessage = async (userId: BiomesId, messageId: string) => {
    const chats = (await api.export(userId)).flatMap((d) => d.mail ?? []);
    return chats.find((chat) => chat.id === messageId);
  };

  const HELLO_MESSAGE: ChatMessage = {
    kind: "text",
    content: "Hi",
  };

  it("Can send a DM", async () => {
    const { echo: delivery } = await api.sendMessage({
      message: HELLO_MESSAGE,
      from: PLAYER_A,
      to: PLAYER_B,
    });

    assert.ok(delivery);
    assert.equal(delivery?.channelName, "dm");
    assert.equal(delivery?.mail?.length, 1);

    const mail = delivery.mail![0];
    assert.deepEqual(mail.message, HELLO_MESSAGE);

    // Yield to permit push to happen.
    await waitForPush?.();

    assert.ok(await getMessage(PLAYER_A, mail.id));
    assert.ok(await getMessage(PLAYER_B, mail.id));

    if (pushCount) {
      assert.equal(pushCount(), 1);
    }
  });

  it("Can deliver spatially", async () => {
    const { id } = await api.sendMessage({
      message: HELLO_MESSAGE,
      spatial: {
        position: [0, 0, 0],
        volume: "yell",
      },
    });

    // Yield to permit distribution to happen.
    await waitForDistribution?.();

    assert.ok(!(await getMessage(PLAYER_A, id)));
    assert.ok(await getMessage(PLAYER_B, id));
    assert.ok(await getMessage(PLAYER_C, id));
    assert.ok(!(await getMessage(PLAYER_D, id)));
  });
}

describe(`Test InMemoryChatApi`, () => {
  chatApiTests(async ({ players }) => new InMemoryChatApi(players));
});

describe(`Test RemoteChatApi`, () => {
  chatApiTests(
    async ({ players }) =>
      new RemoteChatApi(
        makeClientFromImplementation(
          zChatService,
          new ExposeChatService(new InMemoryChatApi(players))
        )
      )
  );
});

describe(`Test RedisChatApi`, () => {
  if (process.env.REDIS_TESTS !== "1") {
    it("are being skipped as we lack env.REDIS_TESTS=1", () => {
      assert.ok(true);
    });
    return;
  }

  let port!: number;
  let redisController!: BackgroundTaskController;

  before(async () => {
    [port, redisController] = await runRedis();
  });

  after(async () => {
    redisController?.abort();
  });

  let distributor: RedisChatDistributor | undefined;
  let distributionController: BackgroundTaskController | undefined;
  afterEach(async () => {
    if (distributor) {
      assert.equal(await distributor.getPendingMessagesCount(), 0);
    }
    await distributionController?.abortAndWait();
    distributionController = undefined;
    distributor = undefined;
  });

  let serverCache: ServerCache;
  const discordBot = {
    pushes: new SignallingValue(0, new ConditionVariable()),
    sendPushNotifications: async (_userId: BiomesId, _mail: Envelope[]) => {
      discordBot.pushes.value++;
    },
  };

  beforeEach(async () => {
    serverCache = new GenericCache(
      caching({
        store: "memory",
        max: 1000,
        ttl: 10000000,
      })
    );
    discordBot.pushes.value = 0;
  });

  chatApiTests(
    async ({ worldApi, players }) => {
      const redis = await redisInitForTests(port);
      if (!distributor) {
        distributor = await RedisChatDistributor.create(
          players,
          {
            serverCache,
            discordBot,
          },
          "test",
          redis
        );
        distributionController = new BackgroundTaskController();
        distributionController.runInBackground(
          "spatialDistribute",
          async (signal) => distributor?.runForever(signal)
        );
      }
      return new RedisChatApi(worldApi, redis);
    },
    async () => {
      await distributor?.distributions.cv.wait();
    },
    async () => {
      await discordBot.pushes.cv.wait();
    },
    () => discordBot.pushes.value
  );
});
