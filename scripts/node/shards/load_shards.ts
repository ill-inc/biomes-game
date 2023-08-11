import {
  createSyncClient,
  determineEmployeeUserId,
} from "@/server/shared/bootstrap/sync";
import { createSignedApplyRequest } from "@/server/shared/ecs/untrusted";
import { scriptInit } from "@/server/shared/script_init";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { ChangeToApply } from "@/shared/api/transaction";
import { allShardComponents } from "@/shared/batch/shards";
import { batchAsync, promptToContinue } from "@/shared/batch/util";
import { using, usingAll } from "@/shared/deletable";
import {
  ShardDiff,
  ShardOccupancy,
  ShardPlacer,
  ShardSeed,
  ShardShapes,
  ShardWater,
} from "@/shared/ecs/gen/components";
import { Entity } from "@/shared/ecs/gen/entities";
import { SHARD_SHAPE, voxelToShardPos } from "@/shared/game/shard";
import { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { saveBlockWrapper } from "@/shared/wasm/biomes";
import { makeDynamicBuffer } from "@/shared/wasm/buffers";
import { DataType, Tensor } from "@/shared/wasm/tensors";
import { VoxelooModule } from "@/shared/wasm/types";
import { AABB, SparseBlock, VolumeBlock } from "@/shared/wasm/types/biomes";
import { ok } from "assert";
import { existsSync, readFileSync } from "fs";
import { glob } from "glob";

interface ShardMeta {
  id: BiomesId;
  box: AABB;
  version: number;
}

function readMeta(path: string): ShardMeta {
  return JSON.parse(readFileSync(path).toString());
}

function toShardName(meta: ShardMeta) {
  return voxelToShardPos(...meta.box[0]).join("_");
}

const voxeloo = await loadVoxeloo();

function readVolumeU32(
  voxeloo: VoxelooModule,
  path: string,
  fn: (block: VolumeBlock<"U32">) => void
) {
  if (existsSync(path)) {
    const data = readFileSync(path);
    usingAll(
      [makeDynamicBuffer(voxeloo, "U8"), new voxeloo.VolumeBlock_U32()],
      (buffer, block) => {
        buffer.assign(data);
        block.loadBuffer(buffer);
        fn(block);
      }
    );
  }
}

function readSparseU32(
  voxeloo: VoxelooModule,
  path: string,
  fn: (block: SparseBlock<"U32">) => void
) {
  if (existsSync(path)) {
    const data = readFileSync(path);
    usingAll(
      [makeDynamicBuffer(voxeloo, "U8"), new voxeloo.SparseBlock_U32()],
      (buffer, block) => {
        buffer.assign(data);
        block.loadBuffer(buffer);
        fn(block);
      }
    );
  }
}

function readTensor<T extends DataType>(
  path: string,
  dtype: T,
  fn: (tensor: Tensor<T>) => void
) {
  if (existsSync(path)) {
    const data = readFileSync(path);
    using(Tensor.make(voxeloo, SHARD_SHAPE, dtype), (tensor) => {
      tensor.load(data);
      fn(tensor);
    });
  }
}

export async function loadShards(inputPath: string, ...components: string[]) {
  if (!inputPath || !components.length) {
    log.fatal(`Usage: node load_shards.js <input_path> [components...]`);
    return;
  }

  // Validate that the requested components are valid.
  ok(allShardComponents(components));
  console.log(`Uploading [${components.join(", ")}] from "${inputPath}"`);
  await scriptInit(["untrusted-apply-token"]);
  const voxeloo = await loadVoxeloo();

  // Read in the metadata for each f ile to write.
  const transactions: ChangeToApply[] = [];
  for (const path of glob.sync(`${inputPath}/*.meta.json`)) {
    const meta = readMeta(path);
    const name = toShardName(meta);

    const entity: Entity = { id: meta.id };
    if (components.includes("seed")) {
      readVolumeU32(voxeloo, `${inputPath}/${name}.seed.bin`, (block) => {
        entity.shard_seed = ShardSeed.create(saveBlockWrapper(voxeloo, block));
      });
    }
    if (components.includes("diff")) {
      readSparseU32(voxeloo, `${inputPath}/${name}.diff.bin`, (block) => {
        entity.shard_diff = ShardDiff.create(saveBlockWrapper(voxeloo, block));
      });
    }
    if (components.includes("shapes")) {
      readSparseU32(voxeloo, `${inputPath}/${name}.shapes.bin`, (block) => {
        entity.shard_shapes = ShardShapes.create(
          saveBlockWrapper(voxeloo, block)
        );
      });
    }
    if (components.includes("occupancy")) {
      readTensor(`${inputPath}/${name}.occupancy.bin`, "F64", (tensor) => {
        entity.shard_occupancy = ShardOccupancy.create(tensor.saveWrapped());
      });
    }
    if (components.includes("placer")) {
      readTensor(`${inputPath}/${name}.placer.bin`, "F64", (tensor) => {
        entity.shard_placer = ShardPlacer.create(tensor.saveWrapped());
      });
    }
    if (components.includes("water")) {
      readTensor(`${inputPath}/${name}.water.bin`, "U8", (tensor) => {
        entity.shard_water = ShardWater.create(tensor.saveWrapped());
      });
    }

    // Append the updated entity components.
    transactions.push({
      iffs: [[meta.id, meta.version]],
      changes: [
        {
          kind: "update",
          entity: entity,
        },
      ],
    });
  }

  // Writing changes.
  console.log(`Updating ${transactions.length} shards.`);
  await promptToContinue();

  // FIgure out who we are.
  console.log("Acquiring credentials...");
  const userId = await determineEmployeeUserId();
  const client = await createSyncClient(userId);

  // Actually perform the world update.
  console.log("Submitting changes...");
  for (const batch of batchAsync(transactions, 100)) {
    const request = createSignedApplyRequest(userId, batch);
    const response = await client.apply(request);
    console.log(response);
  }

  await client.close();
  console.log("All done.");
}

const [inputPath, ...components] = process.argv.slice(2);
loadShards(inputPath, ...components);
