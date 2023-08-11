import type { ClientContext } from "@/client/game/context";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import { makeBoundaryMaterial } from "@/gen/client/game/shaders/boundary";
import { makeDisposable } from "@/shared/disposable";
import { centerAABB, sizeAABB } from "@/shared/math/linear";
import type { RegistryLoader } from "@/shared/registry";
import * as THREE from "three";

function genBoundary(deps: ClientResourceDeps) {
  const { v0, v1 } = deps.get("/ecs/metadata").aabb;
  const geometry = new THREE.BoxGeometry(...sizeAABB([v0, v1]));

  const loader = new THREE.TextureLoader();
  const texture = loader.load(resolveAssetUrl("textures/boundary"));
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const material = makeBoundaryMaterial({
    pattern: texture,
    highlightColor:
      process.env.NODE_ENV === "production"
        ? [0.24609375, 0, 0.99609375]
        : [1, 0, 0],
    depthFadeDistance: 40,
    depthFadePower: 5,
    depthFadeOpacity: 1.0,
  });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -4;
  material.side = THREE.DoubleSide;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...centerAABB([v0, v1]));
  return makeDisposable(mesh, () => {
    geometry.dispose();
    material.dispose();
  });
}

export function addBoundaryResources(
  _loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.add("/scene/boundary", genBoundary);
}
