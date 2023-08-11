import type { Item, ReadonlyItem } from "@/shared/game/item";
import { anItem } from "@/shared/game/item";
import { zRawItem } from "@/shared/game/raw_item";
import type { ShardId } from "@/shared/game/shard";
import type {
  ItemAndCount,
  ReadonlyItemAndCount,
  SerializedItemAndCount,
} from "@/shared/game/types";
import { zRawItemAndCount } from "@/shared/game/types";

import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID, parseBiomesId, zBiomesId } from "@/shared/ids";
import { prepare } from "@/shared/zrpc/serde";
import { ok } from "assert";
import { z } from "zod";

export type { Item, ReadonlyItem } from "@/shared/game/item";
export { zRawItem } from "@/shared/game/raw_item";
export { zShardId } from "@/shared/game/shard";
export type { ShardId } from "@/shared/game/shard";
export { zRawItemAndCount } from "@/shared/game/types";
export type {
  ItemAndCount,
  ReadonlyItemAndCount,
  SerializedItemAndCount,
} from "@/shared/game/types";

export const zItem = zRawItem;
export const zItemAndCount = zRawItemAndCount;

export type ReadonlyShardId = ShardId;
export type ReadonlyBiomesId = BiomesId;

// Entity IDs.
export const defaultBiomesId = INVALID_BIOMES_ID;
export function serializeBiomesId(id: BiomesId): number {
  return id;
}
export function deserializeBiomesId(id: unknown): BiomesId {
  return parseBiomesId(id);
}

// ShardId IDs.
export const defaultShardId = "" as ShardId;
export function serializeShardId(id: ShardId): string {
  return id;
}
export function deserializeShardId(id: unknown): ShardId {
  ok(typeof id === "string");
  return id as ShardId;
}

export const defaultItem: () => Item = () => anItem({ id: INVALID_BIOMES_ID });
export function serializeItem(item: ReadonlyItem): unknown {
  return prepare(item);
}
export function deserializeItem(json: unknown): Item {
  return anItem(zRawItem.parse(json));
}

export const defaultItemAndCount: () => ItemAndCount = () => ({
  item: defaultItem(),
  count: 0n,
});
export function serializeItemAndCount(
  itemAndCount: ReadonlyItemAndCount
): SerializedItemAndCount {
  return {
    item: serializeItem(itemAndCount.item),
    count: String(itemAndCount.count),
  };
}
export function deserializeItemAndCount(json: any): ItemAndCount {
  return {
    item: deserializeItem(json.item),
    count: BigInt(json.count),
  };
}

// Trigger state map
export type TriggerStateMap = Map<BiomesId, string | number>;
export type ReadonlyTriggerStateMap = ReadonlyMap<BiomesId, string | number>;

export const zTriggerStateMap = z.array(
  z.tuple([zBiomesId, z.union([z.string(), z.number()])])
);
export const defaultTriggerStateMap = () =>
  new Map<BiomesId, string | number>();

export function serializeTriggerStateMap(
  stateMap: ReadonlyTriggerStateMap
): [BiomesId, string | number][] {
  return [...stateMap.entries()];
}

export function deserializeTriggerStateMap(stateMap: unknown): TriggerStateMap {
  return new Map(zTriggerStateMap.parse(stateMap));
}
