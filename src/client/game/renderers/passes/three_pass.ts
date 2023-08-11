import type {
  RenderPassChannel,
  RenderPassName,
} from "@/client/game/renderers/passes/composer";
import { PostprocessingPass } from "@/client/game/renderers/passes/pass";
import * as THREE from "three";
import type { Pass } from "three/examples/jsm/postprocessing/Pass";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass";
import type { WebGLRenderer } from "three/src/renderers/WebGLRenderer";

export class ThreePostprocessPass<T extends Pass> extends PostprocessingPass {
  threePass: T;
  changesReadBuffer: boolean;
  readTarget?: THREE.WebGLRenderTarget;

  constructor(
    name: RenderPassName,
    threePass: T,
    changesReadBuffer: boolean = false
  ) {
    super(name);
    this.name = name;
    this.threePass = threePass;
    this.changesReadBuffer = changesReadBuffer;
  }

  inputChannels() {
    return ["color"] as RenderPassChannel[];
  }

  outputChannels() {
    return ["color"] as RenderPassChannel[];
  }

  generateBuffers(renderToScreen: boolean) {
    this.outputs.clear();
    if (!this.composer) {
      return;
    }
    const size = this.computeBufferSize();

    if (this.readTarget) {
      this.readTarget.dispose();
    }
    this.readTarget = new THREE.WebGLRenderTarget(size.width, size.height);
    this.readTarget.stencilBuffer = false;
    this.readTarget.depthBuffer = false;
    this.readTarget.texture.dispose();

    const target = new THREE.WebGLRenderTarget(size.width, size.height);
    if (!renderToScreen) {
      if (!this.changesReadBuffer) {
        target.texture.format = THREE.RGBAFormat;
        target.texture.minFilter = THREE.NearestFilter;
        target.texture.magFilter = THREE.NearestFilter;
        target.texture.generateMipmaps = false;
        target.stencilBuffer = false;
        target.depthBuffer = false;
        if (this.target) {
          this.target.dispose();
        }
      }
      this.outputs.set("color", target.texture);
    }
    this.target = target;
  }

  resizeBuffers(): void {
    super.resizeBuffers();
    const renderer = this.composer?.renderer;
    if (renderer) {
      const size = renderer.getSize(new THREE.Vector2());
      const pixelRatio = renderer.getPixelRatio();
      if (this.target) {
        this.target.setSize(size.width * pixelRatio, size.height * pixelRatio);
      }
      this.threePass.setSize(size.width * pixelRatio, size.height * pixelRatio);
    }
  }

  render(deltaTime: number, toScreen: boolean = false) {
    const inputs = super.render(deltaTime, toScreen);
    if (inputs === false) {
      return false;
    }
    this.readTarget!.texture = inputs.get("color")!;
    if (this.changesReadBuffer) {
      this.outputs.set("color", this.readTarget!.texture);
    }
    this.threePass.renderToScreen = toScreen;
    this.threePass.render(
      this.composer!.renderer as WebGLRenderer,
      this.target!,
      this.readTarget!,
      deltaTime,
      false
    );
    return inputs;
  }
}

// These passes will be resized when they're attached to a context, which is
// the time we'll actually know the buffer size, so provide a dummy value
// upon initialization.
const DUMMY_BUFFER_SIZE = new THREE.Vector2(1, 1);

export function makeThreeSmaaPass() {
  return new ThreePostprocessPass(
    "threeSmaa",
    new SMAAPass(DUMMY_BUFFER_SIZE.x, DUMMY_BUFFER_SIZE.y)
  );
}
