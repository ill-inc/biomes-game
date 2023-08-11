import * as THREE from "three";

export class SharedWebGLRenderTarget extends THREE.WebGLRenderTarget {
  constructor(
    width: number,
    height: number,
    targetTexture: THREE.Texture,
    options = {}
  ) {
    super(width, height, options);
    this.texture.dispose();
    this.texture = targetTexture;
  }

  setSize(width: number, height: number, depth: number = 1) {
    if (
      this.width !== width ||
      this.height !== height ||
      this.depth !== depth
    ) {
      this.width = width;
      this.height = height;
      this.depth = depth;

      this.dispose();
    }
    this.viewport.set(0, 0, width, height);
    this.scissor.set(0, 0, width, height);
  }

  copy(source: THREE.WebGLRenderTarget) {
    this.width = source.width;
    this.height = source.height;
    this.depth = source.depth;

    this.viewport.copy(source.viewport);

    this.texture = source.texture;

    this.depthBuffer = source.depthBuffer;
    this.stencilBuffer = source.stencilBuffer;

    if (source.depthTexture !== null) {
      this.depthTexture = source.depthTexture.clone();
    }

    this.samples = source.samples;

    return this;
  }
}
