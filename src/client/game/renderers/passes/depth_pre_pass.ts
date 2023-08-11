import type { ScenePassOptions } from "@/client/game/renderers/passes/scene_pass";
import { ScenePass } from "@/client/game/renderers/passes/scene_pass";
import type { SceneDependencies } from "@/client/game/renderers/scenes";
import { combineScenes, createNewScene } from "@/client/game/renderers/scenes";

import type {
  RenderPassChannel,
  RenderPassName,
  SharedBufferName,
} from "@/client/game/renderers/passes/composer";
import type { ScenePassDeps } from "@/client/game/renderers/passes/standard_passes";
import { DepthPeeledMesh } from "@/client/game/renderers/three_ext/depth_peeled_mesh";
import * as THREE from "three";

export class DepthPrePass extends ScenePass {
  scene = createNewScene();

  constructor(
    deps: ScenePassDeps,
    name: RenderPassName,
    public readonly depthBufferName: SharedBufferName,
    public readonly origScenes: SceneDependencies[],
    options?: Partial<ScenePassOptions>
  ) {
    super(deps, name, [], options);
  }

  generateBuffers(_renderToScreen: boolean) {
    if (!this.composer) {
      return;
    }
    const depthTexture = this.composer.getSharedBuffer(
      this.depthBufferName
    ) as THREE.DepthTexture;
    const pixelRatio = this.composer.renderer.getPixelRatio();
    const size = this.composer.renderer.getSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(
      size.width * pixelRatio,
      size.height * pixelRatio,
      {
        depthTexture,
      }
    );
    target.texture.format = THREE.RGBAFormat;
    target.texture.type = THREE.HalfFloatType;
    target.texture.minFilter = THREE.NearestFilter;
    target.texture.magFilter = THREE.NearestFilter;
    target.texture.generateMipmaps = false;
    target.stencilBuffer = false;
    target.depthBuffer = true;
    this.target = target;

    this.outputs.clear();
    this.outputs.set("depth", this.target.depthTexture);
    for (const output of this.options.additionalOutputs ?? []) {
      this.outputs.set(output, this.target.depthTexture);
    }
  }

  updateParameters(
    deltaTime: number,
    inputs: Map<string, THREE.Texture | undefined>
  ) {
    super.updateParameters(deltaTime, inputs);

    // Update the depth scene
    this.scene.clear();
    this.scene.materialDependencies = combineScenes(
      ...this.origScenes
    ).materialDependencies;
    for (const scene of this.origScenes) {
      scene.traverse((child) => {
        if (child instanceof DepthPeeledMesh) {
          this.scene.add(child.depthMesh);
        }
      });
    }
    this.scenes = [this.scene];
  }

  inputChannels() {
    return this.options.additionalInputs ?? [];
  }

  outputChannels(): RenderPassChannel[] {
    return ["depth", ...(this.options.additionalOutputs ?? [])];
  }
}
