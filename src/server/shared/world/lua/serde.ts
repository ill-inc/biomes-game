import type { EntityFilter } from "@/server/shared/ecs/filter";
import { LazyEntity, LazyEntityDelta } from "@/server/shared/ecs/gen/lazy";
import type { LazyChange } from "@/server/shared/ecs/lazy";
import { parseNumberLike } from "@/server/shared/redis/util";
import type { AsDelta, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { COMPONENT_PROP_NAME_TO_ID } from "@/shared/ecs/gen/entities";
import { EntitySerde, SerializeForServer } from "@/shared/ecs/gen/json_serde";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { ok } from "assert";
import { isArray } from "lodash";
import { FLOAT32_OPTIONS, Packr, pack, unpack } from "msgpackr";
import { deserialize } from "v8";

// Differently configure msgpackr to be more standards compliant, so to
// be compatible with Redis' - for this reason we cannot use zrpc encoding.
const packr = new Packr({
  useRecords: false,
  moreTypes: false,
  structuredClone: false,
  mapsAsObjects: true,
  bundleStrings: false,
  useFloat32: FLOAT32_OPTIONS.NEVER,
  encodeUndefinedAsNil: true,
  int64AsNumber: false,
  int64AsType: "bigint",
});

export function packForRedis(value: any): Buffer {
  return packr.pack(value);
}

export function unpackFromRedis(bytes: Buffer | Uint8Array): any {
  return packr.unpack(bytes);
}

const MAX_TICK = 2 ** 52;

export function parseTick(val: any) {
  if (typeof val === "bigint") {
    ok(val >= 0n && val < BigInt(MAX_TICK));
  }
  const tick = parseNumberLike(val);
  ok(tick >= 0 && tick < MAX_TICK);
  return tick;
}

export type RedisCompiledFilter =
  | readonly [0 | string[], 0 | string[]]
  | undefined;

export function filterToRedis(filter?: EntityFilter) {
  if (filter) {
    return [
      filter.anyOf?.map((c) => String(COMPONENT_PROP_NAME_TO_ID.get(c))) ?? 0,
      filter.noneOf?.map((c) => String(COMPONENT_PROP_NAME_TO_ID.get(c))) ?? 0,
    ] as const;
  }
}

export type RedisComponentData = 0 | string | Buffer | undefined;

export function serializeRedisComponentData(data: unknown): RedisComponentData {
  if (data === null) {
    return 0;
  } else if (data) {
    return "\x01" + pack(data).toString("binary");
  }
}

export function deserializeRedisComponentData(data: RedisComponentData) {
  if (data === 0) {
    return null;
  } else if (data) {
    const buffer =
      data instanceof Uint8Array ? data : Buffer.from(data, "binary");
    if (buffer.length === 0) {
      return;
    } else if (buffer[0] === 0xff) {
      // V8 serialization
      return deserialize(buffer);
    } else if (buffer[0] === 0x01) {
      // ZRPC serialization
      return unpack(buffer.subarray(1));
    }
    throw new Error(`Unknown component serialization format: ${buffer[0]}`);
  }
}

export function redisComponentDataToPackedComponent(
  data: RedisComponentData
): Buffer | null | undefined {
  if (data === 0) {
    return null;
  } else if (data) {
    const buffer =
      data instanceof Uint8Array ? data : Buffer.from(data, "binary");
    if (buffer.length === 0) {
      return;
    }
    if (buffer[0] === 0x01) {
      // ZRPC serialization, so can return as-is without version prefix.
      return buffer.subarray(1);
    }
    if (buffer[0] === 0xff) {
      return pack(deserialize(buffer));
    }
    throw new Error(`Unknown component serialization format: ${buffer[0]}`);
  }
}

export function serializeRedisEntity(
  entity: ReadonlyEntity | AsDelta<ReadonlyEntity>
): Record<string, RedisComponentData> {
  const encoded = EntitySerde.serialize(SerializeForServer, entity, true);
  const components: Record<string, RedisComponentData> = {};
  for (let i = 1; i < encoded.length; i += 2) {
    const componentData = serializeRedisComponentData(encoded[i + 1]);
    if (componentData !== undefined) {
      components[String(encoded[i])] = componentData;
    }
  }
  return components;
}

// Convert a Redis format entity to what we need in TS
export function deserializeRedisEntityState(
  id: BiomesId,
  data: any[] | Buffer | 0 | undefined | null
): [number, LazyEntity | undefined] {
  if (!data) {
    return [0, undefined];
  }
  const unpacked = Array.isArray(data)
    ? data
    : (() => {
        try {
          return unpackFromRedis(data);
        } catch (error) {
          log.error(`Failed to unpack entity ${id}`, { error });
          throw error;
        }
      })();
  try {
    // eslint-disable-next-line prefer-const
    const [rawTick, _, redisEntity] = unpacked;
    const tick = parseTick(rawTick);

    if (!redisEntity) {
      return [tick, undefined];
    }
    return [tick, LazyEntity.forEncoded(id, redisEntity)];
  } catch (error) {
    log.error(`Failed to deserialize Redis state for ${id}`, {
      error,
      unpacked,
    });
    throw error;
  }
}

// Redis encoded proposed change.
export function redisToChange(tick: number, data: any): LazyChange {
  ok(isArray(data));
  const id = parseBiomesId(data[1]);
  switch (data[0]) {
    case 0:
      return {
        kind: "delete",
        tick,
        id,
      };
    case 1:
      return {
        kind: "update",
        tick,
        entity: LazyEntityDelta.forEncoded(id, data[2]),
      };
    case 2:
      return {
        kind: "create",
        tick,
        entity: LazyEntity.forEncoded(id, data[2]),
      };
  }
  throw new Error(`Invalid change kind: ${data[0]} for ${id}`);
}

// Convert a Redis ECS update to the Change format from TS.
export function deserializeRedisEcsUpdate(
  data: Buffer
): [number, LazyChange[]] {
  // eslint-disable-next-line prefer-const
  const [rawTick, changesData] = unpackFromRedis(data);
  const tick = parseTick(rawTick);
  const changes: LazyChange[] = [];
  for (const changeData of changesData) {
    changes.push(redisToChange(tick, changeData));
  }
  return [tick, changes];
}

export function deserializeRedisChangedIds(data: Buffer): [number, BiomesId[]] {
  // eslint-disable-next-line prefer-const
  const [rawTick, ids] = unpackFromRedis(data);
  const tick = parseTick(rawTick);
  return [tick, ids.map(parseBiomesId)];
}

export function redisSinceDeltaToChange(data: any): LazyChange {
  const unpacked = unpackFromRedis(data);
  // eslint-disable-next-line prefer-const
  const [kind, rawId, rawTick] = unpacked;
  const tick = parseTick(rawTick);
  const id = parseBiomesId(rawId);
  switch (kind) {
    case 0:
      return {
        kind: "delete",
        tick,
        id,
      };
    case 1:
      return {
        kind: "update",
        tick,
        entity: LazyEntityDelta.forEncoded(id, unpacked[3]),
      };
    case 2:
      return {
        kind: "create",
        tick,
        entity: LazyEntity.forEncoded(id, unpacked[3]),
      };
  }
  throw new Error(`Invalid change kind: ${kind} for ${id}`);
}
