import type { ClientContext } from "@/client/game/context";
import type { ClientResourcesBuilder } from "@/client/game/resources/types";
import { makeMuckSporesMaterial } from "@/gen/client/game/shaders/muck_spores";
import sporeParticle from "/public/textures/particles/spore.png";

import { makeDisposable } from "@/shared/disposable";
import type { RegistryLoader } from "@/shared/registry";
import * as THREE from "three";

export const MAX_MUCK_PARTICLES = 20_000;
export const MAX_MUCK = 15;

function createGeometry(numParticles: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const triangleCount = numParticles * 2;
  const vertexCount = triangleCount * 3;
  geometry.setDrawRange(0, vertexCount);
  return geometry;
}

function createSporesMaterial(texture: THREE.Texture) {
  const material = makeMuckSporesMaterial({
    spriteMap: texture,
  });
  material.side = THREE.DoubleSide;
  return material;
}

async function genSporeParticles() {
  const geometry = createGeometry(MAX_MUCK_PARTICLES);

  const loader = new THREE.TextureLoader();
  const texture = await loader.loadAsync(sporeParticle.src);
  texture.format = THREE.RGBAFormat;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  const material = createSporesMaterial(texture);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return makeDisposable(mesh, () => {
    texture.dispose();
    geometry.dispose();
  });
}

export function addMuckResources(
  _loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.add("/muck/spore_particles", genSporeParticles);
}
