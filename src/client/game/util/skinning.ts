import { makePlayerSkinnedMaterial } from "@/gen/client/game/shaders/player_skinned";
import * as THREE from "three";

const meshMaterial = makePlayerSkinnedMaterial({
  boneTexture: new THREE.Texture(), // Dummy texture, we'll delete it anyway.
  spatialLighting: [0, 1],
  baseColor: [1, 1, 1],
});
// Delete the skinning uniforms. Because our mesh is
// `instanceof THREE.SkinnedMesh` (thanks to the GLTFLoader), three.js will
// automatically upload these skinning related uniforms when rendering the
// mesh. If they are manually included here as well, they may interfere with
// the automatically set values. So we delete them here.
delete meshMaterial.uniforms.bindMatrix;
delete meshMaterial.uniforms.bindMatrixInverse;
delete meshMaterial.uniforms.boneTexture;
delete meshMaterial.uniforms.boneTextureSize;

export function clonePlayerSkinnedMaterial() {
  return meshMaterial.clone();
}
