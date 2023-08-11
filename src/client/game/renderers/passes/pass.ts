import type {
  RenderPassChannel,
  RenderPassComposer,
  RenderPassName,
} from "@/client/game/renderers/passes/composer";
import type { Vec4 } from "@/shared/math/types";
import { ok } from "assert";
import * as THREE from "three";

export class RenderPass {
  target?: THREE.WebGLRenderTarget;
  name: RenderPassName;
  composer?: RenderPassComposer;
  inputs: Map<RenderPassChannel, [RenderPass, RenderPassChannel | undefined]>;
  outputs: Map<RenderPassChannel, THREE.Texture>;
  needsRender: boolean;
  check: boolean;

  constructor(name: RenderPassName) {
    this.name = name;
    this.inputs = new Map();
    this.outputs = new Map();
    this.needsRender = false;
    this.check = true;
  }

  get enabled() {
    return this.hasRequiredInputs();
  }

  set enabled(newVal: boolean) {
    // Don't allow disabling normal passes
  }

  setInput(
    name: RenderPassChannel,
    pass: RenderPass | undefined,
    outputChannel?: RenderPassChannel
  ) {
    if (pass) {
      this.inputs.set(name, [pass, outputChannel]);
    } else {
      this.inputs.delete(name);
    }
  }

  inputChannels(): RenderPassChannel[] {
    return [];
  }

  outputChannels(): RenderPassChannel[] {
    return [];
  }

  destroyBuffers() {
    this.outputs.forEach((buffer) => {
      buffer.dispose();
    });
    this.outputs.clear();
    if (this.target !== undefined) {
      this.target.dispose();
      this.target = undefined;
    }
  }

  hasRequiredInputs() {
    for (const inputName of this.inputChannels()) {
      if (!this.inputs.has(inputName)) {
        return false;
      }
    }
    return true;
  }

  // Checks
  checkConnections(toScreen: boolean = false) {
    // Check if we have all inputs wired up correctly
    if (!this.hasRequiredInputs()) {
      return false;
    }
    if (!toScreen)
      for (const output of this.outputChannels()) {
        if (!this.outputs.has(output)) {
          return false;
        }
      }
    return true;
  }

  // TODO: generateBuffers can re-use textures from previous passes of a channel
  generateBuffers(_renderToScreen: boolean) {}
  resizeBuffers() {}
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

  renderInputs(deltaTime: number) {
    return new Map(
      [...this.inputs.entries()].map(([name, [pass, inputName]]) => {
        pass.render(deltaTime, false);
        return [name, pass.outputs.get(inputName || name)];
      })
    );
  }

  applyRenderTarget(toScreen: boolean) {
    if (this.composer === undefined) {
      return false;
    }
    if (toScreen) {
      this.composer.renderer.setRenderTarget(null);
      return true;
    } else if (this.target !== undefined) {
      this.composer.renderer.setRenderTarget(this.target);
      return true;
    }
    return false;
  }

  updateParameters(
    _deltaTime: number,
    _inputs: Map<string, THREE.Texture | undefined>
  ) {}

  render(deltaTime: number, toScreen: boolean = false) {
    if (!this.needsRender) {
      return false;
    }
    // Update parameters if needed
    const inputs = this.renderInputs(deltaTime);
    this.updateParameters(deltaTime, inputs);
    if (!this.applyRenderTarget(toScreen)) {
      return false;
    }
    // On first render, check if we have all inputs wired up correctly
    if (this.check) {
      if (!this.checkConnections(toScreen)) {
        ok(
          false,
          `${this.name} has unconnected connections.
          Expected Inputs: ${this.inputChannels().join(
            ", "
          )}. Outputs: ${this.outputChannels().join(", ")}.
          Have Inputs: ${[...this.inputs.keys()].join(", ")}. Outputs: ${[
            ...this.outputs.keys(),
          ].join(", ")}`
        );
      }
      this.check = false;
    }
    this.needsRender = false;
    return inputs;
  }
}

export class PostprocessingPass extends RenderPass {
  passEnabled: boolean;
  constructor(name: RenderPassName) {
    super(name);
    this.passEnabled = true;
  }

  set enabled(newVal: boolean) {
    this.passEnabled = newVal;
  }

  get enabled() {
    return this.passEnabled && super.enabled;
  }

  generateBuffers(renderToScreen: boolean) {
    // Pass through if disabled
    if (!renderToScreen && !this.enabled) {
      for (const output of this.outputChannels()) {
        const input = this.inputs.get(output);
        const prevOutput = input && input[0].outputs.get(input[1] || output);
        if (prevOutput) {
          this.outputs.set(output, prevOutput);
        }
      }
    }
  }
}

export type ClearState = {
  color?: Vec4;
  depth?: boolean;
  stencil?: boolean;
};

export function applyClearState(
  composer: RenderPassComposer,
  clearState?: ClearState
) {
  if (clearState === undefined) {
    return;
  }
  const { color, depth, stencil } = clearState;
  if (color) {
    composer.renderer.setClearColor(
      new THREE.Color(color[0], color[1], color[2]),
      color[3]
    );
  }
  if (!!color || !!depth || !!stencil) {
    composer.renderer.clear(!!color, !!depth, !!stencil);
  }
}
