import type { ShardId } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import type { SparseBlock, VolumeBlock } from "@/shared/wasm/types/biomes";
import type { DynamicBuffer } from "@/shared/wasm/types/buffer";
import type { Vec3i } from "@/shared/wasm/types/common";
import type { Occluder } from "@/shared/wasm/types/culling";
import type { CppTensor } from "@/shared/wasm/types/tensors";

// Tensor types
export type TerrainTensor = CppTensor<"U32">;
export type BlockTensor = CppTensor<"U32">;
export type GlassTensor = CppTensor<"U32">;
export type FloraTensor = CppTensor<"U32">;
export type IsomorphismTensor = CppTensor<"U32">;
export type OcclusionTensor = CppTensor<"U8">;
export type SkyOcclusionTensor = CppTensor<"U8">;
export type IrradianceTensor = CppTensor<"U32">;
export type WaterTensor = CppTensor<"U8">;
export type DyeTensor = CppTensor<"U8">;
export type MoistureTensor = CppTensor<"U8">;
export type BlockSampleTensor = CppTensor<"U32">;
export type GrowthTensor = CppTensor<"U8">;
export type MuckTensor = CppTensor<"U8">;

// Buffer types

interface RankBuffer {
  rankShape(): [number, number];
  dataShape(): [number, number];
  rankView(): Uint32Array;
  dataView(): Uint32Array;
  delete(): void;
}

export type LightingBuffer = RankBuffer;
export type BlockMaterialBuffer = RankBuffer;
export type FloraMaterialBuffer = RankBuffer;
export type WaterMaterialBuffer = RankBuffer;

// Terrain types
type TerrainShard = VolumeBlock<"U32">;

// Block types

export interface BlockIndexCtor {
  new (): BlockIndex;
}

export interface BlockIndex {
  load(blob: string): void;
  delete(): void;
}

export interface BlockGeometryBuffer {
  origin: Vec3i;
  empty: boolean;
  stride: number;
  indices: Uint32Array;
  vertices: Float32Array;
}

// Flora types

export interface FloraIndexCtor {
  new (): FloraIndex;
}

export interface FloraIndex {
  load(blob: string): void;
  delete(): void;
}

export interface FloraGeometryBuffer {
  origin: Vec3i;
  empty: boolean;
  stride: number;
  indices: Uint32Array;
  vertices: Float32Array;
}

// Shape types

type Isomorphism = number;

export interface ShapeIndexCtor {
  new (): ShapeIndex;
}

export interface ShapeIndex {
  load(blob: string): void;
  delete(): void;
}

// Group types

export interface GroupIndexCtor {
  new (): GroupIndex;
}

export interface GroupIndex {
  load(blob: string): void;
  delete(): void;
}

export const enum GroupEntryKind {
  EMPTY = 0,
  BLOCK = 1,
  FLORA = 2,
  GLASS = 3,
}

export interface EmptyGroupEntry {
  kind: { value: GroupEntryKind.EMPTY };
}

export function isEmptyGroupEntry(entry: GroupEntry): entry is EmptyGroupEntry {
  return entry.kind.value === GroupEntryKind.EMPTY;
}

export interface BlockGroupEntry {
  kind: { value: GroupEntryKind.BLOCK };
  block: {
    block_id: BiomesId;
    isomorphism_id: number;
    dye: number;
    moisture: number;
  };
}

export function isBlockGroupEntry(entry: GroupEntry): entry is BlockGroupEntry {
  return entry.kind.value === GroupEntryKind.BLOCK;
}

export interface FloraGroupEntry {
  kind: { value: GroupEntryKind.FLORA };
  flora: {
    flora_id: BiomesId;
    growth: number;
  };
}

export function isFloraGroupEntry(entry: GroupEntry): entry is FloraGroupEntry {
  return entry.kind.value === GroupEntryKind.FLORA;
}

export interface GlassGroupEntry {
  kind: { value: GroupEntryKind.GLASS };
  glass: {
    glass_id: BiomesId;
    isomorphism_id: number;
    dye: number;
    moisture: number;
  };
}

export function isGlassGroupEntry(entry: GroupEntry): entry is GlassGroupEntry {
  return entry.kind.value === GroupEntryKind.GLASS;
}

export type GroupEntry =
  | EmptyGroupEntry
  | BlockGroupEntry
  | GlassGroupEntry
  | FloraGroupEntry;

