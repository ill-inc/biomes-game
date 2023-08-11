import { GameEvent, zGameEvent } from "@/server/shared/api/game_event";
import { GenericCache } from "@/server/shared/cache/generic_cache";
import { createBdb } from "@/server/shared/storage";
import { createInMemoryStorage } from "@/server/shared/storage/memory";
import { makeClient } from "@/server/shared/zrpc/client";
import { ZrpcServer } from "@/server/shared/zrpc/server";
import { WebSocketZrpcServer } from "@/server/shared/zrpc/websocket/server";
import { SessionStore } from "@/server/web/db/sessions";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { Change } from "@/shared/ecs/change";
import { Label, Position } from "@/shared/ecs/gen/components";
import { AdminGiveItemEvent } from "@/shared/ecs/gen/events";
import { zBuffer } from "@/shared/ecs/gen/types";
import { WrappedChange, zChange } from "@/shared/ecs/zod";
import { countOf, createBag } from "@/shared/game/items";
import { generateTestId } from "@/shared/test_helpers";
import { Delayed, safeSetImmediate } from "@/shared/util/async";
import type {
  Client,
  RpcContext,
  ServiceDescription,
  ServiceImplementation,
  UntypedMethods,
  UntypedStreamingMethods,
  ZClient,
} from "@/shared/zrpc/core";
import { webMessagePort } from "@/shared/zrpc/messageport";
import { makeMessagePortClient } from "@/shared/zrpc/messageport_client";
import { MessagePortZrpcServer } from "@/shared/zrpc/messageport_server";
import { zservice } from "@/shared/zrpc/service";
import { makeWebSocketClient } from "@/shared/zrpc/websocket_client";
import assert from "assert";
import { caching } from "cache-manager";
import { z } from "zod";

interface Server<TContext extends RpcContext> {
  install<
    TMethods extends UntypedMethods,
    TStreamingMethods extends UntypedStreamingMethods
  >(
    service: ServiceDescription<TMethods, TStreamingMethods>,
    implementation: ServiceImplementation<TContext, TMethods, TStreamingMethods>
  ): void;
  stop(): Promise<void>;
}

interface ZrpcEnvironment<TPort> {
  readonly name: string;
  createTestServer(): Promise<[Server<any>, () => Promise<TPort>]>;
  createTestClient<
    TMethods extends UntypedMethods,
    TStreamingMethods extends UntypedStreamingMethods
  >(
    service: ServiceDescription<TMethods, TStreamingMethods>,
    port: TPort
  ): Promise<Client<TMethods, TStreamingMethods>>;
}

