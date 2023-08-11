import type { BiomesRedis } from "@/server/shared/redis/connection";
import { packForRedis, unpackFromRedis } from "@/server/shared/world/lua/serde";
import type { RedisWorld } from "@/server/shared/world/redis";
import {
  redisBeforeEachTest,
  runRedis,
} from "@/server/shared/world/test/test_helpers";
import assert from "assert";

describe("Redis integer encoding tests", () => {
  if (process.env.REDIS_TESTS !== "1") {
    it("are being skipped as we lack env.REDIS_TESTS=1", () => {
      assert.ok(true);
    });
    return;
  }

  let port!: number;
  let controller!: AbortController;

  after(async () => {
    controller?.abort();
  });

  before(async () => {
    [port, controller] = await runRedis();
  });

  let world!: RedisWorld;
  let redis!: BiomesRedis;

  beforeEach(async () => {
    [redis, world] = await redisBeforeEachTest(port);
  });

  afterEach(async () => world?.stop());

  it("can store and decode 32bit numbers", async () => {
    const N = 2 ** 32 - 1;

    // As a conventional key, expected as string.
    await redis.primary.set("t32", N);
    assert.deepStrictEqual(await redis.primary.get("t32"), String(N));

    // As a value into and out of Lua
    assert.deepStrictEqual(
      await redis.primary.eval("return ARGV[1]", 0, N),
      String(N)
    );

    // As a value into and out of Lua via msgpack
    assert.deepStrictEqual(
      unpackFromRedis(
        await (redis as any).primary.evalBuffer(
          "return cmsgpack.pack(cmsgpack.unpack(ARGV[1]))",
          0,
          packForRedis(N)
        )
      ),
      N
    );
  });

  it("can store and decode 53bit numbers", async () => {
    const N = Number.MAX_SAFE_INTEGER;

    // As a conventional key, expected as string.
    await redis.primary.set("t53", N);
    assert.deepStrictEqual(await redis.primary.get("t53"), String(N));

    // As a value into and out of Lua
    assert.deepStrictEqual(
      await redis.primary.eval("return ARGV[1]", 0, N),
      String(N)
    );

    // As a value into and out of Lua via msgpack
    assert.deepStrictEqual(
      unpackFromRedis(
        await (redis as any).primary.evalBuffer(
          "return cmsgpack.pack(cmsgpack.unpack(ARGV[1]))",
          0,
          packForRedis(N)
        )
      ),
      BigInt(N) // Note, Lua msgpack makes values >32bit into bigint.
    );
  });

  /* Only works on OSX?
  it("can store and decode 64bit numbers", async () => {
    const N = 9223372036854775807n;

    // As a conventional key, expected as string.
    await redis.set("t64", String(N));
    await redis.set("t64p", packForRedis(N));
    assert.deepStrictEqual(await redis.get("t64"), String(N));

    // As a value into and out of Lua
    assert.deepStrictEqual(
      await redis.eval("return ARGV[1]", 0, String(N)),
      String(N)
    );

    // As a value into and out of Lua via msgpack
    assert.deepStrictEqual(
      unpackFromRedis(
        await (redis as any).evalBuffer(
          "return cmsgpack.pack(cmsgpack.unpack(ARGV[1]))",
          0,
          packForRedis(N)
        )
      ),
      N
    );
  });*/
});
