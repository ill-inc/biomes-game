import type { ClientContext } from "@/client/game/context";
import type { ProtectionMapBoundary } from "@/client/game/resources/protection";
import { getRobotProtectionBoundary } from "@/client/game/resources/protection";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import {
  getRobotProtectionGridPosition,
  getRobotProtectionSize,
} from "@/client/game/util/robots";
import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import { makePlotHighlightMaterial } from "@/gen/client/game/shaders/plot_highlight";

import { using } from "@/shared/deletable";
import { makeDisposable } from "@/shared/disposable";
import type { RobotParams } from "@/shared/game/robot";
import { getRobotParams } from "@/shared/game/robot";
import type { BiomesId } from "@/shared/ids";
import { anchorAndSizeToAABB } from "@/shared/math/linear";
import type { Vec3, Vec4 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { SparseMap } from "@/shared/wasm/types/biomes";
import * as THREE from "three";

function plotPreviewParameters() {
  return {
    baseDepth: new THREE.Texture(),
    normalTexture: new THREE.Texture(),
    highlightColor: [1.0, 1.0, 1.0] as Vec3,
    depthFadeDistance: 40.0,
    depthFadePower: 16.0,
    depthFadeOpacity: 1.0,
    ringColor: [0.0, 0.0, 0.0, 0.0] as Vec4,
    closeColor: [0.0, 0.0, 0.0, 0.0] as Vec4,
    farDist: 10000.0,
    closeFadeDistance: 10000.0,
  };
}

function ownedPlotPreviewParameters() {
  return {
    ...plotPreviewParameters(),
    highlightColor: [1.0, 1.0, 1.0] as Vec3,
    depthFadeDistance: 10,
    depthFadePower: 40.0,
  };
}

function genRegionHighlightGeometry(map: SparseMap<"Bool">) {
  // Given the map, find the empty voxels that touch the map
  const borderCoords = new Map<number, Set<number>>();
  map.scan((x, y, z, _value) => {
    for (const [nx, nz] of [
      [x - 1, z],
      [x + 1, z],
      [x, z - 1],
      [x, z + 1],
    ]) {
      if (!map.get(nx, y, nz)) {
        if (!borderCoords.has(nx)) {
          borderCoords.set(nx, new Set());
        }
        borderCoords.get(nx)!.add(nz);
      }
    }
  });
  // For every border voxel, make a plane on the inward-facing sides
  const verts = [];
  const texCoords = [];
  const normals = [];
  const high = 128;
  const low = -64;
  const padding = 0.0;
  for (const [x, zs] of borderCoords) {
    for (const z of zs) {
      for (const [nx, nz] of [
        [x - 1, z],
        [x + 1, z],
        [x, z - 1],
        [x, z + 1],
      ]) {
        if (!map.get(nx, 0, nz)) {
          continue;
        }
        // Make a plane between (x, 128, z) and (nx, -64, nz)
        if (x === nx) {
          // north/south (z) wall
          if (z < nz) {
            // if z<nz, this is a wall from (x, nz) -> (x+1, nz) facing south (+z)
            verts.push(
              ...[
                ...[x - padding, high, nz - padding],
                ...[x - padding, low, nz - padding],
                ...[x + 1 + padding, high, nz - padding],
                ...[x + 1 + padding, high, nz - padding],
                ...[x - padding, low, nz - padding],
                ...[x + 1 + padding, low, nz - padding],
                // reverse face
                ...[x - padding, high, nz - padding],
                ...[x + 1 + padding, high, nz - padding],
                ...[x - padding, low, nz - padding],
                ...[x - padding, low, nz - padding],
                ...[x + 1 + padding, high, nz - padding],
                ...[x + 1 + padding, low, nz - padding],
              ]
            );
            texCoords.push(
              ...[
                ...[0, high],
                ...[0, low],
                ...[1, high],
                ...[1, high],
                ...[0, low],
                ...[1, low],
                // reverse face
                ...[0, high],
                ...[1, high],
                ...[0, low],
                ...[0, low],
                ...[1, high],
                ...[1, low],
              ]
            );
            for (let i = 0; i < 6; i++) {
              normals.push(0, 0, 1);
            }
            for (let i = 0; i < 6; i++) {
              normals.push(0, 0, -1);
            }
          } else {
            // if z>nz, this is a wall from (x, z) -> (x+1, z) facing north (-z)
            verts.push(
              ...[
                ...[x - padding, high, z + padding],
                ...[x + 1 + padding, high, z + padding],
                ...[x - padding, low, z + padding],
                ...[x - padding, low, z + padding],
                ...[x + 1 + padding, high, z + padding],
                ...[x + 1 + padding, low, z + padding],
                // reverse face
                ...[x - padding, high, z + padding],
                ...[x - padding, low, z + padding],
                ...[x + 1 + padding, high, z + padding],
                ...[x - padding, low, z + padding],
                ...[x + 1 + padding, low, z + padding],
                ...[x + 1 + padding, high, z + padding],
              ]
            );
            texCoords.push(
              ...[
                ...[0, high],
                ...[1, high],
                ...[0, low],
                ...[0, low],
                ...[1, high],
                ...[1, low],
                // reverse face
                ...[0, high],
                ...[0, low],
                ...[1, high],
                ...[0, low],
                ...[1, low],
                ...[1, high],
              ]
            );
            for (let i = 0; i < 6; i++) {
              normals.push(0, 0, -1);
            }
            for (let i = 0; i < 6; i++) {
              normals.push(0, 0, 1);
            }
          }
        } else {
          // east/west (x) wall
          if (x < nx) {
            // if x<nx, this is a wall from (nx, z) -> (nx, z+1) facing east (+x)
            verts.push(
              ...[
                ...[nx - padding, high, z - padding],
                ...[nx - padding, high, z + 1 + padding],
                ...[nx - padding, low, z - padding],
                ...[nx - padding, low, z - padding],
                ...[nx - padding, high, z + 1 + padding],
                ...[nx - padding, low, z + 1 + padding],
                // reverse face
                ...[nx - padding, high, z - padding],
                ...[nx - padding, low, z - padding],
                ...[nx - padding, high, z + 1 + padding],
                ...[nx - padding, high, z + 1 + padding],
                ...[nx - padding, low, z - padding],
                ...[nx - padding, low, z + 1 + padding],
              ]
            );
            texCoords.push(
              ...[
                ...[0, high],
                ...[1, high],
                ...[0, low],
                ...[0, low],
                ...[1, high],
                ...[1, low],
                // reverse face
                ...[0, high],
                ...[0, low],
                ...[1, high],
                ...[1, high],
                ...[0, low],
                ...[1, low],
              ]
            );
            for (let i = 0; i < 6; i++) {
              normals.push(1, 0, 0);
            }
            for (let i = 0; i < 6; i++) {
              normals.push(-1, 0, 0);
            }
          } else {
            // if x>nx, this is a wall from (x, z) -> (x, z+1) facing west (-x)
            verts.push(
              ...[
                ...[x + padding, high, z - padding],
                ...[x + padding, low, z - padding],
                ...[x + padding, high, z + 1 + padding],
                ...[x + padding, high, z + 1 + padding],
                ...[x + padding, low, z - padding],
                ...[x + padding, low, z + 1 + padding],
                // reverse face
                ...[x + padding, high, z - padding],
                ...[x + padding, high, z + 1 + padding],
                ...[x + padding, low, z - padding],
                ...[x + padding, low, z - padding],
                ...[x + padding, high, z + 1 + padding],
                ...[x + padding, low, z + 1 + padding],
              ]
            );
            texCoords.push(
              ...[
                ...[0, high],
                ...[0, low],
                ...[1, high],
                ...[1, high],
                ...[0, low],
                ...[1, low],
                // reverse face
                ...[0, high],
                ...[1, high],
                ...[0, low],
                ...[0, low],
                ...[1, high],
                ...[1, low],
              ]
            );
            for (let i = 0; i < 6; i++) {
              normals.push(-1, 0, 0);
            }
            for (let i = 0; i < 6; i++) {
              normals.push(1, 0, 0);
            }
          }
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  const vertBuffer = new Float32Array(verts);
  const texCoordBuffer = new Float32Array(texCoords);
  const normalBuffer = new Float32Array(normals);
  geo.setAttribute("position", new THREE.BufferAttribute(vertBuffer, 3));
  geo.setAttribute("texCoord", new THREE.BufferAttribute(texCoordBuffer, 2));
  geo.setAttribute("normal", new THREE.BufferAttribute(normalBuffer, 3));
  return geo;
}

function genRobotParams(
  deps: ClientResourceDeps,
  robotId: BiomesId
): RobotParams | undefined {
  const robotComponent = deps.get("/ecs/c/robot_component", robotId);
  if (!robotComponent) {
    return;
  }
  const robotInventory = deps.get("/ecs/c/container_inventory", robotId);
  const boundary = deps.get("/protection/boundary", robotId);
  const params = getRobotParams(robotComponent, robotInventory);
  if (params === undefined) {
    return;
  }
  return {
    ...params,
    aabb: boundary.aabb,
  };
}

function robotProtectionPreviewParameters() {
  return {
    ...ownedPlotPreviewParameters(),
    depthFadePower: 100.0,
    depthFadeOpacity: 3.0,
  };
}

function genRobotPreviewProtectionBoundary(
  deps: ClientResourceDeps
): ProtectionMapBoundary | undefined {
  const becomeNpc = deps.get("/scene/npc/become_npc");
  if (becomeNpc.kind !== "active") {
    return;
  }
  const center = becomeNpc.position;
  if (!center) {
    return;
  }

  const protectionSize = getRobotProtectionSize(deps, becomeNpc.entityId);
  if (!protectionSize) {
    return;
  }

  const position = getRobotProtectionGridPosition(
    deps,
    becomeNpc.entityId,
    center
  );
  if (!position) {
    return;
  }

  const aabb = anchorAndSizeToAABB(position, protectionSize);
  return getRobotProtectionBoundary([aabb]);
}

function genRobotPreviewMesh(
  { voxeloo }: { voxeloo: VoxelooModule },
  deps: ClientResourceDeps
) {
  const becomeNpc = deps.get("/scene/npc/become_npc");
  if (becomeNpc.kind !== "active") {
    return;
  }
  const center = becomeNpc.position;
  if (!center) {
    return;
  }
  const protectionSize = getRobotProtectionSize(deps, becomeNpc.entityId);
  if (!protectionSize) {
    return;
  }

  const position = getRobotProtectionGridPosition(
    deps,
    becomeNpc.entityId,
    center
  );
  if (!position) {
    return;
  }

  return using(new voxeloo.SparseMap_Bool(), (sparseMap) => {
    for (
      let xOffset = Math.ceil(-protectionSize[0] / 2);
      xOffset < Math.ceil(protectionSize[0] / 2);
      xOffset++
    ) {
      for (
        let zOffset = Math.ceil(-protectionSize[2] / 2);
        zOffset < Math.ceil(protectionSize[2] / 2);
        zOffset++
      ) {
        sparseMap.set(xOffset + position[0], 0, zOffset + position[2], 1);
      }
    }
    const geo = genRegionHighlightGeometry(sparseMap);
    const loader = new THREE.TextureLoader();
    const patternTexture = loader.load(
      resolveAssetUrl("textures/land_claim_boundary")
    );
    patternTexture.minFilter = THREE.LinearFilter;
    patternTexture.magFilter = THREE.LinearFilter;
    patternTexture.wrapS = THREE.RepeatWrapping;
    patternTexture.wrapT = THREE.RepeatWrapping;
    const material = makePlotHighlightMaterial(
      robotProtectionPreviewParameters()
    );
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = "robot-highlight";
    return makeDisposable(mesh, () => {
      geo.dispose();
    });
  });
}

export function addRobotResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.add(
    "/robots/protection_preview_mesh",
    loader.provide(genRobotPreviewMesh)
  );
  builder.add(
    "/robots/preview_map_boundary",
    genRobotPreviewProtectionBoundary
  );
  builder.add("/robots/params", genRobotParams);
}
