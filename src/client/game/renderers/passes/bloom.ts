import type { RenderPassName } from "@/client/game/renderers/passes/composer";
import { ShaderPass } from "@/client/game/renderers/passes/shader_pass";
import {
  checkBloomCombineHotReload,
  makeBloomCombineMaterial,
} from "@/gen/client/game/shaders/postprocessing/bloom_combine";
import {
  checkBloomDownsampleHotReload,
  makeBloomDownsampleMaterial,
} from "@/gen/client/game/shaders/postprocessing/bloom_downsample";
import {
  checkBloomThresholdHotReload,
  makeBloomThresholdMaterial,
} from "@/gen/client/game/shaders/postprocessing/bloom_threshold";
import {
  checkGaussian9HotReload,
  makeGaussian9Material,
} from "@/gen/client/game/shaders/postprocessing/gaussian9";
import * as THREE from "three";

export class BloomThresholdPass extends ShaderPass {
  constructor(name: RenderPassName) {
    const shader = makeBloomThresholdMaterial({ threshold: 1.0 });
    super(name, shader, {
      beforeRender: () => checkBloomThresholdHotReload(shader),
      inputs: ["color"],
      outputs: ["bloomIntermediate"],
    });
  }

  generateBuffers(renderToScreen: boolean) {
    if (!this.composer) {
      return;
    }
    if (!renderToScreen) {
      const bufferSize = this.computeBufferSize();
      const target = new THREE.WebGLRenderTarget(
        bufferSize.width,
        bufferSize.height
      );
      // RGB with Depth
      target.texture.format = THREE.RGBAFormat;
      target.texture.type = THREE.HalfFloatType;
      // Linear filter + mipmaps for upsampling next pass
      target.texture.minFilter = THREE.LinearFilter;
      target.texture.magFilter = THREE.LinearFilter;
      target.texture.generateMipmaps = true;
      target.stencilBuffer = false;
      target.depthBuffer = false;
      this.target = target;

      this.outputs.set("bloomIntermediate", target.texture);
    }
  }
}

export const downsampleIterations = [0, 1, 2, 3, 4];
export class BloomDownsamplePass extends ShaderPass {
  iteration: (typeof downsampleIterations)[number];

  constructor(
    name: RenderPassName,
    iteration: (typeof downsampleIterations)[number]
  ) {
    const shader = makeBloomDownsampleMaterial({
      offset: [0, 0],
      width: 3,
    });
    super(name, shader, {
      beforeRender: () => checkBloomDownsampleHotReload(shader),
      inputs: ["bloomIntermediate"],
      outputs: [`bloomDownsample${iteration}`, "bloomIntermediate"],
    });
    this.iteration = iteration;
  }

  computeBufferSize(vec?: THREE.Vector2) {
    const size = super.computeBufferSize(vec);
    const scale = 1 / Math.pow(2, this.iteration + 1);
    size.width = Math.max(1, Math.floor(size.width * scale));
    size.height = Math.max(1, Math.floor(size.height * scale));
    return size;
  }

  generateBuffers(renderToScreen: boolean) {
    if (!this.composer) {
      return;
    }
    if (!renderToScreen) {
      const bufferSize = this.computeBufferSize();
      const target = new THREE.WebGLRenderTarget(
        bufferSize.width,
        bufferSize.height
      );
      // RGB with Depth
      target.texture.format = THREE.RGBAFormat;
      target.texture.minFilter = THREE.LinearFilter;
      target.texture.magFilter = THREE.LinearFilter;
      target.texture.generateMipmaps = false;
      target.stencilBuffer = false;
      target.depthBuffer = false;
      this.target = target;

      // Compute offset for 4x4 box filter
      // original pixels of source image as p
      // target downsampled output pixel as o
      // x marks the 4 samples we sample to downsample
      // p   p   p   p
      //   x       x
      // p   p   p   p
      //       o
      // p   p   p   p
      //   x       x
      // p   p   p   p
      // We're in effect sampling the bilinear corners of the new texel
      // so the offset is 0.5 * new texel size
      // this gives us 16 samples.
      // Width scales this, so a width of 1 samples the nearest 16 pixels,
      // and width of 3 samples 16 samples further away. (width of 2 samples only 1 pixel)
      this.uniforms.offset.value.x = 0.5 / target.width;
      this.uniforms.offset.value.y = 0.5 / target.height;

      this.outputs.set(`bloomDownsample${this.iteration}`, target.texture);
      this.outputs.set("bloomIntermediate", target.texture);
    }
  }
}

