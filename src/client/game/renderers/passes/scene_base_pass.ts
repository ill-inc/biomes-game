import type { RenderPassChannel } from "@/client/game/renderers/passes/composer";
import { ScenePass } from "@/client/game/renderers/passes/scene_pass";
import * as THREE from "three";
import type { WebGLMultipleRenderTargets } from "three";

export class SceneBasePass extends ScenePass {
  multiTarget?: WebGLMultipleRenderTargets;

  inputChannels() {
    return [...this.options.additionalInputs];
  }

  outputChannels() {
    return ["color", "depth", "normal", "baseDepth"] as RenderPassChannel[];
  }

  generateBuffers(renderToScreen: boolean) {
    if (!this.composer) {
      return;
    }
    const renderer = this.composer.renderer;
    const pixelRatio = renderer.getPixelRatio();
    const size = renderer.getSize(new THREE.Vector2());

    const depthTexture = this.composer.getSharedBuffer(
      "depth"
    ) as THREE.DepthTexture;
    const target = new THREE.WebGLMultipleRenderTargets(
      size.width * pixelRatio,
      size.height * pixelRatio,
      3,
      {
        depthTexture,
      }
    );

    // RGB with Depth
    target.texture[0].name = "Color";
    target.texture[0].format = THREE.RGBAFormat;
    target.texture[0].type = THREE.HalfFloatType;
    target.texture[0].minFilter = THREE.NearestFilter;
    target.texture[0].magFilter = THREE.NearestFilter;
    target.texture[0].generateMipmaps = false;

    target.texture[1].name = "Normal";
    target.texture[1].format = THREE.RGBAFormat;
    target.texture[1].type = THREE.HalfFloatType;
    target.texture[1].minFilter = THREE.NearestFilter;
    target.texture[1].magFilter = THREE.NearestFilter;
    target.texture[1].generateMipmaps = false;

    // TODO determine if this is faster as a copy rather than a MRT
    target.texture[2].name = "BaseDepth";
    target.texture[2].format = THREE.RedFormat;
    target.texture[2].type = THREE.HalfFloatType;
    target.texture[2].minFilter = THREE.NearestFilter;
    target.texture[2].magFilter = THREE.NearestFilter;
    target.texture[2].generateMipmaps = false;

    this.multiTarget = target;
    this.outputs.clear();
    if (!renderToScreen) {
      this.outputs.set("color", target.texture[0]);
      this.outputs.set("depth", depthTexture);
      this.outputs.set("normal", target.texture[1]);
      this.outputs.set("baseDepth", target.texture[2]);
    }
  }

  resizeBuffers(): void {
    super.resizeBuffers();
    const renderer = this.composer?.renderer;
    if (this.multiTarget && renderer) {
      const pixelRatio = renderer.getPixelRatio();
      const size = this.composer!.renderer.getSize(new THREE.Vector2());
      this.multiTarget.setSize(
        size.width * pixelRatio,
        size.height * pixelRatio
      );
    }
  }

  destroyBuffers() {
    if (this.multiTarget !== undefined) {
      this.multiTarget.dispose();
      this.multiTarget = undefined;
    }
  }

  applyRenderTarget(toScreen: boolean) {
    if (this.composer === undefined) {
      return false;
    }
    if (toScreen) {
      this.composer.renderer.setRenderTarget(null);
      return true;
    } else if (this.multiTarget !== undefined) {
      this.composer.renderer.setRenderTarget(this.multiTarget);
      return true;
    }
    return false;
  }
}
