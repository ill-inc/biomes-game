import type { IndexedGeometry } from "@/cayley/graphics/geometry";
import { maybeAddAlpha3, maybeAddAlpha4 } from "@/cayley/graphics/textures";
import type { Array3, Array4 } from "@/cayley/numerics/arrays";
import { addToScenes, createNewScenes } from "@/client/game/renderers/scenes";
import { ok } from "assert";
import * as THREE from "three";

export function makeThreeGeometry({ vertices, indices }: IndexedGeometry) {
  const ret = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  const vbo = new THREE.InterleavedBuffer(vertices.data, vertices.stride);
  for (const { name, size, offset } of vertices.attributes) {
    ret.setAttribute(
      name,
      new THREE.InterleavedBufferAttribute(vbo, size, offset)
    );
  }

  // Populate the index array.
  ret.setIndex(new THREE.BufferAttribute(indices, 1));

  return ret;
}

export function makeThreeTexture(
  pixels: Array3<"U8">,
  srgb = false,
  flip = false
) {
  ok([3, 4].includes(pixels.shape[2]));
  const [h, w] = pixels.shape;
  const ret = new THREE.DataTexture(maybeAddAlpha3(pixels).data, w, h);
  ret.flipY = flip;
  ret.format = THREE.RGBAFormat;
  ret.generateMipmaps = true;
  ret.internalFormat = srgb ? "SRGB8_ALPHA8" : "RGBA8";
  ret.magFilter = THREE.NearestFilter;
  ret.minFilter = THREE.LinearFilter;
  ret.type = THREE.UnsignedByteType;
  ret.wrapS = THREE.ClampToEdgeWrapping;
  ret.wrapT = THREE.ClampToEdgeWrapping;
  ret.needsUpdate = true;
  return ret;
}

export function makeThreeTextureArray(
  pixels: Array4<"U8">,
  srgb = true,
  flip = false
) {
  ok([3, 4].includes(pixels.shape[3]));
  const [d, h, w] = pixels.shape;
  const ret = new THREE.DataArrayTexture(maybeAddAlpha4(pixels).data, w, h, d);
  ret.flipY = flip;
  ret.format = THREE.RGBAFormat;
  ret.generateMipmaps = true;
  ret.internalFormat = srgb ? "SRGB8_ALPHA8" : "RGBA8";
  ret.magFilter = THREE.NearestFilter;
  ret.minFilter = THREE.LinearFilter;
  ret.type = THREE.UnsignedByteType;
  ret.wrapS = THREE.ClampToEdgeWrapping;
  ret.wrapT = THREE.ClampToEdgeWrapping;
  ret.needsUpdate = true;
  return ret;
}

export function makeThreeMesh<M extends THREE.ShaderMaterial>(
  geometry: THREE.BufferGeometry,
  material: M
) {
  return new THREE.Mesh(geometry, material);
}

export function makeThreeMeshScenes(...meshes: THREE.Mesh[]) {
  const scenes = createNewScenes();
  for (const mesh of meshes) {
    addToScenes(scenes, mesh);
  }
  return scenes;
}
