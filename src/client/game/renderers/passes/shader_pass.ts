import type {
  RenderPassChannel,
  RenderPassName,
  SharedTargetName,
} from "@/client/game/renderers/passes/composer";
import type { ClearState } from "@/client/game/renderers/passes/pass";
import {
  PostprocessingPass,
  applyClearState,
} from "@/client/game/renderers/passes/pass";
import * as THREE from "three";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass";
import type { WebGLRenderer } from "three/src/renderers/WebGLRenderer";

export class ShaderPass extends PostprocessingPass {
  uniforms: THREE.Shader["uniforms"];
  material: THREE.ShaderMaterial;
  fsQuad: FullScreenQuad;
  colorInputNameOverride: string | undefined;
  shaderInputChannels: RenderPassChannel[];
  shaderOutputChannels: RenderPassChannel[];
  rawShader: THREE.ShaderMaterial | (THREE.Shader & { defines?: any });
  shaderParameters: THREE.ShaderMaterialParameters;
  primaryInputChannel?: RenderPassChannel;
  sharedTarget?: SharedTargetName;
  clearState?: ClearState;
  beforeRender?: () => void;

  constructor(
    name: RenderPassName,
    shader: THREE.ShaderMaterial | (THREE.Shader & { defines?: any }),
    options?: {
      inputs?: RenderPassChannel[];
      outputs?: RenderPassChannel[];
      parameters?: THREE.ShaderMaterialParameters;
      sharedTarget?: SharedTargetName;
      clearState?: ClearState;
      beforeRender?: () => void;
    }
  ) {
    super(name);
    this.name = name;
    this.rawShader = shader;
    const { uniforms, material } = this.createMaterial();
    this.uniforms = uniforms;
    this.material = material;

    this.shaderInputChannels = options?.inputs || ["color"];
    this.shaderOutputChannels = options?.outputs || ["color"];
    this.primaryInputChannel =
      this.shaderInputChannels.length === 1
        ? this.shaderInputChannels[0]
        : undefined;

    // Check if this shader is a THREE-style shader, expecting tDiffuse.
    // Set color inputs to direct to it
    if (
      this.uniforms.tDiffuse !== undefined &&
      this.uniforms.color === undefined
    ) {
      this.colorInputNameOverride = "tDiffuse";
    }

    this.fsQuad = new FullScreenQuad(this.material);
    this.fsQuad.material = this.material;
    this.shaderParameters = options?.parameters || {};
    this.sharedTarget = options?.sharedTarget;
    this.clearState = options?.clearState;
    this.beforeRender = options?.beforeRender;
  }

  createMaterial() {
    const shader = this.rawShader;
    if (shader instanceof THREE.ShaderMaterial) {
      shader.setValues(this.shaderParameters);
      return {
        uniforms: shader.uniforms,
        material: shader,
      };
    } else {
      const uniforms = THREE.UniformsUtils.clone(shader.uniforms);
      return {
        uniforms: uniforms,
        material: new THREE.ShaderMaterial({
          defines: Object.assign({}, shader.defines),
          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader,
          ...this.shaderParameters,
        }),
      };
    }
  }

  defaultShader() {
    return {
      uniforms: {},
      vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }`,
      fragmentShader: `
      void main() {
        gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
      }`,
    };
  }

  inputChannels() {
    return this.shaderInputChannels;
  }

  outputChannels() {
    return this.shaderOutputChannels;
  }

  computeBufferSize(vec?: THREE.Vector2): THREE.Vector2 {
    if (!this.composer) {
      return new THREE.Vector2(1, 1);
    }
    const renderer = this.composer.renderer;
    const pixelRatio = renderer.getPixelRatio();
    const size = renderer.getSize(vec || new THREE.Vector2());
    size.width *= pixelRatio;
    size.height *= pixelRatio;
    size.width = Math.max(size.width, 1);
    size.height = Math.max(size.height, 1);
    return size;
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
      target.texture.type = THREE.HalfFloatType;
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

  resizeBuffers(): void {
    super.resizeBuffers();
    const renderer = this.composer?.renderer;
    if (this.target && renderer && !this.sharedTarget) {
      const size = this.computeBufferSize();
      this.target.setSize(size.width, size.height);
    }
  }

  render(deltaTime: number, toScreen: boolean = false) {
    this.beforeRender?.();
    const inputs = super.render(deltaTime, toScreen);
    if (inputs === false) {
      return false;
    }
    if (this.primaryInputChannel && this.primaryInputChannel !== "color") {
      for (const [name, value] of inputs.entries()) {
        if (
          name === this.primaryInputChannel &&
          this.uniforms[this.primaryInputChannel] === undefined
        ) {
          // No input exists, remap primary input into color
          inputs.set("color", value);
        }
      }
    }
    for (const [name, value] of inputs.entries()) {
      let mappedName: string = name;
      if (name === "color" && this.colorInputNameOverride !== undefined) {
        mappedName = this.colorInputNameOverride;
      }
      if (this.uniforms[mappedName]) {
        this.uniforms[mappedName].value = value;
      }
    }
    applyClearState(this.composer!, this.clearState);
    this.fsQuad.render(this.composer!.renderer as WebGLRenderer);
    return inputs;
  }
}
