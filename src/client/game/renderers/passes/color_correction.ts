import type { RenderPassName } from "@/client/game/renderers/passes/composer";
import { ShaderPass } from "@/client/game/renderers/passes/shader_pass";
import {
  checkColorCorrectionHotReload,
  makeColorCorrectionMaterial,
} from "@/gen/client/game/shaders/postprocessing/color_correction";
import * as THREE from "three";

export class ColorCorrectionPass extends ShaderPass {
  constructor(name: RenderPassName) {
    const shader = makeColorCorrectionMaterial({});
    super(name, shader, {
      beforeRender: () => checkColorCorrectionHotReload(shader),
      // TODO: Doing color before luts gives weird artifacts in the luts
      inputs: ["color"],
      outputs: ["color"],
    });
  }

  generateBuffers(renderToScreen: boolean) {
    this.outputs.clear();
    if (!this.composer) {
      return;
    }
    if (this.sharedTarget) {
      this.target = this.composer.getSharedTarget(this.sharedTarget);
    } else if (!renderToScreen) {
      const bufferSize = this.computeBufferSize();
      const target = new THREE.WebGLRenderTarget(
        bufferSize.width,
        bufferSize.height
      );
      // RGB with Depth
      target.texture.format = THREE.RGBAFormat;
      target.texture.type = THREE.UnsignedByteType;
      target.texture.minFilter = THREE.NearestFilter;
      target.texture.magFilter = THREE.NearestFilter;
      target.texture.generateMipmaps = false;
      target.stencilBuffer = false;
      target.depthBuffer = false;
      this.target = target;
    }
    if (this.target) {
      this.outputs.set("color", this.target.texture);
    }
  }
}
