import { makeDepthMaterial } from "@/gen/client/game/shaders/depth";
import * as THREE from "three";

export class DepthPeeledMesh extends THREE.Mesh<
  THREE.BufferGeometry,
  THREE.RawShaderMaterial
> {
  depthMaterial: THREE.RawShaderMaterial;
  depthMesh: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;
  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.RawShaderMaterial,
    disableFrustumCulling = true
  ) {
    super(geometry, material);
    const depthMaterial = makeDepthMaterial({});
    if (material) {
      depthMaterial.vertexShader = material.vertexShader;
      depthMaterial.uniforms = material.uniforms;
    }
    depthMaterial.colorWrite = false;
    depthMaterial.needsUpdate = true;
    depthMaterial.side = material.side;
    depthMaterial.uniforms = material.uniforms;
    this.depthMaterial = depthMaterial;
    this.depthMesh = new THREE.Mesh(geometry, depthMaterial);
    if (disableFrustumCulling) {
      this.depthMesh.frustumCulled = false;
      this.frustumCulled = false;
    }
  }

  updateDepthMaterial() {
    if (this.material) {
      this.depthMaterial.uniforms = this.material.uniforms;
    }
  }

  copy(source: this, recursive: boolean) {
    super.copy(source, recursive);
    this.depthMaterial = source.depthMaterial.clone();
    this.depthMesh = source.depthMesh.clone(recursive);
    return this;
  }

  dispose() {
    this.depthMaterial.dispose();
  }
}
