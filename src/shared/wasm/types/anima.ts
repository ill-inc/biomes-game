import type { TerrainID } from "@/shared/asset_defs/terrain";
import type { CPPVector } from "@/shared/wasm/types/biomes";
import type { Vec3i } from "@/shared/wasm/types/common";
import type { TerrainTensor } from "@/shared/wasm/types/galois";

export interface SurfacePoint {
  position: Vec3i;
  terrainId: TerrainID;
}

export type SurfacePointVector = CPPVector<SurfacePoint>;

export interface AnimaModule {
  // Terrain feature extraction.
  findSurfaces(map: TerrainTensor): SurfacePointVector;
}