export interface GroupTensorCtor {
  new (): GroupTensor;
}

export interface GroupTensor {
  get(pos: Vec3): GroupEntry;
  scan(fn: (pos: Vec3, val: GroupEntry) => void): void;
  save(): string;
  load(blob: string): void;
  delete(): void;
}

export interface GroupTensorBuilderCtor {
  new (): GroupTensorBuilder;
}

export interface GroupTensorBuilder {
  setBlock(
    pos: ReadonlyVec3,
    block_id: number,
    isomorphism_id: number,
    dye_id: number,
    moisture_id: number
  ): void;
  setGlass(
    pos: ReadonlyVec3,
    glass_id: number,
    isomorphism_id: number,
    dye_id: number,
    moisture_id: number
  ): void;
  setFlora(pos: ReadonlyVec3, flora_id: number, growth: number): void;
  del(pos: ReadonlyVec3): void;
  get(pos: ReadonlyVec3): GroupEntry;
  build(): GroupTensor;
  delete(): void;
}

export interface GroupSubMesh {
  empty(): boolean;
  stride(): number;
  indices(): Uint32Array;
  vertices(): Float32Array;
  textureShape(): [number, number, 3 | 4];
  textureData(): Uint8Array;
  delete(): void;
}

export interface GroupMesh {
  blocks: GroupSubMesh;
  florae: GroupSubMesh;
  glass: GroupSubMesh;
}

// Water types
export interface WaterGeometryBuffer {
  origin: Vec3i;
  empty: boolean;
  stride: number;
  indices: Uint32Array;
  vertices: Float32Array;
}

// Collision structures
type AABB = [Vec3, Vec3];

export interface BoxListCtor {
  new (): BoxList;
}

export interface BoxList {
  size(): number;
  merge(boxes: BoxList): void;
  add(aabb: AABB): void;
  toDict(): BoxDict;
  delete(): void;
}

export interface BoxDict {
  size(): number;
  scan(fn: (aabb: AABB) => void): void;
  intersect(aabb: AABB, fn: (hit: AABB) => boolean | void): void;
  intersects(aabb: AABB): boolean;
  delete(): void;
}

export interface WireframeMesh {
  empty(): boolean;
  stride(): number;
  indices(): Uint32Array;
  vertices(): Float32Array;
  delete(): void;
}

export interface GaloisModule {
  // Block routines
  BlockIndex: BlockIndexCtor;
  ShapeIndex: ShapeIndexCtor;
  toIsomorphismTensor(tensor: SparseBlock<"U32">): IsomorphismTensor;
  toMergedIsomorphismTensor(
    tensor: BlockTensor,
    isomorphisms: IsomorphismTensor,
    defaultIsomorphism: Isomorphism
  ): IsomorphismTensor;
  toDenseIsomorphismTensor(
    tensor: TerrainTensor,
    isomorphisms: IsomorphismTensor
  ): IsomorphismTensor;
  toOcclusionTensor(
    tensor: IsomorphismTensor,
    index: ShapeIndex,
    origin: Vec3i,
    loader: (shard: ShardId) => IsomorphismTensor | undefined
  ): OcclusionTensor;
  toGlassOcclusionTensor(
    tensor: IsomorphismTensor,
    glass: GlassTensor,
    dyes: DyeTensor,
    index: ShapeIndex,
    origin: Vec3i,
    isomorphismLoader: (shard: ShardId) => IsomorphismTensor | undefined,
    glassLoader: (shard: ShardId) => GlassTensor | undefined,
    dyeLoader: (shard: ShardId) => DyeTensor | undefined
  ): OcclusionTensor;
  toSurfaceTensor(
    tensor: BlockTensor,
    occlusions: OcclusionTensor
  ): BlockTensor;
  toBlockSampleTensor(
    tensor: BlockTensor,
    dyes: DyeTensor,
    muck: MuckTensor,
    moistures: MoistureTensor,
    index: BlockIndex
  ): BlockSampleTensor;
  toBlockMaterialBuffer(
    blockSamples: BlockSampleTensor,
    growth: GrowthTensor,
    muck: MuckTensor
  ): BlockMaterialBuffer;
  toBlockGeometry(
    tensor: IsomorphismTensor,
    occlusions: OcclusionTensor,
    index: ShapeIndex,
    origin: Vec3i
  ): BlockGeometryBuffer;
  toBlockSamples(
    index: BlockIndex,
    dye: number,
    muckLevel: number,
    moistureLevel: number,
    id: number,
    out: DynamicBuffer<"U32">
  ): void;
  toIsomorphismBoxList(
    index: ShapeIndex,
    tensor: IsomorphismTensor,
    origin: Vec3
  ): BoxList;
  toIsomorphismOccluder(
    index: ShapeIndex,
    tensor: IsomorphismTensor,
    origin: Vec3
  ): Occluder;
  toWireframeMesh(tensor: GroupTensor, index: ShapeIndex): WireframeMesh;
  subvoxelRayIntersection(
    index: ShapeIndex,
    isomorphims: number,
    raySrc: Vec3,
    rayDir: Vec3
  ): number | undefined;

