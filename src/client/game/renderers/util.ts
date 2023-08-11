import type {
  ClientResourceDeps,
  ClientResources,
} from "@/client/game/resources/types";
import { gltfToThree } from "@/client/game/util/gltf_helpers";
import { makeBasicMaterial } from "@/gen/client/game/shaders/basic";
import { makeBreakableMaterial } from "@/gen/client/game/shaders/breakable";
import { blockPos, voxelShard } from "@/shared/game/shard";
import type { Vec2, Vec3 } from "@/shared/math/types";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export type SpatialLighting = Vec2;

export type MaterialReplaceFn = (
  material: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial
) => THREE.Material | undefined;

export function replaceBreakable(
  destroyTexture: THREE.DataArrayTexture
): MaterialReplaceFn {
  return (mat) => {
    return makeBreakableMaterial({
      baseColor: mat.color.toArray() as [number, number, number],
      map: mat.map ? mat.map : new THREE.Texture(),
      useMap: !!mat.map,
      vertexColors: mat.vertexColors,
      destroyTexture,
      spatialLighting: defaultSpatialLighting(),
      light: [0, 0, 0],
    });
  };
}

export function computeNonDarkSpatialLighting(
  resources: ClientResources | ClientResourceDeps,
  x: number,
  y: number,
  z: number,
  offsets: Vec3 = [1, 1, 1]
): SpatialLighting {
  // Player spatial lighting is spatial lighting, but if we are below a brightenss threshold, we use the maximum of nearby points.
  const primarySpatialLighting = computeSpatialLighting(resources, x, y, z);
  const meetsThreshold = (spatialLighting: SpatialLighting) =>
    spatialLighting[0] > 0.3 || spatialLighting[1] > 0.1;
  if (!meetsThreshold(primarySpatialLighting)) {
    // Look for any nearby points that are bright enough.
    const sampleOffsets = [
      [-offsets[0], 0, 0],
      [offsets[0], 0, 0],
      [0, -offsets[1], 0],
      [0, offsets[1], 0],
      [0, 0, -offsets[2]],
      [0, 0, offsets[2]],
    ];
    for (const offset of sampleOffsets) {
      const externalSpatialLighting = computeSpatialLighting(
        resources,
        x + offset[0],
        y + offset[1],
        z + offset[2]
      );
      if (meetsThreshold(externalSpatialLighting)) {
        return externalSpatialLighting;
      }
    }
  }
  return primarySpatialLighting;
}

export function computeSpatialLighting(
  resources: ClientResources | ClientResourceDeps,
  x: number,
  y: number,
  z: number
): SpatialLighting {
  const shard = voxelShard(x, y, z);
  const irr = resources.get("/lighting/irradiance", shard);
  const skyOcc = resources.get("/lighting/sky_occlusion", shard);
  const shardPos = blockPos(x, y, z);
  // Factor of 15 and inversion match lighting buffer computations in galois.hpp
  const irrVal = irr.contains(...shardPos)
    ? (irr.get(...shardPos) & 0xff) / 15
    : 0.0;
  const skyOcclusionVal = skyOcc.contains(...shardPos)
    ? 1 - skyOcc.get(...shardPos) / 15
    : 1.0;
  return [irrVal, skyOcclusionVal];
}

export function defaultSpatialLighting(): SpatialLighting {
  return [0, 1];
}

export function gltfToBasePassThree(
  gltf: GLTF,
  materialFn?: MaterialReplaceFn,
  cloneMaterials: boolean = true,
  doubleSide: boolean = false
): [THREE.Object3D, THREE.Material[]] {
  const three = gltfToThree(gltf).clone();
  const [materials, _oldMaterials] = replaceThreeMaterials(
    three,
    cloneMaterials,
    true,
    materialFn,
    doubleSide
  );
  return [three, materials];
}

export function replaceThreeMaterials(
  obj: THREE.Object3D,
  cloneExisting?: boolean,
  disposeOld?: boolean,
  materialFn?: MaterialReplaceFn,
  doubleSide?: boolean
) {
  const newMaterials: THREE.Material[] = [];
  const replacedMaterials: THREE.Material[] = [];
  obj.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.SkinnedMesh) {
      let materialReplaced = false;
      if (
        node.material instanceof THREE.MeshBasicMaterial ||
        node.material instanceof THREE.MeshStandardMaterial
      ) {
        node.geometry.computeVertexNormals();
        const color = node.material.color.toArray() as [number, number, number];
        const newMaterial = materialFn
          ? materialFn(node.material)
          : makeBasicMaterial({
              baseColor: color,
              useMap: false,
              vertexColors: node.material.vertexColors,
            });
        if (doubleSide && newMaterial instanceof THREE.RawShaderMaterial) {
          newMaterial.side = THREE.DoubleSide;
        }
        if (newMaterial) {
          newMaterials.push(newMaterial);
          replacedMaterials.push(node.material);
          node.material = newMaterial;
          materialReplaced = true;
        }
      }
      if (!materialReplaced && cloneExisting) {
        replacedMaterials.push(node.material);
        node.material = node.material.clone();
        newMaterials.push(node.material);
      }
    }
  });
  if (disposeOld) {
    replacedMaterials.forEach((m) => m.dispose());
    replacedMaterials.length = 0;
  }
  return [newMaterials, replacedMaterials];
}

export function cloneMaterials(obj: THREE.Object3D, disposeOld?: boolean) {
  return replaceThreeMaterials(obj, true, disposeOld, (_mat) => undefined);
}

export function replaceBaseWithThreeMaterials(obj: THREE.Object3D) {
  obj.traverse((node) => {
    if (
      node instanceof THREE.Mesh &&
      node.material instanceof THREE.RawShaderMaterial
    ) {
      // Try our best to make a basic material from any ones we created in-house
      const newMaterial = new THREE.MeshBasicMaterial({
        color: node.material.uniforms.color?.value,
        map: node.material.uniforms.map?.value,
        vertexColors: node.material.uniforms.vertexColors?.value,
      });
      newMaterial.transparent = node.material.transparent;
      newMaterial.side = node.material.side;
      node.material = newMaterial;
    }
  });
}

export function disposeObject3D(obj: THREE.Object3D | undefined) {
  obj?.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      child.material.dispose();
    }
  });
  if (obj instanceof THREE.Mesh) {
    obj.geometry.dispose();
    obj.material.dispose();
  }
}
