import type {
  RenderPassChannel,
  RenderPassName,
  SharedTargetName,
} from "@/client/game/renderers/passes/composer";
import type { ClearState } from "@/client/game/renderers/passes/pass";
import {
  RenderPass,
  applyClearState,
} from "@/client/game/renderers/passes/pass";
import type { ScenePassDeps } from "@/client/game/renderers/passes/standard_passes";
import type { SceneDependencies } from "@/client/game/renderers/scenes";
import { combineScenes } from "@/client/game/renderers/scenes";
import * as THREE from "three";

export interface ScenePassOptions {
  sharedTarget?: SharedTargetName;
  outputChannel: RenderPassChannel;
  clearState: ClearState;
  additionalInputs: RenderPassChannel[];
  additionalOutputs: RenderPassChannel[];
}

const DEFAULT_OPTIONS: ScenePassOptions = {
  outputChannel: "color",
  additionalInputs: [],
  additionalOutputs: [],
  // By default nothing is cleared.
  clearState: {},
};

export class ScenePass extends RenderPass {
  scenes: SceneDependencies[];
  options: ScenePassOptions;

  constructor(
    private readonly deps: ScenePassDeps,
    name: RenderPassName,
    scenes: SceneDependencies[],
    options?: Partial<ScenePassOptions>
  ) {
    super(name);
    this.scenes = scenes;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  inputChannels() {
    return ["color", "baseDepth", "normal", ...this.options.additionalInputs];
  }

  outputChannels() {
    return [this.options.outputChannel, "depth"] as RenderPassChannel[];
  }

  generateBuffers(renderToScreen: boolean) {
    if (!this.composer) {
      return;
    }
    if (this.options.sharedTarget) {
      this.target = this.composer.getSharedTarget(this.options.sharedTarget);
    } else {
      const bufferSize = this.computeBufferSize();
      const depthTexture = this.composer.getSharedBuffer(
        "depth"
      ) as THREE.DepthTexture;
      const target = new THREE.WebGLRenderTarget(
        bufferSize.width,
        bufferSize.height,
        { depthTexture }
      );
      // RGB with Depth
      target.texture.format = THREE.RGBAFormat;
      target.texture.type = THREE.HalfFloatType;
      target.texture.minFilter = THREE.NearestFilter;
      target.texture.magFilter = THREE.NearestFilter;
      target.texture.generateMipmaps = false;
      target.stencilBuffer = false;
      target.depthBuffer = true;
      this.target = target;
    }

    this.outputs.clear();
    if (!renderToScreen && this.target) {
      this.outputs.set(this.options.outputChannel, this.target.texture);
      this.outputs.set("depth", this.target.depthTexture);
    }
  }

  resizeBuffers(): void {
    super.resizeBuffers();
    const renderer = this.composer?.renderer;
    if (this.options.sharedTarget) {
      this.target = this.composer?.getSharedTarget(this.options.sharedTarget);
    } else if (this.target && renderer) {
      const pixelRatio = renderer.getPixelRatio();
      const size = this.composer!.renderer.getSize(new THREE.Vector2());
      this.target.setSize(size.width * pixelRatio, size.height * pixelRatio);
    }
  }

  getScene() {
    return combineScenes(...this.scenes);
  }

  updateParameters(
    _deltaTime: number,
    inputs: Map<string, THREE.Texture | undefined>
  ) {
    const camera = this.deps.getCamera();

    super.updateParameters(_deltaTime, inputs);

    for (const material of this.getScene().materialDependencies.get(
      "baseDepth"
    ) || []) {
      material.uniforms["baseDepth"].value = inputs?.get("baseDepth");
    }
    for (const material of this.getScene().materialDependencies.get(
      "viewportSize"
    ) || []) {
      const size = this.composer?.renderer.getSize(new THREE.Vector2());
      const scaledSize = size?.multiplyScalar(
        this.composer?.renderer.getPixelRatio() ?? 1
      );
      material.uniforms["viewportSize"].value = scaledSize;
    }
    for (const material of this.getScene().materialDependencies.get("color") ||
      []) {
      material.uniforms["color"].value = inputs?.get("color");
    }
    for (const material of this.getScene().materialDependencies.get(
      "normalTexture"
    ) || []) {
      material.uniforms["normalTexture"].value = inputs?.get("normal");
    }
    // Maybe we can cache these?
    for (const material of this.getScene().materialDependencies.get(
      "fogStart"
    ) || []) {
      material.uniforms["fogStart"].value =
        camera.far * (this.deps.getFogStartFar?.() ?? 0.5);
    }
    for (const material of this.getScene().materialDependencies.get("fogEnd") ||
      []) {
      material.uniforms["fogEnd"].value = camera.far;
    }
    for (const material of this.getScene().materialDependencies.get(
      "cameraNear"
    ) || []) {
      material.uniforms["cameraNear"].value = camera.near;
    }
    for (const material of this.getScene().materialDependencies.get(
      "cameraFar"
    ) || []) {
      material.uniforms["cameraFar"].value = camera.far;
    }
    for (const material of this.getScene().materialDependencies.get("time") ||
      []) {
      material.uniforms["time"].value = this.composer?.clock.getElapsedTime();
    }
  }

  render(deltaTime: number, toScreen: boolean = false) {
    const inputs = super.render(deltaTime, toScreen);
    if (inputs === false) {
      return false;
    }
    if (!this.applyRenderTarget(toScreen)) {
      return false;
    }
    applyClearState(this.composer!, this.options.clearState);

    this.composer!.renderer.render(this.getScene(), this.deps.getCamera());
    return inputs;
  }
}
