import type { AnimaModule } from "@/shared/wasm/types/anima";
import type { BiomesModule } from "@/shared/wasm/types/biomes";
import type { BufferModule } from "@/shared/wasm/types/buffer";
import type { CullingModule } from "@/shared/wasm/types/culling";
import type { GaiaModule } from "@/shared/wasm/types/gaia";
import type { GaloisModule } from "@/shared/wasm/types/galois";
import type { MappingModule } from "@/shared/wasm/types/mapping";
import type { ShardsModule } from "@/shared/wasm/types/shards";
import type { TensorsModule } from "@/shared/wasm/types/tensors";
import type { VoxelsModule } from "@/shared/wasm/types/voxels";

export type VoxelooModule = AnimaModule &
  BiomesModule &
  BufferModule &
  CullingModule &
  GaiaModule &
  GaloisModule &
  ShardsModule &
  MappingModule &
  TensorsModule &
  VoxelsModule;
