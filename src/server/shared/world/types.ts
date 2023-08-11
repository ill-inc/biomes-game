import type { BiomesId } from "@/shared/ids";
import { parseBiomesId } from "@/shared/ids";
import type { RedisKey } from "ioredis";

export const TICK_KEY = Buffer.from("tick");
export const ECS_STREAM = Buffer.from("ecs");

export type RedisStreamId = Buffer & { readonly "": unique symbol };

export function isPointAtOrAfter(a: RedisStreamId, b: RedisStreamId) {
  if (a.equals(b)) {
    return true;
  }
  const [aTime, aSeq] = a.toString().split("-").map(parseInt);
  const [bTime, bSeq] = b.toString().split("-").map(parseInt);
  return aTime > bTime || (aTime === bTime && aSeq > bSeq);
}

export function streamIdTimestamp(id: RedisStreamId): number {
  const [time] = id.toString().split("-").map(parseInt);
  return time;
}

export function streamIdAge(id: RedisStreamId) {
  return Date.now() - streamIdTimestamp(id);
}

export const START_CURSOR = Buffer.from("0");
export const FIRST_STREAM_ID = Buffer.from("0-0") as RedisStreamId;

export function biomesIdToRedisKey(id: BiomesId): Buffer {
  return Buffer.from(`b:${id}`, "ascii");
}

export function redisKeyToBiomesId(key: RedisKey): BiomesId {
  return parseBiomesId(key instanceof Buffer ? key.toString() : key);
}
