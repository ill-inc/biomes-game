import { EAGER_EXPIRATION_MS } from "@/shared/constants";
import { using } from "@/shared/deletable";
import { makeDisposable } from "@/shared/disposable";
import type { IndexedEcsResourcePaths } from "@/shared/game/ecs_indexed_resources";
import { addTensorWithBoundaryHash } from "@/shared/game/resources/tensor_boundary_hashes";
import type { WaterOnlyResourcePaths } from "@/shared/game/resources/water";
import { TerrainRestorationDiffReader } from "@/shared/game/restoration";
import type { ShardId } from "@/shared/game/shard";
import { SHARD_SHAPE } from "@/shared/game/shard";
import { blockIsEmptyInTensor } from "@/shared/game/terrain_helper";
import { add } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { PathDef } from "@/shared/resources/path_map";
import type {
  TypedResourceDeps,
  TypedResources,
} from "@/shared/resources/types";
import { Cval } from "@/shared/util/cvals";
import type { Optional } from "@/shared/util/type_helpers";
import { loadBlockWrapper } from "@/shared/wasm/biomes";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type {
  BoxBlock,
  Material,
  SparseBlock,
  VolumeBlock,
} from "@/shared/wasm/types/biomes";
import type { TensorBoundaryHashes } from "@/shared/wasm/types/tensors";

export interface EagerEdit {
  position: ReadonlyVec3;
  material: number;
  createdAt: number;
}

export interface EagerEdits {
  edits: EagerEdit[];
}

export interface EagerShape {
  position: ReadonlyVec3;
  isomorphism: number | undefined;
  createdAt: number;
}

export interface EagerShapes {
  shapes: EagerShape[];
}

interface TerrainOnlyResourcePaths {
  "/terrain/edits": PathDef<[ShardId], Optional<SparseBlock<Material>>>;
  "/terrain/occupancy": PathDef<[ShardId], Optional<Tensor<"F64">>>;
  "/terrain/placer": PathDef<[ShardId], Optional<Tensor<"F64">>>;
  "/terrain/farming": PathDef<[ShardId], Optional<Tensor<"F64">>>;
  "/terrain/growth": PathDef<[ShardId], Tensor<"U8">>;
  "/terrain/dye": PathDef<[ShardId], Tensor<"U8">>;
  "/terrain/dye/boundary_hashes": PathDef<
    [ShardId],
    Promise<Optional<TensorBoundaryHashes>>
  >;
  "/terrain/moisture": PathDef<[ShardId], Tensor<"U8">>;
  "/terrain/muck": PathDef<[ShardId], Tensor<"U8">>;
  "/terrain/volume": PathDef<[ShardId], Optional<VolumeBlock<Material>>>;
  "/terrain/tensor": PathDef<[ShardId], Optional<Tensor<Material>>>;
  "/terrain/boxes": PathDef<[ShardId], Optional<BoxBlock>>;
  "/terrain/empty": PathDef<[ShardId], boolean>;
  "/terrain/eager_edits": PathDef<[ShardId], EagerEdits>;
  "/terrain/eager_shapes": PathDef<[ShardId], EagerShapes>;
  "/terrain/restorations": PathDef<[ShardId], TerrainRestorationDiffReader>;
  "/terrain/pathfinding/human_can_occupy": PathDef<
    [ShardId],
    HumanCanOccupyChecker
  >;
}

class HumanCanOccupyChecker {
  private terrain: Optional<Tensor<"U32">>;
  private canOccupy: Map<string, boolean> = new Map();
  constructor(deps: TerrainResourceDeps, shardId: ShardId) {
    this.terrain = deps.get("/terrain/tensor", shardId);
  }

  private isEmpty(position: ReadonlyVec3): boolean {
    return blockIsEmptyInTensor(position, this.terrain);
  }

  check(position: ReadonlyVec3) {
    const key = position.toString();
    let free = this.canOccupy.get(key);
    if (free === undefined) {
      free =
        !this.isEmpty(add(position, [0, -1, 0])) &&
        this.isEmpty(position) &&
        this.isEmpty(add(position, [0, 1, 0]));

      this.canOccupy.set(key, free);
    }
    return free;
  }
}

export type TerrainResourcePaths = TerrainOnlyResourcePaths &
  WaterOnlyResourcePaths &
  IndexedEcsResourcePaths;
