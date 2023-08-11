import type { VersionedTable } from "@/shared/ecs/table";
import { centerAABB, scale } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";

export function centerOfTerrain(table: VersionedTable<unknown>) {
  const sum: Vec3 = [0, 0, 0];
  let count = 0;
  for (const entity of table.contents()) {
    if (!entity.shard_seed || !entity.box) {
      continue;
    }
    const center = centerAABB([entity.box.v0, entity.box.v1]);
    sum[0] += center[0];
    sum[1] += center[1];
    sum[2] += center[2];
    count++;
  }
  if (count === 0) {
    return sum;
  }
  return scale(1 / count, sum);
}
