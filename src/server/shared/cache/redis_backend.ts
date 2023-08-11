import type { CacheBackend } from "@/server/shared/cache/types";
import type { BiomesRedis } from "@/server/shared/redis/connection";
import { connectToRedis } from "@/server/shared/redis/connection";
import { FLOAT32_OPTIONS, Packr } from "msgpackr";

const packr = new Packr({
  useRecords: true,
  moreTypes: true,
  bundleStrings: true,
  useFloat32: FLOAT32_OPTIONS.NEVER,
});

export class RedisBackend implements CacheBackend {
  private constructor(
    private readonly defaultTTL: number,
    private readonly cachePrefix: string,
    private readonly redis: BiomesRedis
  ) {}

  static async create(defaultTTL: number, cachePrefix: string) {
    return new RedisBackend(
      defaultTTL,
      cachePrefix,
      await connectToRedis("cache")
    );
  }

  makeCacheKey(key: string) {
    return `${this.cachePrefix}${key}`;
  }

  async del(key: string) {
    await this.redis.primary.del(this.makeCacheKey(key));
  }

  async get<T>(key: string) {
    const value = await this.redis.replica.getBuffer(this.makeCacheKey(key));
    if (value === null) {
      return null;
    }
    return packr.unpack(value) as T;
  }

  async set<T>(key: string, val: T, options?: { ttl: number } | undefined) {
    const ttl = options?.ttl ?? this.defaultTTL;
    const storedKey = this.makeCacheKey(key);
    const payload = packr.pack(val);
    if (ttl) {
      await this.redis.primary.set(
        storedKey,
        payload,
        "EX",
        options?.ttl ?? this.defaultTTL
      );
    } else {
      await this.redis.primary.set(storedKey, payload);
    }
  }
}