export type TerrainResourceDeps = TypedResourceDeps<TerrainResourcePaths>;

const terrainTensorBytes = new Cval({
  path: ["memory", "terrainTensorBytes"],
  help: "Total size in bytes of cached terrain tensors.",
  initialValue: 0,
});

function genTerrainHumanPathfindingChecker(
  deps: TerrainResourceDeps,
  shardId: ShardId
) {
  return new HumanCanOccupyChecker(deps, shardId);
}

function genTerrainOccupancy(
  voxeloo: VoxelooModule,
  deps: TerrainResourceDeps,
  shardId: ShardId
) {
  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard?.shard_occupancy) {
    return;
  }

  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "F64");
  tensor.load(shard.shard_occupancy.buffer);
  return makeDisposable(tensor, () => {
    tensor.delete();
  });
}

function genTerrainPlacer(
  voxeloo: VoxelooModule,
  deps: TerrainResourceDeps,
  shardId: ShardId
) {
  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard?.shard_placer) {
    return;
  }

  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "F64");
  tensor.load(shard.shard_placer.buffer);
  return makeDisposable(tensor, () => {
    tensor.delete();
  });
}

function genTerrainFarming(
  voxeloo: VoxelooModule,
  deps: TerrainResourceDeps,
  shardId: ShardId
) {
  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard?.shard_farming) {
    return;
  }
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "F64");
  tensor.load(shard.shard_farming.buffer);
  return makeDisposable(tensor, () => {
    tensor.delete();
  });
}

function genTerrainGrowth(
  voxeloo: VoxelooModule,
  deps: TerrainResourceDeps,
  shardId: ShardId
) {
  const shard = deps.get("/ecs/terrain", shardId);
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
  tensor.load(shard?.shard_growth?.buffer);
  return makeDisposable(tensor, () => {
    tensor.delete();
  });
}

function genTerrainDye(
  voxeloo: VoxelooModule,
  deps: TerrainResourceDeps,
  shardId: ShardId
) {
  const shard = deps.get("/ecs/terrain", shardId);
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
  tensor.load(shard?.shard_dye?.buffer);
  return makeDisposable(tensor, () => {
    tensor.delete();
  });
}

function genTerrainMoisture(
  voxeloo: VoxelooModule,
  deps: TerrainResourceDeps,
  shardId: ShardId
) {
  const shard = deps.get("/ecs/terrain", shardId);
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
  tensor.load(shard?.shard_moisture?.buffer);
  return makeDisposable(tensor, () => {
    tensor.delete();
  });
}

function genTerrainMuck(
  voxeloo: VoxelooModule,
  deps: TerrainResourceDeps,
  shardId: ShardId
) {
  const shard = deps.get("/ecs/terrain", shardId);
  const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "U8");
  tensor.load(shard?.shard_muck?.buffer);
  return makeDisposable(tensor, () => {
    tensor.delete();
  });
}

function genTerrainEdits(
  voxeloo: VoxelooModule,
  deps: TerrainResourceDeps,
  shardId: ShardId
) {
  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard) {
    return;
  }

  const block = new voxeloo.SparseBlock_U32();
  loadBlockWrapper(voxeloo, block, shard.shard_diff);

  return makeDisposable(block, () => {
    block.delete();
  });
}

function genTerrainVolume(
  voxeloo: VoxelooModule,
  deps: TerrainResourceDeps,
  shardId: ShardId
) {
  const ret = new voxeloo.VolumeBlock_U32();
  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard) {
    return makeDisposable(ret, () => {
      ret.delete();
    });
  }

  // Initialize the volume with the seed data.
  loadBlockWrapper(voxeloo, ret, shard.shard_seed);

  // Apply deltas on top of the base volume.
  const edits = deps.get("/terrain/edits", shardId);
  if (edits) {
    ret.assign(edits);
  }

  if (!process.env.IS_SERVER) {
    const eagerEdits = deps.get("/terrain/eager_edits", shardId);
    const time = Date.now();
    for (const edit of eagerEdits.edits) {
      if (time < edit.createdAt + EAGER_EXPIRATION_MS) {
        ret.set(...edit.position, edit.material);
      }
    }
  }

  return makeDisposable(ret, () => {
    ret.delete();
  });
}

