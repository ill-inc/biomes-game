import type { ReadonlyVec2i, ReadonlyVec3i } from "@/shared/ecs/gen/types";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { DynamicBuffer } from "@/shared/wasm/buffers";
import type { DataType } from "@/shared/wasm/tensors";
import type { SparseBlock, VolumeBlock } from "@/shared/wasm/types/biomes";
import type { Vec3i } from "@/shared/wasm/types/common";
import type {
  DyeTensor,
  GrowthTensor,
  IrradianceTensor,
  OcclusionTensor,
  TerrainTensor,
  WaterTensor,
} from "@/shared/wasm/types/galois";
import type { CppTensor } from "@/shared/wasm/types/tensors";

export type AABB = { v0: ReadonlyVec3; v1: ReadonlyVec3 };

export interface GaiaLogger {
  log(msg: string): void;
  delete(): void;
}

export interface GaiaTerrainMap {
  aabb(): AABB;
  get(x: number, y: number, z: number): number;
  getSeed(x: number, y: number, z: number): number;
  getDiff(x: number, y: number, z: number): number | undefined;
  find(id: number, out: DynamicBuffer<"Vec3i">): void;
  findSeed(id: number, out: DynamicBuffer<"Vec3i">): void;
  findDiff(id: number, out: DynamicBuffer<"Vec3i">): void;
  storageSize(): number;
  delete(): void;
}

export interface GaiaTerrainMapBuilder {
  storageSize(): number;
  assignSeed(x: number, y: number, z: number, block: VolumeBlock<"U32">): void;
  assignDiff(x: number, y: number, z: number, block: SparseBlock<"U32">): void;
  build(map: GaiaTerrainMap): void;
  delete(): void;
}

export interface GaiaTerrainMapV2 {
  aabb(): AABB;
  contains(): boolean;
  storageSize(): number;
  updateDiff(pos: ReadonlyVec3, diff: SparseBlock<"U32">): void;
  updateWater(pos: ReadonlyVec3, water: WaterTensor): void;
  updateIrradiance(pos: ReadonlyVec3, irradiance: IrradianceTensor): void;
  updateDye(pos: ReadonlyVec3, dye: DyeTensor): void;
  updateGrowth(pos: ReadonlyVec3, growth: GrowthTensor): void;
  updateOcclusion(pos: ReadonlyVec3, occlusion: OcclusionTensor): void;
  delete(): void;
}

export interface GaiaTerrainMapBuilderV2 {
  assignSeed(pos: ReadonlyVec3, block: VolumeBlock<"U32">): void;
  assignSeedTensor(pos: ReadonlyVec3, block: TerrainTensor): void;
  assignDiff(pos: ReadonlyVec3, block: SparseBlock<"U32">): void;
  assignWater(pos: ReadonlyVec3, block: WaterTensor): void;
  assignIrradiance(pos: ReadonlyVec3, block: IrradianceTensor): void;
  assignDye(pos: ReadonlyVec3, block: DyeTensor): void;
  assignGrowth(pos: ReadonlyVec3, block: GrowthTensor): void;
  assignOcclusion(pos: ReadonlyVec3, block: OcclusionTensor): void;
  aabb(): Vec3i;
  shardCount(): number;
  holeCount(): number;
  build(map: GaiaTerrainMapV2): void;
  delete(): void;
}

export interface GaiaTerrainStreamReader {
  isOpen(): boolean;
  isEmpty(): boolean;
  close(): void;
  read(buffer: DynamicBuffer<"Vec3i">): void;
  delete(): void;
}

export interface GaiaTerrainStream {
  subscribe(): GaiaTerrainStreamReader;
  delete(): void;
}

export interface GaiaTerrainWriter {
  updateDiff(
    x: number,
    y: number,
    z: number,
    diff: SparseBlock<"U32">
  ): boolean;
  updateDye(x: number, y: number, z: number, dye: CppTensor<"U8">): boolean;
  delete(): void;
}

export interface GaiaSkyOcclusionMap {
  storageSize(): number;
  loadShard(pos: ReadonlyVec3i, buffer: DynamicBuffer<"U8">): void;
  dumpShard(pos: ReadonlyVec3i, buffer: DynamicBuffer<"U8">): void;
  delete(): void;
}

export interface GaiaSkyOcclusionStreamReader {
  isOpen(): boolean;
  isEmpty(): boolean;
  close(): void;
  read(buffer: DynamicBuffer<"Vec3i">): void;
  delete(): void;
}

export interface GaiaSkyOcclusionStream {
  subscribe(): GaiaSkyOcclusionStreamReader;
  delete(): void;
}

export interface GaiaSkyOcclusionWriter {
  delete(): void;
}

export interface GaiaIrradianceMap {
  storageSize(): number;
  loadShard(pos: Vec3i, buffer: DynamicBuffer<"U8">): void;
  dumpShard(pos: Vec3i, buffer: DynamicBuffer<"U8">): void;
  delete(): void;
}

export interface GaiaIrradianceStreamReader {
  isOpen(): boolean;
  isEmpty(): boolean;
  close(): void;
  read(buffer: DynamicBuffer<"Vec3i">): void;
  delete(): void;
}

