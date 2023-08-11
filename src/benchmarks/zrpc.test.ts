import { makeClient } from "@/server/shared/zrpc/client";
import { ZrpcServer } from "@/server/shared/zrpc/server";
import { ZClient } from "@/shared/zrpc/core";
import { zservice } from "@/shared/zrpc/service";
import { z } from "zod";

const zTestService = zservice("test").addRpc("double", z.number(), z.number());

describe("zRPC benchmarks", () => {
  let server: ZrpcServer;
  let client: ZClient<typeof zTestService>;
  beforeEach(async () => {
    server = new ZrpcServer();
    server.install(zTestService, {
      double: async (_ctx, input: number) => input * 2,
    });
    const port = await server.start();
    client = makeClient(zTestService, `127.0.0.1:${port}`);
    await client.waitForReady(Infinity);
  });

  afterEach(async () => {
    await server.stop();
  });

  it("Unary request [x1000]", async () => {
    const results: number[] = [];
    for (let i = 0; i < 1000; ++i) {
      results.push(await client.double(i));
    }
  });
});