function zrpcTest<TPort>({
  name,
  createTestServer,
  createTestClient,
}: ZrpcEnvironment<TPort>) {
  describe(`Test ${name}`, () => {
    it("Can handle a simple RPC", async () => {
      const zTestService = zservice("test").addRpc(
        "hello",
        z.string(),
        z.string()
      );

      const [server, startFn] = await createTestServer();
      let client: ZClient<typeof zTestService> | undefined;
      try {
        server.install(zTestService, {
          hello: async (_context, name: string) => `Hello ${name}!`,
        });
        client = await createTestClient(zTestService, await startFn());
        assert.equal(await client.hello("World"), "Hello World!");
      } finally {
        await client?.close();
        await server.stop();
      }
    });

    it("Can handle a streaming RPC", async () => {
      const zTestService = zservice("test").addStreamingRpc(
        "farewells",
        z.string(),
        z.string()
      );

      const [server, startFn] = await createTestServer();
      let client: ZClient<typeof zTestService> | undefined;
      try {
        server.install(zTestService, {
          farewells: async function* (_context, toName: string) {
            const names = ["Alice", "Bob", "Charlie"];
            for (const name of names) {
              yield `${name}: Goodbye ${toName}!`;
            }
          },
        });
        client = await createTestClient(zTestService, await startFn());

        const expected = [
          "Alice: Goodbye Nick!",
          "Bob: Goodbye Nick!",
          "Charlie: Goodbye Nick!",
        ];
        const actual = [];
        for await (const result of client.farewells("Nick")) {
          actual.push(result);
        }
        assert.deepEqual(actual, expected);
      } finally {
        await client?.close();
        await server.stop();
      }
    });

    it("Can handle an RPCs with no request or response", async () => {
      const zTestService = zservice("test")
        .addRpc("add", z.number(), z.void())
        .addRpc("get", z.void(), z.number())
        .addRpc("reset", z.void(), z.void());

      const [server, startFn] = await createTestServer();
      let client: ZClient<typeof zTestService> | undefined;
      try {
        let sum = 0;
        server.install(zTestService, {
          add: async (_: RpcContext, num: number) => {
            sum += num;
            return undefined;
          },
          get: async () => {
            return sum;
          },
          reset: async () => {
            sum = 0;
          },
        });
        client = await createTestClient(zTestService, await startFn());

        assert.equal(await client.get(), 0);
        await client.add(1);
        assert.equal(sum, 1);
        assert.equal(await client.get(), 1);
        await client.add(10);
        assert.equal(await client.get(), 11);
        await client.reset();
        assert.equal(await client.get(), 0);
      } finally {
        await client?.close();
        await server.stop();
      }
    });

    it("Can send a single game event in an array", async () => {
      const zTestService = zservice("test").addRpc(
        "publish",
        z.array(zGameEvent),
        z.void()
      );

      const [server, startFn] = await createTestServer();
      let client: ZClient<typeof zTestService> | undefined;

      try {
        let received: GameEvent[] = [];
        server.install(zTestService, {
          publish: async (_: RpcContext, events: GameEvent[]) => {
            received = events;
          },
        });
        client = await createTestClient(zTestService, await startFn());

        const userId = generateTestId();
        const event = new GameEvent(
          userId,
          new AdminGiveItemEvent({
            id: userId,
            bag: createBag(countOf(BikkieIds.diamondGem, 1n)),
          })
        );

        await client.publish([event]);
        assert.deepEqual(received, [event]);
      } finally {
        await client?.close();
        await server.stop();
      }
    });

    it("Can receive streaming game changes", async () => {
      const zTestService = zservice("test").addStreamingRpc(
        "subscribe",
        z.void(),
        zChange
      );

      const [server, startFn] = await createTestServer();
      let client: ZClient<typeof zTestService> | undefined;
      try {
        const changes: Change[] = [
          {
            kind: "create",
            tick: 23,
            entity: {
              id: generateTestId(),
              label: Label.create({ text: "Taylor" }),
              position: Position.create({
                v: [1, 2, 3],
              }),
            },
          },
          {
            kind: "create",
            tick: 24,
            entity: {
              id: generateTestId(),
              label: Label.create({ text: "Thomas" }),
              position: Position.create({
                v: [4, 5, 6],
              }),
            },
          },
        ];

        server.install(zTestService, {
          subscribe: async function* () {
            for (const change of changes) {
              yield new WrappedChange(change);
            }
          },
        });
        client = await createTestClient(zTestService, await startFn());

        const gotChanges = [];
        for await (const wrapped of client.subscribe()) {
          gotChanges.push(wrapped.change);
        }

        assert.deepEqual(gotChanges, changes);
      } finally {
        await client?.close();
        await server.stop();
      }
    });

    it("Can send a request with binary data that is retained", async () => {
      const zTestService = zservice("test").addRpc(
        "hello",
        zBuffer,
        z.number()
      );

      const [server, startFn] = await createTestServer();
      let client: ZClient<typeof zTestService> | undefined;
      try {
        server.install(zTestService, {
          hello: async (_context, data: Uint8Array) => {
            const result = new Delayed<number>();
            safeSetImmediate(() => {
              result.resolve(data.length);
            });
            return result.wait();
          },
        });
        client = await createTestClient(zTestService, await startFn());

        const data = Buffer.from("Hello World!");
        assert.equal(await client.hello(data), data.length);
      } finally {
        await client?.close();
        await server.stop();
      }
    });
  });
}

zrpcTest({
  name: "gRPC",
  createTestServer: async () => {
    const server = new ZrpcServer();
    return [server, () => server.start()];
  },
  createTestClient: async (service, port) => {
    return makeClient(service, `127.0.0.1:${port}`);
  },
});

zrpcTest({
  name: "MessagePort",
  createTestServer: async () => {
    const channel = new MessageChannel();
    const server = new MessagePortZrpcServer(webMessagePort(channel.port1));
    return [server, async () => channel.port2];
  },
  createTestClient: async (service, port) => {
    return makeMessagePortClient(service, webMessagePort(port));
  },
});

zrpcTest({
  name: "WebSocket",
  createTestServer: async () => {
    const db = createBdb(createInMemoryStorage());
    const serverCache = new GenericCache(
      caching({
        store: "memory",
        max: 1000,
        ttl: 5 * 60,
      })
    );
    const sessionStore = new SessionStore(db, serverCache);
    const wss = new WebSocketZrpcServer(sessionStore, ["/test"]);
    await wss.start(0);
    return [wss, async () => wss.port];
  },
  createTestClient: async (service, port) => {
    const authUserId = generateTestId();
    const authSessionId = SessionStore.createGremlinSession(authUserId).id;
    const client = makeWebSocketClient(service, `ws://127.0.0.1:${port}/test`, {
      authUserId,
      authSessionId,
    });
    await client.waitForReady(Infinity);
    return client;
  },
});