function genTerrainTensor(
  voxeloo: VoxelooModule,
  deps: TerrainResourceDeps,
  shardId: ShardId
) {
  const volume = deps.get("/terrain/volume", shardId);
  if (!volume || volume.empty()) {
    return;
  }

  const tensor = new Tensor(voxeloo, voxeloo.toTerrainTensor(volume));
  const tensorSize = tensor.storageSize();
  terrainTensorBytes.value += tensorSize;
  return makeDisposable(tensor, () => {
    terrainTensorBytes.value -= tensorSize;
    tensor.delete();
  });
}

function genTerrainBoxes(
  voxeloo: VoxelooModule,
  deps: TerrainResourceDeps,
  shardId: ShardId
) {
  const shard = deps.get("/ecs/terrain", shardId);
  if (!shard) {
    return;
  }

  const block = deps.get("/terrain/volume", shardId);
  if (!block || block.empty()) {
    return;
  }

  // HACK(taylor): Clear non-occluding blocks.
  return using(voxeloo.clearNonCollidingBlocks(block), (block) => {
    const boxes = voxeloo.to_boxes(block.mask(), shard.box.v0);
    return makeDisposable(boxes, () => boxes.delete());
  });
}

function genTerrainEmpty(deps: TerrainResourceDeps, shardId: ShardId) {
  const terrain = deps.get("/terrain/volume", shardId);
  if (!terrain) {
    return true;
  }
  if (!terrain.empty()) {
    return false;
  }
  const water = deps.get("/water/tensor", shardId);
  return water.zero();
}

function genTerrainRestore(deps: TerrainResourceDeps, shardId: ShardId) {
  const shard = deps.get("/ecs/terrain", shardId);
  return new TerrainRestorationDiffReader(shard?.terrain_restoration_diff);
}

export type TerrainResources = TypedResources<TerrainResourcePaths>;
type TerrainResourcesBuilder = BiomesResourcesBuilder<TerrainResourcePaths>;

export function addSharedTerrainResources(
  voxeloo: VoxelooModule,
  builder: TerrainResourcesBuilder
) {
  builder.add("/terrain/edits", (deps, shard) =>
    genTerrainEdits(voxeloo, deps, shard)
  );
  builder.add("/terrain/occupancy", (deps, shard) =>
    genTerrainOccupancy(voxeloo, deps, shard)
  );
  builder.add("/terrain/placer", (deps, shard) =>
    genTerrainPlacer(voxeloo, deps, shard)
  );
  builder.add("/terrain/farming", (deps, shard) =>
    genTerrainFarming(voxeloo, deps, shard)
  );
  builder.add("/terrain/growth", (deps, shard) =>
    genTerrainGrowth(voxeloo, deps, shard)
  );
  builder.add("/terrain/moisture", (deps, shard) =>
    genTerrainMoisture(voxeloo, deps, shard)
  );
  builder.add("/terrain/muck", (deps, shard) =>
    genTerrainMuck(voxeloo, deps, shard)
  );
  builder.add("/terrain/volume", (deps, shard) =>
    genTerrainVolume(voxeloo, deps, shard)
  );
  builder.add("/terrain/tensor", (deps, shard) =>
    genTerrainTensor(voxeloo, deps, shard)
  );
  builder.add("/terrain/boxes", (deps, shard) =>
    genTerrainBoxes(voxeloo, deps, shard)
  );
  builder.add("/terrain/empty", genTerrainEmpty);
  builder.add("/terrain/restorations", genTerrainRestore);
  builder.add(
    "/terrain/pathfinding/human_can_occupy",
    genTerrainHumanPathfindingChecker
  );
  addTensorWithBoundaryHash(builder, "/terrain/dye", (deps, shard) =>
    genTerrainDye(voxeloo, deps, shard)
  );
  builder.addDynamic(
    "/terrain/eager_edits",
    (_deps: TerrainResourceDeps, _key: ShardId) => ({ edits: [] }),
    (_deps: TerrainResourceDeps, resource: any) => resource
  );
  builder.addDynamic(
    "/terrain/eager_shapes",
    (_deps: TerrainResourceDeps, _key: ShardId) => ({ shapes: [] }),
    (_deps: TerrainResourceDeps, resource: any) => resource
  );
}