export interface GaiaIrradianceStream {
  subscribe(): GaiaIrradianceStreamReader;
  delete(): void;
}

export interface GaiaIrradianceWriter {
  delete(): void;
}

export interface GaiaLightSimulation {
  init(): void;
  tick(): void;
  delete(): void;
}

interface GaiaLoggerCtor {
  new (fn: (msg: string) => void): GaiaLogger;
}

interface GaiaTerrainMapCtor {
  new (): GaiaTerrainMap;
}

interface GaiaTerrainMapBuilderCtor {
  new (): GaiaTerrainMapBuilder;
}

interface GaiaTerrainMapV2Ctor {
  new (): GaiaTerrainMapV2;
}

interface GaiaTerrainMapBuilderV2Ctor {
  new (): GaiaTerrainMapBuilderV2;
}

interface GaiaTerrainStreamCtor {
  new (): GaiaTerrainStream;
}

interface GaiaTerrainWriterCtor {
  new (
    logger: GaiaLogger,
    map: GaiaTerrainMap,
    stream: GaiaTerrainStream
  ): GaiaTerrainWriter;
}

interface GaiaSkyOcclusionMapCtor {
  new (): GaiaSkyOcclusionMap;
}

interface GaiaSkyOcclusionStreamCtor {
  new (): GaiaSkyOcclusionStream;
}

interface GaiaSkyOcclusionWriterCtor {
  new (
    logger: GaiaLogger,
    map: GaiaSkyOcclusionMap,
    stream: GaiaSkyOcclusionStream
  ): GaiaSkyOcclusionWriter;
}

interface GaiaIrradianceMapCtor {
  new (): GaiaIrradianceMap;
}

interface GaiaIrradianceStreamCtor {
  new (): GaiaIrradianceStream;
}

interface GaiaIrradianceWriterCtor {
  new (
    logger: GaiaLogger,
    map: GaiaIrradianceMap,
    stream: GaiaIrradianceStream
  ): GaiaIrradianceWriter;
}

interface GaiaLightSimulationCtor {
  new (
    logger: GaiaLogger,
    terrain: GaiaTerrainMap,
    skyOcclusionMap: GaiaSkyOcclusionMap,
    skyOcclusionWriter: GaiaSkyOcclusionWriter,
    irradianceMap: GaiaIrradianceMap,
    irradianceWriter: GaiaIrradianceWriter,
    stream: GaiaTerrainStream
  ): GaiaLightSimulation;
}

export interface WorldMap<T extends DataType> {
  aabb: AABB;
  tensor: CppTensor<T>;
  get(pos: ReadonlyVec3i): number;
  chunk(pos: ReadonlyVec3i): CppTensor<T>;
  delete(): void;
}

interface WorldMapCtor<T extends DataType> {
  new (aabb: AABB, tensor: CppTensor<T>): WorldMap<T>;
}

export interface GaiaModule {
  GaiaLogger: GaiaLoggerCtor;
  GaiaTerrainMap: GaiaTerrainMapCtor;
  GaiaTerrainMapBuilder: GaiaTerrainMapBuilderCtor;
  GaiaTerrainMapV2: GaiaTerrainMapV2Ctor;
  GaiaTerrainMapBuilderV2: GaiaTerrainMapBuilderV2Ctor;
  GaiaTerrainStream: GaiaTerrainStreamCtor;
  GaiaTerrainWriter: GaiaTerrainWriterCtor;
  GaiaSkyOcclusionMap: GaiaSkyOcclusionMapCtor;
  GaiaSkyOcclusionStream: GaiaSkyOcclusionStreamCtor;
  GaiaSkyOcclusionWriter: GaiaSkyOcclusionWriterCtor;
  GaiaIrradianceMap: GaiaIrradianceMapCtor;
  GaiaIrradianceStream: GaiaIrradianceStreamCtor;
  GaiaIrradianceWriter: GaiaIrradianceWriterCtor;
  GaiaLightSimulation: GaiaLightSimulationCtor;

  WorldMap_U8: WorldMapCtor<"U8">;

  updateMuckGradientWithSphere(
    grad: CppTensor<"I32">,
    muck: Readonly<WorldMap<"U8">>,
    unmuckSource: ReadonlyVec3,
    unmuckRadius: number,
    stepSize: number
  ): void;
  updateMuckGradientWithAabb(
    grad: CppTensor<"I32">,
    muck: Readonly<WorldMap<"U8">>,
    unmuckSource: ReadonlyVec3,
    unmuckSize: ReadonlyVec3,
    stepSize: number
  ): void;
  applyMuckGradient(muck: WorldMap<"U8">, grad: CppTensor<"I32">): void;

  updateIrradiance(
    map: GaiaTerrainMapV2,
    worldPos: ReadonlyVec3i,
    lightSourceTensor: CppTensor<"U32">
  ): WorldMap<"U32">;

  updateOcclusion(map: GaiaTerrainMapV2, column: ReadonlyVec2i): WorldMap<"U8">;

  updateWater(map: GaiaTerrainMapV2, worldPos: ReadonlyVec3i): WorldMap<"U8">;

  makeWorldMap<T extends DataType>(
    tensor: CppTensor<T>,
    offset: ReadonlyVec3i
  ): WorldMap<T>;
}
