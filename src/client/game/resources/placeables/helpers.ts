import {
  computeNonDarkSpatialLighting,
  disposeObject3D,
} from "@/client/game/renderers/util";
import type { ParticleSystem } from "@/client/game/resources/particles";
import type { AnimatedPlaceableMesh } from "@/client/game/resources/placeables/types";
import type { ClientResourceDeps } from "@/client/game/resources/types";
import { getCamOrientation } from "@/client/game/util/camera";
import {
  gltfDispose,
  gltfToThree,
  loadGltf,
} from "@/client/game/util/gltf_helpers";
import { clonePlayerSkinnedMaterial } from "@/client/game/util/skinning";
import { resolveAssetUrlUntyped } from "@/galois/interface/asset_paths";
import { staticUrlForAttribute } from "@/shared/bikkie/schema/binary";
import { makeDisposable } from "@/shared/disposable";
import type { Item } from "@/shared/game/item";
import { getAabbForPlaceable } from "@/shared/game/placeables";
import type { BiomesId } from "@/shared/ids";
import { affineToMatrix } from "@/shared/math/affine";
import { normalizeAngle } from "@/shared/math/angles";
import { centerAABB, makeYRotate, sizeAABB } from "@/shared/math/linear";
import type { ReadonlyVec2 } from "@/shared/math/types";
import { ok } from "assert";
import type { Material, Object3D } from "three";
import { Group, Matrix4, Mesh } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

const BIKKIE_PLACEABLES_TRANSFORM = makeYRotate(Math.PI);

export function clearParticleSystems(placeableMesh: AnimatedPlaceableMesh) {
  placeableMesh.particleSystems ??= [];
  for (const system of placeableMesh.particleSystems) {
    system.materials.dispose();
    disposeObject3D(system.three);
  }
  placeableMesh.particleSystems.length = 0;
}

export function setParticleSystems(
  placeableMesh: AnimatedPlaceableMesh,
  ...particleSystems: ParticleSystem[]
) {
  placeableMesh.particleSystems ??= [];
  placeableMesh.particleSystems.push(...particleSystems);
}

export function getPlaceableSpatialLighting(
  deps: ClientResourceDeps,
  id: BiomesId
) {
  const placeable = deps.get("/ecs/c/placeable_component", id);
  const position = deps.get("/ecs/c/position", id)?.v;
  const orientation = deps.get("/ecs/c/orientation", id)?.v;
  if (!placeable || !position) {
    return;
  }
  const aabb = getAabbForPlaceable(placeable?.item_id, position, orientation);
  if (!aabb) {
    return;
  }
  // Sample in center of aabb
  const center = centerAABB(aabb);
  // Use the more expensive "non-dark" lighting, since this is cached, sampling
  // right outside the aabb faces
  return computeNonDarkSpatialLighting(deps, ...center, sizeAABB(aabb));
}

export function setPlaceableOrientation(
  three: Object3D,
  orientation?: ReadonlyVec2
) {
  if (!orientation) {
    return;
  }

  three.rotation.setFromQuaternion(
    getCamOrientation([
      orientation[0],
      normalizeAngle(orientation[1] - Math.PI / 2),
    ])
  );
}

export async function loadPlaceableGltf(item: Item): Promise<GLTF> {
  const mesh = item.worldMesh ?? item.mesh;
  if (!mesh) {
    const galoisPath = item.galoisPath ?? "";
    const url = resolveAssetUrlUntyped(galoisPath);
    ok(url);
    return loadGltf(url);
  }

  // New path for Bikkie-defined placable assets.
  // We use the mesh attribute (same as the drop) to fetch the mesh.
  // We do not need any scale factor as Bikkie-defined meshes are in world
  // units, however we do respect any 'transform' attribute on the item.
  const gltf = await loadGltf(staticUrlForAttribute(mesh));
  const scene = gltfToThree(gltf);
  ok(scene);
  scene.matrix = scene.matrix.multiply(
    new Matrix4().fromArray(
      item.transform
        ? affineToMatrix(item.transform)
        : BIKKIE_PLACEABLES_TRANSFORM
    )
  );
  scene.matrixAutoUpdate = false;
  // Re-parent the scene so to always keep our transform.
  const parent = new Group();
  parent.add(scene);
  gltf.scene = parent;
  return gltf;
}

export async function loadPlaceableTypeMesh(item: Item) {
  const gltf = await loadPlaceableGltf(item);

  const scene = gltfToThree(gltf);
  const materials: Material[] = [];
  scene.traverse((child) => {
    if (child instanceof Mesh) {
      child.geometry.computeVertexNormals();
      if (gltf.animations.length > 0) {
        child.material = clonePlayerSkinnedMaterial();
        materials.push(child.material);
      }
      // We will do frustum culling for placeables manually, so no-need for
      // three.js to re-do this work.
      child.frustumCulled = false;
    }
  });

  return makeDisposable(gltf, () => {
    gltfDispose(gltf);
    materials.forEach((m) => m.dispose());
  });
}
