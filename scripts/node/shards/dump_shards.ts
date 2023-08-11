import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import { scriptInit } from "@/server/shared/script_init";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import {
  allShardComponents,
  loadShardsWithVersions,
  Shard,
} from "@/shared/batch/shards";
import { using } from "@/shared/deletable";
import { voxelToShardPos } from "@/shared/game/shard";
import { log } from "@/shared/logging";
import { makeDynamicBuffer } from "@/shared/wasm/buffers";
import { DataType, Tensor } from "@/shared/wasm/tensors";
import { VoxelooModule } from "@/shared/wasm/types";
import {
  SparseBlock,
  ValueType,
  VolumeBlock,
} from "@/shared/wasm/types/biomes";
import { ok } from "assert";
import { mkdirSync, writeFileSync } from "fs";

function toShardName(shard: Shard) {
  return voxelToShardPos(...shard.aabb[0]).join("_");
}

function writeMeta(version: number, shard: Shard, path: string) {
  writeFileSync(
    path,
    JSON.stringify({
      id: shard.id,
      box: shard.aabb,
      version: version,
    })
  );
}

function writeVolume<T extends ValueType>(
  voxeloo: VoxelooModule,
  block: VolumeBlock<T>,
  path: string
) {
  using(makeDynamicBuffer(voxeloo, "U8"), (buffer) => {
    block.saveBuffer(buffer);
    writeFileSync(path, buffer.asArray());
  });
}

function writeSparse<T extends ValueType>(
  voxeloo: VoxelooModule,
  block: SparseBlock<T>,
  path: string
) {
  using(makeDynamicBuffer(voxeloo, "U8"), (buffer) => {
    block.saveBuffer(buffer);
    writeFileSync(path, buffer.asArray());
  });
}

function writeTensor<T extends DataType>(tensor: Tensor<T>, path: string) {
  writeFileSync(path, tensor.save());
}

function nowPath() {
  return new Date(Date.now())
    .toISOString()
    .slice(0, -5)
    .replace("T", "_")
    .replaceAll("-", "_")
    .replaceAll(":", "_");
}

export async function dumpShards(
  backupFile: string,
  outputPath: string,
  ...components: string[]
) {
  if (!backupFile || !outputPath || !components.length) {
    log.fatal(
      `Usage: node dump_shards.js <backup_file> <output_path> [components...]`
    );
    return;
  }

  // Validate that the requested components are valid.
  ok(allShardComponents(components));
  console.log(`Dumping [${components.join(", ")}] from "${backupFile}"`);
  await scriptInit();

  const voxeloo = await loadVoxeloo();

  // Append a date suffix to the output path.
  if (!outputPath.endsWith("/")) {
    outputPath += "/";
  }
  outputPath += nowPath();
  console.log(`Creating output directory: "${outputPath}"...`);
  mkdirSync(outputPath);

  // Scan all terrain shards and dump them.
  await loadShardsWithVersions(
    voxeloo,
    iterBackupEntitiesFromFile(backupFile),
    (version, shard) => {
      const prefix = `${outputPath}/${toShardName(shard)}`;
      writeMeta(version, shard, `${prefix}.meta.json`);
      if (components.includes("seed") && shard.seed) {
        writeVolume(voxeloo, shard.seed, `${prefix}.seed.bin`);
      }
      if (components.includes("diff") && shard.diff) {
        writeSparse(voxeloo, shard.diff, `${prefix}.diff.bin`);
      }
      if (components.includes("shapes") && shard.shapes) {
        writeSparse(voxeloo, shard.shapes, `${prefix}.shapes.bin`);
      }
      if (components.includes("sky_occlusion") && shard.skyOcclusion) {
        writeTensor(shard.skyOcclusion, `${prefix}.sky_occlusion.bin`);
      }
      if (components.includes("irradiance") && shard.irradiance) {
        writeTensor(shard.irradiance, `${prefix}.irradiance.bin`);
      }
      if (components.includes("water") && shard.water) {
        writeTensor(shard.water, `${prefix}.water.bin`);
      }
      if (components.includes("dye") && shard.dye) {
        writeTensor(shard.dye, `${prefix}.dye.bin`);
      }
      if (components.includes("placer") && shard.placer) {
        writeTensor(shard.placer, `${prefix}.placer.bin`);
      }
    }
  );

  console.log("All done.");
}

const [backupFile, outputPath, ...components] = process.argv.slice(2);
dumpShards(backupFile, outputPath, ...components);
