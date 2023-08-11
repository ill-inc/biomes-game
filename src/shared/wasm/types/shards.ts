import type { ShardId } from "@/shared/game/shard";
import type { Vec2, Vec3 } from "@/shared/math/types";
import type { DynamicBuffer } from "@/shared/wasm/types/buffer";
import type { Occluder } from "@/shared/wasm/types/culling";

export interface ShardsModule {
  // Routines.
  shardEncode: (pos: Vec3) => ShardId;
  shardDecode: (code: ShardId) => Vec3;

  // Constructors
  FrustumSharder: FrustumSharderCtor;
  VisibilitySharder: VisibilitySharderCtor;
}

interface FrustumSharderCtor {
  new (level: number): FrustumSharder;
}

export interface FrustumSharder {
  populate(
    buffer: DynamicBuffer<"Vec3i">,
    origin: Vec3,
    view: Vec3,
    view_proj: number[]
  ): void;
  delete(): void;
}

interface VisibilitySharderCtor {
  new (
    proj: Readonly<number[]>,
    origin: Readonly<Vec3>,
    view: Readonly<Vec3>,
    occlusionBufferShape: Readonly<Vec2>
  ): VisibilitySharder;
}

export interface VisibilitySharder {
  scan(cb: (id: ShardId) => Occluder | undefined): void;
  writeOcclusionBuffer(buffer: DynamicBuffer<"U8">): void;
  delete(): void;
}
