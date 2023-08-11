import type { RenderPassName } from "@/client/game/renderers/passes/composer";
import { ShaderPass } from "@/client/game/renderers/passes/shader_pass";
import {
  checkSsaoHotReload,
  makeSsaoMaterial,
} from "@/gen/client/game/shaders/postprocessing/ssao";
import * as THREE from "three";

export class SSAOPass extends ShaderPass {
  constructor(
    name: RenderPassName,
    private readonly getCamera: () => THREE.PerspectiveCamera
  ) {
    const shader = makeSsaoMaterial({
      zNear: 1.0,
      zFar: 1000,
      cameraFov: 50,
      cameraAspect: 1,
      resolution: [1280, 720],
      lightening: 1.2,
      strength: 1.2,
    });
    super(name, shader, {
      beforeRender: () => checkSsaoHotReload(shader),
      inputs: ["color", "normal", "depth"],
    });
  }

  updateParameters(
    _deltaTime: number,
    _inputs: Map<string, THREE.Texture | undefined>
  ) {
    const camera = this.getCamera();
    this.uniforms.zNear.value = camera.near;
    this.uniforms.zFar.value = camera.far;
    if (this.target) {
      this.uniforms.resolution.value = new THREE.Vector2(
        this.target.width,
        this.target.height
      );
    }
    this.uniforms.cameraFov.value = camera.fov;
    this.uniforms.cameraAspect.value = camera.aspect;
  }
}
