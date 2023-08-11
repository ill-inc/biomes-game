import type { DynamicBuffer } from "@/shared/wasm/buffers";
import type { Dir, Vec3f, Vec3i } from "@/shared/wasm/types/common";

export const BLOCK_VALUE_TYPES = [
  "Bool",
  "I8",
  "I16",
  "I32",
  "I64",
  "U8",
  "U16",
  "U32",
  "U64",
  "F32",
  "F64",
] as const;

export type ValueType = (typeof BLOCK_VALUE_TYPES)[number];
export type Material = "U32";

export interface BiomesModule {
  // Common stuff
  registerErrorLogger(cb: (error: string) => void): void;
  getExceptionMessage(exceptionPtr: number): string;
  exportMetrics(): string;

  // STL Helpers
  typed_view_Vector_I8(vec: CPPVector<number>): Int8Array;
  typed_view_Vector_I16(vec: CPPVector<number>): Int16Array;
  typed_view_Vector_I32(vec: CPPVector<number>): Int32Array;
  typed_view_Vector_I64(vec: CPPVector<number>): BigInt64Array;
  typed_view_Vector_U8(vec: CPPVector<number>): Uint8Array;
  typed_view_Vector_U16(vec: CPPVector<number>): Uint16Array;
  typed_view_Vector_U32(vec: CPPVector<number>): Uint32Array;
  typed_view_Vector_U64(vec: CPPVector<number>): BigUint64Array;
  typed_view_Vector_F32(vec: CPPVector<number>): Float32Array;
  typed_view_Vector_F64(vec: CPPVector<number>): Float64Array;

  // SparseBlock constructors.
  SparseBlock_Bool: SparseBlockCtor<"Bool">;
  SparseBlock_I8: SparseBlockCtor<"I8">;
  SparseBlock_I16: SparseBlockCtor<"I16">;
  SparseBlock_I32: SparseBlockCtor<"I32">;
  SparseBlock_U8: SparseBlockCtor<"U8">;
  SparseBlock_U16: SparseBlockCtor<"U16">;
  SparseBlock_U32: SparseBlockCtor<"U32">;
  SparseBlock_F32: SparseBlockCtor<"F32">;
  SparseBlock_F64: SparseBlockCtor<"F64">;

  // VolumeBlock constructors.
  VolumeBlock_Bool: VolumeBlockCtor<"Bool">;
  VolumeBlock_I8: VolumeBlockCtor<"I8">;
  VolumeBlock_I16: VolumeBlockCtor<"I16">;
  VolumeBlock_I32: VolumeBlockCtor<"I32">;
  VolumeBlock_U8: VolumeBlockCtor<"U8">;
  VolumeBlock_U16: VolumeBlockCtor<"U16">;
  VolumeBlock_U32: VolumeBlockCtor<"U32">;

  // Index constructors
  Index_I8: IndexCtor<"I8">;
  Index_I16: IndexCtor<"I16">;
  Index_I32: IndexCtor<"I32">;
  Index_I64: IndexCtor<"I64">;
  Index_U8: IndexCtor<"U8">;
  Index_U16: IndexCtor<"U16">;
  Index_U32: IndexCtor<"U32">;
  Index_U64: IndexCtor<"U64">;

  // IndexBulder constructors
  IndexBuilder_I8: IndexBuilderCtor<"I8">;
  IndexBuilder_I16: IndexBuilderCtor<"I16">;
  IndexBuilder_I32: IndexBuilderCtor<"I32">;
  IndexBuilder_I64: IndexBuilderCtor<"I64">;
  IndexBuilder_U8: IndexBuilderCtor<"U8">;
  IndexBuilder_U16: IndexBuilderCtor<"U16">;
  IndexBuilder_U32: IndexBuilderCtor<"U32">;
  IndexBuilder_U64: IndexBuilderCtor<"U64">;

  // SparseMap constructors.
  SparseMap_Bool: SparseMapCtor<"Bool">;
  SparseMap_I8: SparseMapCtor<"I8">;
  SparseMap_I16: SparseMapCtor<"I16">;
  SparseMap_I32: SparseMapCtor<"I32">;
  SparseMap_U8: SparseMapCtor<"U8">;
  SparseMap_U16: SparseMapCtor<"U16">;
  SparseMap_U32: SparseMapCtor<"U32">;
  SparseMap_F32: SparseMapCtor<"F32">;
  SparseMap_F64: SparseMapCtor<"F64">;

  // VolumeMap constructors.
  VolumeMap_Bool: VolumeMapCtor<"Bool">;
  VolumeMap_I8: VolumeMapCtor<"I8">;
  VolumeMap_I16: VolumeMapCtor<"I16">;
  VolumeMap_I32: VolumeMapCtor<"I32">;
  VolumeMap_U8: VolumeMapCtor<"U8">;
  VolumeMap_U16: VolumeMapCtor<"U16">;
  VolumeMap_U32: VolumeMapCtor<"U32">;

