import { positionHash } from "@/cayley/graphics/utils";
import { terrainCollides } from "@/shared/asset_defs/quirk_helpers";
import type { Isomorphism } from "@/shared/asset_defs/shapes";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import { using } from "@/shared/deletable";
import type { ShardId } from "@/shared/ecs/gen/types";
import {
  isBlockId,
  isFloraId,
  toBlockId,
  toFloraId,
  toShapeId,
} from "@/shared/game/ids";
import type {
  BlockResourceDeps,
  BlockResources,
} from "@/shared/game/resources/blocks";
import type { IsomorphismResourcePaths } from "@/shared/game/resources/isomorphisms";
import type { LightingResourcePaths } from "@/shared/game/resources/light";
import type {
  TerrainResourcePaths,
  TerrainResources,
} from "@/shared/game/resources/terrain";
import {
  blockPos,
  shardAlign,
  shardToVoxelPos,
  voxelShard,
  voxelToShardPos,
} from "@/shared/game/shard";
import { add, containsAABB, sub } from "@/shared/math/linear";
import type { ReadonlyAABB, ReadonlyVec3 } from "@/shared/math/types";
import type {
  TypedResourceDeps,
  TypedResources,
} from "@/shared/resources/types";
import type { Optional } from "@/shared/util/type_helpers";
import { loadBlockWrapper } from "@/shared/wasm/biomes";
import type { DataType, Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { VolumeBlock } from "@/shared/wasm/types/biomes";

export type ShardIndex<T> = (shardId: ShardId) => T | undefined;
type TerrainHelperResourcePaths = TerrainResourcePaths &
  LightingResourcePaths &
  IsomorphismResourcePaths;

type TerrainHelperResources =
  | TypedResources<TerrainHelperResourcePaths>
  | TypedResourceDeps<TerrainHelperResourcePaths>;
export class TerrainHelper {
  constructor(
    private readonly voxeloo: VoxelooModule,
    private seedIndex: ShardIndex<VolumeBlock<"U32">>,
    private terrainIndex: ShardIndex<Tensor<"U32">>,
    private isomorphismIndex: ShardIndex<Tensor<"U32">>,
    private irradianceIndex: ShardIndex<Tensor<"U32">>,
    private skyOcclusionIndex: ShardIndex<Tensor<"U8">>,
    private muckIndex: ShardIndex<Tensor<"U8">>,
    private waterIndex: ShardIndex<Tensor<"U8">>,
    private dyeIndex: ShardIndex<Tensor<"U8">>,
    private moistureIndex: ShardIndex<Tensor<"U8">>,
    private placerIndex: ShardIndex<Tensor<"F64">>,
    private occupancyIndex: ShardIndex<Tensor<"F64">>
  ) {}

  static fromResources(
    voxeloo: VoxelooModule,
    resources: TerrainHelperResources
  ) {
    return new TerrainHelper(
      voxeloo,
      (id: ShardId) => resources.get("/terrain/volume", id),
      (id: ShardId) => resources.get("/terrain/tensor", id),
      (id: ShardId) => resources.get("/terrain/isomorphisms", id),
      (id: ShardId) => resources.get("/lighting/irradiance", id),
      (id: ShardId) => resources.get("/lighting/sky_occlusion", id),
      (id: ShardId) => resources.get("/terrain/muck", id),
      (id: ShardId) => resources.get("/water/tensor", id),
      (id: ShardId) => resources.get("/terrain/dye", id),
      (id: ShardId) => resources.get("/terrain/moisture", id),
      (id: ShardId) => resources.get("/terrain/placer", id),
      (id: ShardId) => resources.get("/terrain/occupancy", id)
    );
  }

  isLoaded(pos: ReadonlyVec3) {
    return !!this.terrainIndex(voxelShard(...pos));
  }

  isBlockID(pos: ReadonlyVec3) {
    return isBlockId(this.getTerrainID(pos));
  }

  isFloraID(pos: ReadonlyVec3) {
    return isFloraId(this.getTerrainID(pos));
  }

  getSeedID(pos: ReadonlyVec3) {
    return this.seedIndex(voxelShard(...pos))?.get(...blockPos(...pos)) ?? 0;
  }

  getTerrainID(pos: ReadonlyVec3) {
    return getFromChunk(this.terrainIndex, pos);
  }

  getBlockID(pos: ReadonlyVec3) {
    return this.isBlockID(pos) ? toBlockId(this.getTerrainID(pos)) : 0;
  }

  getFloraID(pos: ReadonlyVec3) {
    return this.isFloraID(pos) ? toFloraId(this.getTerrainID(pos)) : 0;
  }

  getIsomorphismID(pos: ReadonlyVec3) {
    return getFromChunk(this.isomorphismIndex, pos);
  }

  getShapeID(pos: ReadonlyVec3) {
    return toShapeId(this.getIsomorphismID(pos));
  }

  getPlacerID(pos: ReadonlyVec3) {
    return getFromChunk(this.placerIndex, pos);
  }

  getOccupancyID(pos: ReadonlyVec3) {
    return getFromChunk(this.occupancyIndex, pos);
  }

  getIrradiance(pos: ReadonlyVec3) {
    return getFromChunk(this.irradianceIndex, pos);
  }

  getSkyOcclusion(pos: ReadonlyVec3) {
    return getFromChunk(this.skyOcclusionIndex, pos);
  }

  getPeakLight(pos: ReadonlyVec3) {
    return Math.max(15 - this.getSkyOcclusion(pos), this.getIrradiance(pos));
  }

  getMuck(pos: ReadonlyVec3) {
    return getFromChunk(this.muckIndex, pos);
  }

  getDye(pos: ReadonlyVec3) {
    return getFromChunk(this.dyeIndex, pos);
  }

  getWater(pos: ReadonlyVec3) {
    return getFromChunk(this.waterIndex, pos);
  }

  getMoisture(pos: ReadonlyVec3) {
    return getFromChunk(this.moistureIndex, pos);
  }

  isMucky(pos: ReadonlyVec3) {
    return isMucky(pos, this.getMuck(pos));
  }

  iterTerrain(aabb: ReadonlyAABB) {
    return iterChunks(this.voxeloo, this.terrainIndex, aabb);
  }

  iterTerrainChunk(pos: ReadonlyVec3) {
    return iterChunk(this.voxeloo, this.terrainIndex, pos);
  }
}

function getFromChunk<T extends DataType>(
  index: ShardIndex<Tensor<T>>,
  pos: ReadonlyVec3,
  fallback = 0
) {
  return index(voxelShard(...pos))?.get(...blockPos(...pos)) ?? fallback;
}

function* iterChunk<T extends DataType>(
  voxeloo: VoxelooModule,
  index: ShardIndex<Tensor<T>>,
  pos: ReadonlyVec3
) {
  const chunk = index(voxelShard(...pos));
  if (chunk) {
    const origin = shardAlign(...pos);
    for (const [pos, val] of chunk) {
      yield [add(origin, pos), val] as const;
    }
  }
}

function* iterChunks<T extends DataType>(
  voxeloo: VoxelooModule,
  index: ShardIndex<Tensor<T>>,
  aabb: ReadonlyAABB
) {
  const [x0, y0, z0] = voxelToShardPos(...aabb[0]);
  const [x1, y1, z1] = voxelToShardPos(...sub(aabb[1], [1, 1, 1]));
  for (let z = z0; z <= z1; z += 1) {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        for (const [pos, val] of iterChunk(
          voxeloo,
          index,
          shardToVoxelPos(x, y, z)
        )) {
          if (containsAABB(aabb, pos)) {
            yield [pos, val] as const;
          }
        }
      }
    }
  }
}

