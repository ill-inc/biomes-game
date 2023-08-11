import type { Vec2, Vec3 } from "@/shared/math/types";
import type { DynamicBuffer } from "@/shared/wasm/buffers";

type AABB = [Vec3, Vec3];

export interface Occluder {
  size(): number;
  empty(): number;
  scan(cb: (aabb: AABB) => void): void;
  delete(): void;
}

interface OcclusionCullerCtor {
  new (proj: number[], shape: Readonly<Vec2>): OcclusionCuller;
}

export interface OcclusionCuller {
  write(aabb: AABB): void;
  test(aabb: AABB): boolean;
  delete(): void;
}

export interface CullingModule {
  OcclusionCuller: OcclusionCullerCtor;
  writeOcclusionBuffer(
    culler: OcclusionCuller,
    buffer: DynamicBuffer<"U8">
  ): void;
}