  // SparseTable constructors.
  SparseTable: SparseTableCtor;

  // Material map constructors.
  TextureMap: TextureMapCtor;
  OcclusionMap: OcclusionMapCtor;

  // Lighting map constructors.
  AmbientOcclusionMap: AmbientOcclusionMapCtor;

  // Meshing routines.
  to_mesh(
    block: VolumeBlock<Material>,
    offset: Vec3i,
    textures: TextureMap
  ): BiomesMesh;
  sparse_map_to_mesh(
    map: SparseMap<Material>,
    textures: TextureMap
  ): BiomesMesh;
  volume_map_to_mesh(
    map: VolumeMap<Material>,
    textures: TextureMap
  ): BiomesMesh;
  to_compact_mesh(
    block: VolumeBlock<Material>,
    offset: Vec3i,
    textures: TextureMap,
    maskLoader: (shard_id: string) => OcclusionMask | undefined
  ): CompactMesh;
  group_mesh(mesh: BiomesMesh): GroupedMesh;
  sparse_map_to_grouped_mesh(map: SparseMap<Material>): GroupedMesh;
  volume_map_to_grouped_mesh(map: VolumeMap<Material>): GroupedMesh;

  // Lighting routines.
  compute_light_map(
    mesh: CompactMesh,
    maskLoader: (shard_id: string) => OcclusionMask | undefined,
    ambientMap: AmbientOcclusionMap
  ): LightMap;

  // Sync occlusion routines.
  traverse_mask(
    seed_blob: string,
    diff_blob: string,
    shapes_blob: string
  ): number;

  // Occlusion routines.
  to_occlusion_mask: (
    volume_map: VolumeMap<Material>,
    occlusion_map: OcclusionMap
  ) => OcclusionMask;

  // Collision routines.
  to_boxes(block: VolumeBlock<"Bool">, offset: Vec3i): BoxBlock;
  intersect_ray_aabb(origin: Vec3f, dir: Vec3f, aabb: AABB): boolean;

  // Map reductions.
  sparseMapValueCountsU32(map: SparseMap<Material>): CPPMap<number, number>;
  volumeMapValueCountsU32(map: VolumeMap<Material>): CPPMap<number, number>;
  volumeBlockValueCountsU32(map: VolumeBlock<Material>): CPPMap<number, number>;

  volumeBlockToDenseArrayU32(map: VolumeBlock<Material>): CPPVector<number>;

  // Memory analysis.
  get_total_memory(): number;
  get_used_memory(): number;
  do_leak_check(): number;
}

interface TextureMapCtor {
  new (): TextureMap;
}

interface OcclusionMapCtor {
  new (): OcclusionMap;
}

interface AmbientOcclusionMapCtor {
  new (): AmbientOcclusionMap;
}

export interface TextureMap {
  set(mat: number, dir: Dir, idx: number): void;
  get(mat: number, dir: Dir): number;
  delete(): void;
}

export interface OcclusionMap {
  set(mat: number): void;
  get(mat: number): boolean;
  delete(): void;
}

export interface OcclusionMask {
  // This object is opaque to TypeScript.
  delete(): void;
}

export interface LightMap {
  data(): Uint8Array;
  shape(): Vec3i;
  delete(): void;
}

export interface AmbientOcclusionMap {
  set(mask: number, occlusion: number): void;
  get(mask: number): number;
  delete(): void;
}

export type AABB = [Vec3i, Vec3i];

export interface BoxBlock {
  scan(fn: (aabb: AABB) => void): void;
  intersect(aabb: AABB, fn: (hit: AABB) => boolean | void): void;
  delete(): void;
}

export interface BiomesMesh {
  indicesView(): Uint32Array;
  verticesView(): Float32Array;
  empty(): boolean;
  stride(): number;
  delete(): void;
}

export interface CompactMesh {
  origin(): Vec3i;
  indicesView(): Uint32Array;
  verticesView(): Uint32Array;
  empty(): boolean;
  stride(): number;
  delete(): void;
}

export interface GroupedMesh {
  groupView: (group: number) => Uint32Array;
  indicesView: () => Uint32Array;
  verticesView: () => Float32Array;
  materialsView: () => Uint32Array;
  directionsView: () => Uint32Array;
  empty(): boolean;
  stride(): number;
  groups(): number;
  counts(group: number): number;
  starts(group: number): number;
  delete: () => void;
}

export interface SparseBlockCtor<T extends ValueType> {
  new (): SparseBlock<T>;
}

export interface VolumeBlockCtor<T extends ValueType> {
  new (): VolumeBlock<T>;
}

