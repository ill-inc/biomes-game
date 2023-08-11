import { Ray } from "@/client/game/helpers/ray";
import type {
  ClientReactResources,
  ClientResourceDeps,
  ClientResources,
} from "@/client/game/resources/types";
import { playerFirstPersonCamPosition } from "@/client/game/util/camera";
import type { TerrainHit } from "@/shared/game/spatial";
import type { CastFn } from "@/shared/game/terrain_march";
import { terrainMarch } from "@/shared/game/terrain_march";
import { dist, distSq } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import type { VoxelooModule } from "@/shared/wasm/types";
import * as THREE from "three";

type ShardDeps = ClientResources | ClientResourceDeps;
export class MarchHelper {
  constructor(private readonly voxeloo: VoxelooModule) {}

  terrainHitAlongCameraRay(
    deps: ShardDeps,
    maxDistance: number
  ): TerrainHit | undefined {
    let result = undefined;
    this.terrainCastCameraEnvironmentRay(deps, maxDistance, (hit) => {
      result = hit;
    });
    return result;
  }

  static getCameraRayParams(deps: ShardDeps, maxDistance: number) {
    const camera = deps.get("/scene/camera");
    const localPlayer = deps.get("/scene/local_player");

    const cameraPos = camera.three.position.toArray();
    const dir = camera.three.getWorldDirection(new THREE.Vector3()).toArray();

    // Triangle inequality bound
    const castDist = dist(cameraPos, localPlayer.player.position) + maxDistance;

    const maxDistanceSq = maxDistance * maxDistance;

    return {
      cameraPos,
      dir,
      castDist,
      validHitPos: (pos: ReadonlyVec3) =>
        distSq(pos, localPlayer.player.position) < maxDistanceSq,
    };
  }

  static getPlayerRay(
    deps: ShardDeps | ClientReactResources,
    maxDistance: number
  ): Ray {
    const camera = deps.get("/scene/camera");
    const localPlayer = deps.get("/scene/local_player");
    const player = localPlayer.player;

    const normalizedCameraDirection = camera.three
      .getWorldDirection(new THREE.Vector3())
      .normalize();
    const cameraPosition = camera.three.position.clone();
    /**
     * We project {cameraToPlayer} onto the ray from the camera to find the location
     * {source} inside the player from which we shoot the player ray.
     */
    const headPos = new THREE.Vector3(
      ...playerFirstPersonCamPosition(player.position, player.aabb())
    );
    const cameraToPlayer = headPos.clone().sub(cameraPosition.clone());

    const projectionMagnitude = normalizedCameraDirection.dot(cameraToPlayer);
    const projection = normalizedCameraDirection
      .clone()
      .multiplyScalar(Math.max(0, projectionMagnitude));

    const source = cameraPosition.clone().add(projection.clone());
    return new Ray(source, normalizedCameraDirection, maxDistance);
  }

  // Intersects with only the terrain.
  terrainCastCameraEnvironmentRay(
    deps: ShardDeps,
    maxDistance: number,
    fn: CastFn
  ) {
    const ray = MarchHelper.getCameraRayParams(deps, maxDistance);
    terrainMarch(
      this.voxeloo,
      deps,
      ray.cameraPos,
      ray.dir,
      ray.castDist,
      (hit) => {
        if (ray.validHitPos(hit.pos)) {
          return fn(hit);
        }
      }
    );
  }
}

export async function registerMarchHelper<C extends { voxeloo: VoxelooModule }>(
  loader: RegistryLoader<C>
) {
  return new MarchHelper(await loader.get("voxeloo"));
}
