import type { BiomesRedisConnection } from "@/server/shared/redis/types";
import { log } from "@/shared/logging";
import type { RedisKey } from "ioredis";

export function parseNumberLike(val: any) {
  if (typeof val === "bigint") {
    return Number(val);
  } else if (typeof val === "number") {
    return val;
  } else if (typeof val === "string") {
    return parseInt(val);
  }
  throw new Error("Invalid number");
}

export async function pendingGroupMessages(
  redis: BiomesRedisConnection,
  key: RedisKey,
  group: string | Buffer
): Promise<number> {
  const [count] = await redis.xpending(key, group);
  return parseNumberLike(count);
}

export async function idleConsumerGroups(
  redis: BiomesRedisConnection,
  key: RedisKey,
  group: string | Buffer,
  ttlMs: number
): Promise<string[]> {
  const info = await redis.xinfo("CONSUMERS", key, group);
  const consumerNames: string[] = [];
  for (const fields of info) {
    let idle = 0;
    let pending = 0;
    let name = "";
    for (let i = 0; i < fields.length; i += 2) {
      const fieldName = fields[i];
      const fieldValue = fields[i + 1];
      switch (fieldName) {
        case "name":
          name = fieldValue;
          break;
        case "pending":
          pending = parseNumberLike(fieldValue);
          break;
        case "idle":
          idle = parseNumberLike(fieldValue);
          break;
      }
    }
    if (idle < ttlMs) {
      continue;
    }
    if (pending > 0) {
      log.warn(
        "Not returning consumer group, pending acks to be consumed by others",
        {
          pending,
          group: group,
          consumer: name,
        }
      );
      continue;
    }
    consumerNames.push(name);
  }
  return consumerNames;
}
