import { type BiomesRedis } from "@/server/shared/redis/connection";
import { prepare } from "@/shared/zrpc/serde";
import { FLOAT32_OPTIONS, Packr } from "msgpackr";
import type { ZodTypeAny, z } from "zod";

export interface BikkieCache {
  getOrCompute<T extends ZodTypeAny>(
    key: string,
    schema: T,
    compute: () => Promise<z.infer<T>>
  ): Promise<z.infer<T>>;
}

function createRedisKey(key: string) {
  return `cache:${CONFIG.bikkieCacheEpoch}:${key}`;
}

// For binary encoding of cached data.
const packr = new Packr({
  useRecords: true,
  moreTypes: true,
  bundleStrings: true,
  useFloat32: FLOAT32_OPTIONS.NEVER,
});

// Similar to the ServerCache / GenericCache for computing values that can have
// their values stored in Redis. It will extend the lifetime of any value on reading
// so that frequently used values do not expire.
// Note: As we're focused on Bikkie it also makes use of parseASync to support async
// schemas.
export class BikkieRedisCache implements BikkieCache {
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly redis: BiomesRedis,
    private readonly ttl = 24 * 3600
  ) {}

  async getOrCompute<T extends ZodTypeAny>(
    key: string,
    schema: T,
    fn: () => Promise<z.infer<T>>
  ): Promise<z.infer<T>> {
    const redisKey = createRedisKey(key);

    const existing = this.inflight.get(redisKey) as
      | Promise<z.infer<T>>
      | undefined;
    if (existing !== undefined) {
      return existing;
    }

    const promise = (async () => {
      try {
        const cached = await this.redis.replica.getexBuffer(
          key,
          "EX",
          this.ttl
        );
        if (cached !== null) {
          return await schema.parseAsync(packr.unpack(cached));
        }
        const computed = await fn();
        await this.redis.primary.set(
          key,
          packr.pack(prepare(computed)),
          "EX",
          this.ttl
        );
        return computed;
      } finally {
        this.inflight.delete(redisKey);
      }
    })();
    this.inflight.set(redisKey, promise);
    return promise;
  }
}

export class BikkieNoCache implements BikkieCache {
  async getOrCompute<T extends ZodTypeAny>(
    key: string,
    schema: T,
    fn: () => Promise<z.infer<T>>
  ): Promise<z.infer<T>> {
    return fn();
  }
}
