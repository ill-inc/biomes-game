import type { Isomorphism } from "@/shared/asset_defs/shapes";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import type { ReadonlyBox } from "@/shared/ecs/gen/components";
import type { ReadonlyDeltaWith } from "@/shared/ecs/gen/delta";
import type { ReadonlyEntityWith } from "@/shared/ecs/gen/entities";
import { scanGroupTensor } from "@/shared/game/group";
import { getAabbForPlaceable } from "@/shared/game/placeables";
import type { ShardId } from "@/shared/game/shard";
import {
  SHARD_SHAPE,
  blockPos,
  shardDecode,
  voxelShard,
} from "@/shared/game/shard";
import type { Terrain } from "@/shared/game/terrain/terrain";
import type { BiomesId } from "@/shared/ids";
import {
  aabbIterator,
  add,
  ceil,
  centerAABB,
  floor,
  sub,
} from "@/shared/math/linear";
import type { ReadonlyAABB, ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type {
  BlockGroupEntry,
  FloraGroupEntry,
  GlassGroupEntry,
  GroupTensor,
} from "@/shared/wasm/types/galois";
import { ok } from "assert";

export type TerrainIterator = Iterable<{
  worldPos: Vec3;
  blockPos: Vec3;
  shardId: ShardId;
  terrain: Terrain;
}>;

const epsilon = [1e-9, 1e-9, 1e-9] as const;

export class AabbTerrainIterator implements TerrainIterator {
  constructor(private allTerrain: Terrain[], private aabb: ReadonlyAABB) {}

  *[Symbol.iterator]() {
    for (const worldPos of aabbIterator([
      floor(add(this.aabb[0], epsilon)),
      ceil(sub(this.aabb[1], epsilon)),
    ])) {
      const bp = blockPos(...worldPos);
      const shardId = voxelShard(...worldPos);
      const terrain = this.allTerrain.find((t) => t.shardId === shardId);
      ok(
        terrain,
        `Expected terrain to be passed in that matches shard id ${shardDecode(
          shardId
        )}`
      );
      if (terrain) {
        yield { worldPos, blockPos: bp, shardId, terrain };
      }
    }
  }
}

export function* scanAabbTerrainOccupancy(
  voxeloo: VoxelooModule,
  allTerrain: ReadonlyEntityWith<"id">[],
  aabb: ReadonlyAABB
) {
  const shardIdToOccupancy = new Map<ShardId, Tensor<"F64">>();
  try {
    for (const entity of allTerrain) {
      if (entity.shard_occupancy) {
        const tensor = Tensor.make(voxeloo, SHARD_SHAPE, "F64");
        tensor.load(entity.shard_occupancy.buffer);
        shardIdToOccupancy.set(
          voxelShard(...centerAABB([entity.box!.v0, entity.box!.v1])),
          tensor
        );
      }
    }

    for (const worldPos of aabbIterator([
      floor(add(aabb[0], epsilon)),
      ceil(sub(aabb[1], epsilon)),
    ])) {
      const bp = blockPos(...worldPos);
      const shardId = voxelShard(...worldPos);
      const occupancy = shardIdToOccupancy.get(shardId);
      if (occupancy) {
        yield {
          worldPos,
          blockPos: bp,
          shardId,
          occupancyId: occupancy.get(...bp) as BiomesId,
        };
      }
    }
  } finally {
    for (const occupancy of shardIdToOccupancy.values()) {
      occupancy.delete();
    }
  }
}

export class GroupTensorTerrainIterator
  implements
    Iterable<{
      tensorPos: Vec3;
      worldPos: Vec3;
      blockPos: Vec3;
      shardId: ShardId;
      terrain: Terrain;
      tensorEntry: BlockGroupEntry | GlassGroupEntry | FloraGroupEntry;
    }>
{
  constructor(
    private allTerrain: Terrain[],
    private tensor: GroupTensor,
    private box: ReadonlyBox
  ) {}

  *[Symbol.iterator]() {
    for (const { tensorPos, tensorEntry } of scanGroupTensor(this.tensor)) {
      const worldPos = add(tensorPos, this.box.v0);
      const bp = blockPos(...worldPos);
      const shardId = voxelShard(...worldPos);
      const terrain = this.allTerrain.find((t) => t.shardId === shardId);
      ok(
        terrain,
        `Expected terrain to be passed in that matches shard id ${shardDecode(
          shardId
        )}`
      );
      yield {
        tensorPos,
        worldPos,
        blockPos: bp,
        shardId,
        terrain,
        tensorEntry,
      };
    }
  }
}

export class GroupTensorAndPlaceablesTerrainIterator
  implements
    Iterable<{
      worldPos: Vec3;
      occupancyId: BiomesId | undefined;
      terrainId: TerrainID | undefined;
      terrainIsomorphism: Isomorphism | undefined;
    }>
{
  constructor(
    private allTerrain: Terrain[],
    private tensor: GroupTensor,
    private box: ReadonlyBox,
    private placeables:
      | ReadonlyDeltaWith<"placeable_component" | "position" | "orientation">[]
      | undefined
  ) {}

  *[Symbol.iterator]() {
    const positionInfo = (blockPos: ReadonlyVec3, terrain: Terrain) => {
      const occupancyId = terrain.occupancy.get(...blockPos) as BiomesId;
      const terrainId =
        terrain.diff.get(...blockPos) ?? terrain.seed.get(...blockPos);
      const terrainIsomorphism = terrain.shapes.get(...blockPos);
      return {
        occupancyId: occupancyId ? occupancyId : undefined,
        terrainId,
        terrainIsomorphism,
      };
    };

    // Iterate over group tensor.
    for (const {
      worldPos,
      blockPos,
      terrain,
    } of new GroupTensorTerrainIterator(
      this.allTerrain,
      this.tensor,
      this.box
    )) {
      yield {
        worldPos,
        ...positionInfo(blockPos, terrain),
      };
    }

    // Iterate over placeables.
    for (const placeable of this.placeables ?? []) {
      const aabb = getAabbForPlaceable(
        placeable.placeableComponent().item_id,
        placeable.position().v,
        placeable.orientation().v
      );
      ok(aabb);
      for (const { worldPos, blockPos, terrain } of new AabbTerrainIterator(
        this.allTerrain,
        aabb
      )) {
        yield {
          worldPos,
          ...positionInfo(blockPos, terrain),
        };
      }
    }
  }
}