export interface IndexCtor<T extends ValueType> {
  new (): Index<T>;
}

export interface IndexBuilderCtor<T extends ValueType> {
  new (size: number, fill: ValueTypeMap[T]): IndexBuilder<T>;
}

export interface SparseMapCtor<T extends ValueType> {
  new (): SparseMap<T>;
}

export interface VolumeMapCtor<T extends ValueType> {
  new (): VolumeMap<T>;
}

export interface SparseTableCtor {
  new (): SparseTable;
}

export interface CPPMap<K, V> {
  get: (key: K) => V;
  set: (key: K, value: V) => void;
  keys: () => CPPVector<K>;
  delete: () => void;
}

export interface CPPVector<V> {
  get: (index: number) => V;
  set: (index: number, value: V) => void;
  size: () => number;
  push_back: (value: V) => void;
  delete: () => void;
}

export interface SparseBlock<T extends ValueType> {
  set(x: number, y: number, z: number, value: number): void;
  has(x: number, y: number, z: number): boolean;
  get(x: number, y: number, z: number): number | undefined;
  del(x: number, y: number, z: number): void;
  clear(): void;
  empty(): boolean;
  scan(fn: (x: number, y: number, z: number, value: number) => void): void;
  clone(): SparseBlock<T>;
  save(): string;
  load(blob: string): void;
  toList(pos: DynamicBuffer<"Vec3i">, val: DynamicBuffer<T>): void;
  valueType(): T;
  loadBuffer(buffer: DynamicBuffer<"U8">): void;
  saveBuffer(buffer: DynamicBuffer<"U8">): void;
  delete: () => void;
}

export interface VolumeBlock<T extends ValueType> {
  set(x: number, y: number, z: number, value: number): void;
  get(x: number, y: number, z: number): number;
  fill(value: number): void;
  assign(edits: SparseBlock<T>): void;
  scan(fn: (x: number, y: number, z: number, value: number) => void): void;
  mask(): VolumeBlock<"Bool">;
  mesh(x: number, y: number, z: number): BiomesMesh;
  empty(): boolean;
  clone(): VolumeBlock<T>;
  compact(): void;
  save(): string;
  load(blob: string): void;
  toList(pos: DynamicBuffer<"Vec3i">, val: DynamicBuffer<T>): void;
  valueType(): T;
  loadBuffer(buffer: DynamicBuffer<"U8">): void;
  saveBuffer(buffer: DynamicBuffer<"U8">): void;
  load: (blob: string) => void;
  delete: () => void;
}

type ValueTypeMap = {
  Bool: boolean;
  I8: number;
  I16: number;
  I32: number;
  U8: number;
  U16: number;
  U32: number;
  F32: number;
  F64: number;
  I64: bigint;
  U64: bigint;
};

export interface Index<T extends ValueType> {
  size(): number;
  scan(fn: (x: number, value: ValueTypeMap[T]) => void): void;
  get(index: number): ValueTypeMap[T];
  load(buffer: DynamicBuffer<"U8">): void;
  save(buffer: DynamicBuffer<"U8">): void;
  delete: () => void;
}

export interface IndexBuilder<T extends ValueType> {
  add(index: number, value: ValueTypeMap[T]): void;
  addSpan(index: [number, number], value: ValueTypeMap[T]): void;
  build(): Index<T>;
  delete: () => void;
}

export interface SparseMap<T extends ValueType> {
  set(x: number, y: number, z: number, value: number): void;
  has(x: number, y: number, z: number): boolean;
  get(x: number, y: number, z: number): number;
  del(x: number, y: number, z: number): void;
  assign(x: number, y: number, z: number, block: SparseBlock<T>): void;
  find(val: number, cb: (x: number, y: number, z: number) => void): void;
  scan(fn: (x: number, y: number, z: number, value: number) => void): void;
  size(): number;
  clear(): void;
  save: () => string;
  load: (blob: string) => void;
  storageSize(): number;
  delete: () => void;
}

export interface VolumeMap<T extends ValueType> {
  set(x: number, y: number, z: number, value: number): void;
  get(x: number, y: number, z: number): number;
  assign(x: number, y: number, z: number, block: VolumeBlock<T>): void;
  find(val: number, cb: (x: number, y: number, z: number) => void): void;
  save(): string;
  load(blob: string): void;
  storageSize(): number;
  delete: () => void;
}

export interface SparseTable {
  set(x: number, y: number, z: number, value: string): void;
  has(x: number, y: number, z: number): boolean;
  get(x: number, y: number, z: number): string;
  del(x: number, y: number, z: number): void;
  clear(): void;
  size(): number;
  empty(): boolean;
  scan(fn: (x: number, y: number, z: number, value: string) => void): void;
  save: () => string;
  load: (blob: string) => void;
  delete: () => void;
}
