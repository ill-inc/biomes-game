import { TerrainShardSelector } from "@/shared/ecs/gen/selectors";
import type { Table } from "@/shared/ecs/table";
import { SHARD_DIM } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import type { Vec2 } from "@/shared/math/types";

export function getTerrainColumnScanMetaIndex() {
  return { ...TerrainShardSelector.createIndexFor.spatial() };
}

type TerrainOwnershipMetaIndex = ReturnType<
  typeof getTerrainColumnScanMetaIndex
>;
type TerrainOwnershipTable = Table<TerrainOwnershipMetaIndex>;

export type TerrainColumn = {
  // The column's xz position in shard coordinates.
  xzShard: Vec2;
  // The lower and upper bound on the shard y coordinate in this column.
  yShardRange: [number, number];
  // A list of the shard entity IDs.
  shardIds: BiomesId[];
};

export function columnPosAsMapKey(pos: Vec2) {
  return `${pos[0]},${pos[1]}`;
}

// Scans the table for terrain shard entities and compiles them into a set of
// xz columns, optionally filtering the results along the way.
export function getTerrainColumns(
  table: TerrainOwnershipTable,
  filter: (xzShard: Vec2) => boolean = (_) => true
) {
  const columnPosToShards = new Map<
    ReturnType<typeof columnPosAsMapKey>,
    TerrainColumn
  >();

  for (const entity of table.scan(TerrainShardSelector.query.all())) {
    const xzShard: Vec2 = [
      entity.box.v0[0] / SHARD_DIM,
      entity.box.v0[2] / SHARD_DIM,
    ];
    const yShard = entity.box.v0[1] / SHARD_DIM;

    if (!filter(xzShard)) {
      // This isn't our terrain column to manage, so don't add it to the list.
      continue;
    }

    const columnKey = columnPosAsMapKey(xzShard);
    let column = columnPosToShards.get(columnKey);
    if (column === undefined) {
      column = { xzShard, yShardRange: [yShard, yShard], shardIds: [] };
      columnPosToShards.set(columnKey, column);
    }
    column.shardIds.push(entity.id);
    column.yShardRange[0] = Math.min(column.yShardRange[0], yShard);
    column.yShardRange[1] = Math.max(column.yShardRange[1], yShard);
  }

  return Array.from(columnPosToShards.values());
}