// Returns whether a given voxel position is considered "mucky" which takes into
// account the muck level and the position for a procedural dithering effect.
export function isMucky(pos: ReadonlyVec3, muck: number) {
  if (muck == 0) {
    return false;
  } else if (muck == 1) {
    return positionHash(blockPos(...pos)) % 3 != 0;
  } else {
    return true;
  }
}

export const FULL_BLOCK_ISOMORPHISM_ID = 0;

export function getIsomorphismIdAtPosition(
  voxeloo: VoxelooModule,
  resources: TerrainResources,
  pos: ReadonlyVec3
): number | undefined {
  const shardId = voxelShard(...pos);

  const entity = resources.get("/ecs/terrain", shardId);
  if (!entity) {
    return undefined;
  }
  const blockPosition = blockPos(...pos);
  return using(new voxeloo.SparseBlock_U32(), (shapes) => {
    loadBlockWrapper(voxeloo, shapes, entity.shard_shapes);
    return shapes.get(...blockPosition);
  });
}

// Predicate to check if the block occupying a given position is empty.
// If not present on client it is assumed to be non-empty.
export function blockIsEmpty(
  pos: ReadonlyVec3,
  resources: TerrainResources
): boolean {
  const shardId = voxelShard(...pos);
  const block = resources.get("/terrain/tensor", shardId);
  return blockIsEmptyInTensor(pos, block);
}

// Checks if a world position is empty given the local terrain tensor,
// If the local tensor is undefined, it is assumed to be non-empty.
export function blockIsEmptyInTensor(
  position: ReadonlyVec3,
  terrain: Optional<Tensor<"U32">>
): boolean {
  if (terrain === undefined) {
    return false;
  }
  const blockLocal = blockPos(...position);
  const terrainId = terrain.get(...blockLocal);
  return terrainId === undefined || !terrainCollides(terrainId);
}

export function getTerrainIdAndIsomorphismAtPosition(
  resources: BlockResources | BlockResourceDeps,
  worldPos: ReadonlyVec3
): [TerrainID | undefined, Isomorphism | undefined] {
  const shardId = voxelShard(...worldPos);
  const pos = blockPos(...worldPos);
  const isomorphismTensor = resources.get(
    "/terrain/block/isomorphisms",
    shardId
  );
  if (!isomorphismTensor || isomorphismTensor.zero()) {
    return [undefined, undefined];
  }
  const editsBlock = resources.get("/terrain/volume", shardId);
  const terrainId = editsBlock?.get(...pos);
  const isomorphism = isomorphismTensor.get(...pos);
  return [terrainId, isomorphism];
}