  // Flora routines
  FloraIndex: FloraIndexCtor;
  toFloraGeometry(
    tensor: FloraTensor,
    growths: GrowthTensor,
    mucks: MuckTensor,
    index: FloraIndex,
    origin: Vec3i
  ): FloraGeometryBuffer;
  toFloraBoxList(index: FloraIndex, tensor: FloraTensor, origin: Vec3): BoxList;
  toFloraMaterialBuffer(
    tensor: FloraTensor,
    growth: GrowthTensor,
    muck: MuckTensor,
    index: FloraIndex
  ): FloraMaterialBuffer;

  // Lighting routines
  toBlockLightingBuffer(
    tensor: BlockTensor,
    origin: Vec3i,
    isomorphismLoader: (shard: ShardId) => IsomorphismTensor | undefined,
    skyOcclusionLoader: (shard: ShardId) => SkyOcclusionTensor | undefined,
    irradianceLoader: (shard: ShardId) => IrradianceTensor | undefined
  ): LightingBuffer;
  toFloraLightingBuffer(
    tensor: FloraTensor,
    origin: Vec3i,
    isomorphismLoader: (shard: ShardId) => IsomorphismTensor | undefined,
    skyOcclusionLoader: (shard: ShardId) => SkyOcclusionTensor | undefined,
    irradianceLoader: (shard: ShardId) => IrradianceTensor | undefined
  ): LightingBuffer;
  toWaterLightingBuffer(
    tensor: WaterTensor,
    origin: Vec3i,
    isomorphismLoader: (shard: ShardId) => IsomorphismTensor | undefined,
    skyOcclusionLoader: (shard: ShardId) => SkyOcclusionTensor | undefined,
    irradianceLoader: (shard: ShardId) => IrradianceTensor | undefined
  ): LightingBuffer;

  // Terrain routines
  toBlockTensor(tensor: TerrainTensor): BlockTensor;
  toGlassTensor(tensor: TerrainTensor): GlassTensor;
  toFloraTensor(tensor: TerrainTensor): FloraTensor;
  toTerrainTensor(shard: TerrainShard): TerrainTensor;
  loadTerrainTensor(tensor: TerrainTensor, shard: TerrainShard): void;
  clearNonCollidingBlocks(shard: TerrainShard): TerrainShard; // Deprecated.

  // Group routines
  GroupIndex: GroupIndexCtor;
  GroupTensor: GroupTensorCtor;
  GroupTensorBuilder: GroupTensorBuilderCtor;
  toGroupMesh(tensor: GroupTensor, index: GroupIndex): GroupMesh;
  toGroupBoxList(index: GroupIndex, tensor: GroupTensor, origin: Vec3): BoxList;

  // Water routines
  toWaterSurface(
    tensor: WaterTensor,
    origin: Vec3i,
    waterLoader: (shard: ShardId) => WaterTensor | undefined
  ): WaterTensor;
  toWaterGeometry(
    surface: WaterTensor,
    isomorphismLoader: (shard: ShardId) => IsomorphismTensor | undefined,
    waterLoader: (shard: ShardId) => WaterTensor | undefined,
    origin: Vec3i
  ): WaterGeometryBuffer;
  toWaterBoxDict(tensor: WaterTensor, origin: Vec3i): BoxDict;
  toWaterMaterialBuffer(
    tensor: WaterTensor,
    muck: MuckTensor
  ): WaterMaterialBuffer;

  // Collision routines
  BoxList: BoxListCtor;
}
