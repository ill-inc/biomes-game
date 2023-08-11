import { terrainLifetime } from "@/shared/asset_defs/quirk_helpers";
import type { IsomorphismResourcePaths } from "@/shared/game/resources/isomorphisms";
import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import * as Shards from "@/shared/game/shard";
import {
  FULL_BLOCK_ISOMORPHISM_ID,
  TerrainHelper,
} from "@/shared/game/terrain_helper";
import type { BiomesId } from "@/shared/ids";
import { add, mul, normalizev, sub } from "@/shared/math/linear";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import type {
  TypedResourceDeps,
  TypedResources,
} from "@/shared/resources/types";
import { bfsVoxelsWithDiagonals } from "@/shared/util/dfs";
import type { VoxelooModule } from "@/shared/wasm/types";

type TerrainMarchPaths = TerrainResourcePaths & IsomorphismResourcePaths;
type TerrainMarchDeps =
  | TypedResourceDeps<TerrainMarchPaths>
  | TypedResources<TerrainMarchPaths>;

export interface TerrainMarchHit {
  pos: Vec3;
  distance: number;
  face: number;
  terrainId: number;
}
export type CastFn = (hit: TerrainMarchHit) => boolean | void;

export function terrainMarch(
  voxeloo: VoxelooModule,
  deps: TerrainMarchDeps,
  from: ReadonlyVec3,
  dir: ReadonlyVec3,
  maxDistance: number,
  fn: CastFn
) {
  const terrainHelper = TerrainHelper.fromResources(voxeloo, deps);
  voxeloo.march_faces(from, dir, (x, y, z, distance, face) => {
    if (distance > maxDistance) {
      return false;
    }

    const id = Shards.voxelShard(x, y, z);
    const block = deps.get("/terrain/volume", id);
    if (block) {
      const blockPos = Shards.blockPos(x, y, z);
      const terrainId = block.get(...blockPos);
      if (terrainId) {
        const shapeIndex = deps.get("/terrain/shape/index");
        const isomorphismId = terrainHelper.getIsomorphismID([x, y, z]);

        // Full blocks always hit.
        if (isomorphismId === FULL_BLOCK_ISOMORPHISM_ID) {
          return !!fn({
            pos: [x, y, z],
            distance,
            face,
            terrainId,
          });
        }

        // Compute ray position on the surface of the voxel.
        const rayOrigin = sub(add(from, mul(distance, dir)), [x, y, z]);
        const subvoxelFace = voxeloo.subvoxelRayIntersection(
          shapeIndex,
          isomorphismId,
          rayOrigin,
          normalizev(dir)
        );

        if (subvoxelFace === undefined) {
          return true;
        }
        return !!fn({
          pos: [x, y, z],
          distance,
          face: subvoxelFace,
          terrainId,
        });
      }
    }
    return true;
  });
}

export function bfsEdits(
  deps: TerrainMarchDeps,
  from: ReadonlyVec3,
  fn: (
    pos: Vec3,
    shardId: Shards.ShardId,
    blockPos: Vec3,
    occupancyId?: BiomesId
  ) => boolean
) {
  bfsVoxelsWithDiagonals(from, ([x, y, z]) => {
    const shardId = Shards.voxelShard(x, y, z);
    const blockPos = Shards.blockPos(x, y, z);
    const editsBlock = deps.get("/terrain/edits", shardId);
    const mat = editsBlock?.get(...blockPos);
    if (mat) {
      if (terrainLifetime(mat) === undefined) {
        return fn([x, y, z], shardId, blockPos);
      }
    } else {
      const occupancyBlock = deps.get("/terrain/occupancy", shardId);
      const occupancyId = occupancyBlock?.get(...blockPos);
      if (occupancyId) {
        return fn([x, y, z], shardId, blockPos, occupancyId as BiomesId);
      }
    }
  });
}

export function isEditedAt(deps: TerrainMarchDeps, pos: ReadonlyVec3) {
  const id = Shards.voxelShard(...pos);
  const block = deps.get("/terrain/edits", id);
  if (block) {
    const mat = block.get(...Shards.blockPos(...pos));
    if (mat) {
      return true;
    }
  }
  return false;
}
