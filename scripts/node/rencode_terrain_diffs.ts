import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { loadDiff } from "@/shared/game/terrain";
import { saveBlock } from "@/shared/wasm/biomes";
import assert from "assert";

const voxeloo = await loadVoxeloo();

// Script that just re-runs getNpcSize on all of them.
const [backupFile] = process.argv.slice(2);

function needsUpdate(entity: ReadonlyEntity) {
  const buffer = entity.shard_diff?.buffer;
  if (buffer && buffer.length > 0) {
    const diff = loadDiff(voxeloo, entity);
    if (diff) {
      try {
        return !Buffer.from(buffer).equals(saveBlock(voxeloo, diff));
      } finally {
        diff.delete();
      }
    }
  }
  return false;
}

function doUpdate(entity: PatchableEntity) {
  const buffer = entity.shardDiff()?.buffer;
  assert.ok(buffer && buffer.length > 0);
  const diff = loadDiff(voxeloo, entity.asReadonlyEntity());
  if (diff) {
    try {
      entity.mutableShardDiff().buffer = Buffer.from(saveBlock(voxeloo, diff));
    } finally {
      diff.delete();
    }
  }
}

migrateEntities(backupFile, needsUpdate, doUpdate);
