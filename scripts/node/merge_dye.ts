import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { terrainDyeable } from "@/shared/asset_defs/quirk_helpers";
import { usingAll } from "@/shared/deletable";
import { ShardDye } from "@/shared/ecs/gen/components";
import { SHARD_SHAPE } from "@/shared/game/shard";
import { BufferedTerrainTensor } from "@/shared/game/terrain/buffering/buffered_terrain_tensor";
import { BiomesId } from "@/shared/ids";
import { loadBlock } from "@/shared/wasm/biomes";
import { Tensor } from "@/shared/wasm/tensors";
import { migrateEntities } from "./abstract_migrate_script";
import { loadBikkieForScript } from "./helpers/bikkie";

async function main(backupFile: string) {
  await bootstrapGlobalSecrets("untrusted-apply-token");
  await loadBikkieForScript();
  const voxeloo = await loadVoxeloo();

  const oldDyes = new Map<BiomesId, Buffer>();
  for await (const [_, entity] of iterBackupEntitiesFromFile(backupFile)) {
    if (!entity.shard_dye || !entity.shard_seed || !entity.shard_diff) {
      continue;
    }
    oldDyes.set(entity.id, Buffer.from(entity.shard_dye.buffer));
  }

  await migrateEntities(
    backupFile,
    (e) => oldDyes.has(e.id),
    (e) => {
      const oldDye = oldDyes.get(e.id);
      if (!oldDye || !e.shardSeed() || !e.shardDiff()) {
        return;
      }
      const currentDye = e.shardDye()?.buffer;
      if (currentDye && oldDye.equals(currentDye)) {
        return;
      }
      usingAll(
        [
          new voxeloo.VolumeBlock_U32(),
          new voxeloo.SparseBlock_U32(),
          Tensor.make(voxeloo, SHARD_SHAPE, "U8"),
          new BufferedTerrainTensor(
            voxeloo,
            "U8",
            SHARD_SHAPE,
            Tensor.make(voxeloo, SHARD_SHAPE, "U8")
          ),
        ],
        (seed, diff, oldTensor, currentTensor) => {
          loadBlock(voxeloo, seed, e.shardSeed()!.buffer);
          loadBlock(voxeloo, diff, e.shardDiff()!.buffer);
          oldTensor.load(oldDye);
          currentTensor.backing!.load(currentDye);

          for (const [[x, y, z], old] of oldTensor) {
            if (!old) {
              // No old value.
              return;
            }
            const terrain = diff.get(x, y, z) ?? seed.get(x, y, z);
            if (!terrain || !terrainDyeable(terrain)) {
              // No terrain to dye currently.
              return;
            }
            const current = currentTensor.get(x, y, z);
            if (current === old || current) {
              // Has a dye value, or matches.
              return;
            }
            currentTensor.set(x, y, z, old);
          }

          if (currentTensor.dirty) {
            currentTensor.commit();
            e.setShardDye(
              ShardDye.create(currentTensor.backing!.saveWrapped())
            );
          }
        }
      );
    }
  );
}

const [backupFile] = process.argv.slice(2);
main(backupFile);
