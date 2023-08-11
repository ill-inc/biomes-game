import type {
  RenderPassChannel,
  RenderPassName,
} from "@/client/game/renderers/passes/composer";
import { ShaderPass } from "@/client/game/renderers/passes/shader_pass";
import {
  checkDepthHotReload,
  makeDepthMaterial,
} from "@/gen/client/game/shaders/postprocessing/depth";
import type * as THREE from "three";

export class DepthVisualizePass extends ShaderPass {
  constructor(
    name: RenderPassName,
    public readonly channel: RenderPassChannel,
    private readonly getCamera: () => THREE.PerspectiveCamera
  ) {
    const shader = makeDepthMaterial({ cameraNear: 1.0, cameraFar: 1000 });
    super(name, shader, {
      beforeRender: () => checkDepthHotReload(shader),
      inputs: [channel],
    });
  }

  updateParameters(
    _deltaTime: number,
    inputs: Map<string, THREE.Texture | undefined>
  ) {
    const camera = this.getCamera();
    this.uniforms.cameraNear.value = camera.near;
    this.uniforms.cameraFar.value = camera.far;
    this.uniforms["depth"].value = inputs?.get(this.channel);
  }
}