export class BloomGaussianPass extends ShaderPass {
  horizontal: boolean;
  width: number;
  downsampleIdx: number;

  constructor(name: RenderPassName, horizontal: boolean) {
    const shader = makeGaussian9Material({ direction: [0, 1] });
    super(name, shader, {
      beforeRender: () => checkGaussian9HotReload(shader),
      inputs: [],
      outputs: [],
    });
    this.width = 4.0;
    this.horizontal = horizontal;
    this.downsampleIdx = -1;
  }

  downsampleBuffer() {
    // Select a downsampled buffer for higher widths
    // width of texsize 0->1: no downsample
    // width of texsize 1->2: downsample0
    // base this on vertical px size, since width is scaled from it.
    if (this.downsampleIdx < 0) {
      return "bloomIntermediate";
    } else if (
      this.downsampleIdx >= 0 &&
      this.downsampleIdx < downsampleIterations.length
    ) {
      return `bloomDownsample${this.downsampleIdx}`;
    } else {
      return `bloomDownsample${downsampleIterations.length - 1}`;
    }
  }

  inputChannels() {
    return [this.downsampleBuffer()];
  }

  outputChannels() {
    return [this.downsampleBuffer(), "bloomIntermediate"];
  }

  updateSize() {
    if (this.composer) {
      const rendererSize = this.composer.renderer.getSize(new THREE.Vector2());
      const aspect = rendererSize.width / rendererSize.height;
      this.uniforms.direction.value = this.horizontal
        ? new THREE.Vector2(this.width / rendererSize.width / aspect, 0)
        : new THREE.Vector2(0, this.width / rendererSize.width);
      const lastIdx = this.downsampleIdx;
      this.downsampleIdx = Math.ceil(this.width) - 1.0;
      if (lastIdx != this.downsampleIdx) {
        this.composer.needsRechain = true;
        this.composer.buffersDirty = true;
      }
      if (this.target) {
        this.outputs.set("bloomIntermediate", this.target.texture);
        this.outputs.set(this.downsampleBuffer(), this.target.texture);
      }
    }
  }

  resizeBuffers() {
    super.resizeBuffers();
    this.updateSize();
  }

  generateBuffers(renderToScreen: boolean) {
    super.generateBuffers(renderToScreen);
    this.updateSize();
  }

  updateParameters(
    deltaTime: number,
    _inputs: Map<string, THREE.Texture | undefined>
  ) {
    // Redirect bloomIntermediate input into color
    const intermediateInput = this.inputs.get(this.downsampleBuffer());
    if (intermediateInput) {
      const [pass, _] = intermediateInput;
      const downsampleBuffer = this.downsampleBuffer();
      this.inputs.set("color", [pass, downsampleBuffer]);
      const inputs = this.renderInputs(deltaTime);
      const colorSize = [
        inputs.get("color")?.image.width,
        inputs.get("color")?.image.height,
      ];
      this.uniforms.colorSize = { value: colorSize };
    }
  }
}

export class BloomCombinePass extends ShaderPass {
  shader: THREE.RawShaderMaterial;

  constructor(name: RenderPassName) {
    const shader = makeBloomCombineMaterial({ bloomIntensity: 1.0 });
    super(name, shader, {
      beforeRender: () => checkBloomCombineHotReload(shader),
      inputs: ["color", "bloomIntermediate"],
      outputs: ["color"],
    });
    this.shader = shader;
  }
}
