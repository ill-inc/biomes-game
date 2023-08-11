import type { Vec2, Vec3 } from "@/shared/math/types";
import type { CppTensor } from "@/shared/wasm/types/tensors";

interface VoxelIdSetCtor {
  new (): VoxelIdSet;
}

export interface VoxelIdSet {
  add(id: number): void;
  delete(): void;
}

interface MapHeights {
  block(): Int32Array;
  flora(): Int32Array;
  water(): Int32Array;
  muck(): Int32Array;
  delete(): void;
}

interface MapHeightsBuilderCtor {
  new (
    origin: Vec3,
    shape: Vec2,
    blockFilter: VoxelIdSet,
    floraFilter: VoxelIdSet
  ): MapHeightsBuilder;
}

interface MapHeightsBuilder {
  loadTerrain(pos: Vec3, shard: CppTensor<"U32">): void;
  loadWater(pos: Vec3, shard: CppTensor<"U8">): void;
  loadMuck(pos: Vec3, shard: CppTensor<"U8">): void;
  build(): MapHeights;
  delete(): void;
}

export interface MappingModule {
  VoxelIdSet: VoxelIdSetCtor;
  MapHeightsBuilder: MapHeightsBuilderCtor;
}
