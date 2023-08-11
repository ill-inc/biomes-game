import { log } from "@/shared/logging";
import { zrpcWebDeserialize, zrpcWebSerialize } from "@/shared/zrpc/serde";
import { z } from "zod";

export const NO_MAPPING_CHANGE = "wait";

export const zLegacyShardMapping = z.map(z.string(), z.set(z.number()));

export const zShardMapping = z.object({
  allocation: z.map(z.string(), z.set(z.number())),
  weights: z.map(z.number(), z.number()).optional(),
});

export type ShardMapping = z.infer<typeof zShardMapping>;

export function emptyMapping(): ShardMapping {
  return { allocation: new Map() };
}

export function deserializeShardMapping(
  value?: string | ShardMapping
): ShardMapping | undefined {
  if (!value || value === NO_MAPPING_CHANGE) {
    return;
  }
  try {
    return typeof value === "string"
      ? zrpcWebDeserialize(value, zShardMapping)
      : value instanceof Map
      ? { allocation: value }
      : zShardMapping.parse(value);
  } catch (error) {
    log.warn("Did not understand shard mapping, ignoring.", {
      value,
      error,
    });
  }
}

export function serializeShardMapping(mapping: ShardMapping): string {
  return zrpcWebSerialize(mapping);
}
