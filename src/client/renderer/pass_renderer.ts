import { UnsupportedWebGLError } from "@/client/game/errors";
import type {
  PostprocessingPipeline,
  RenderPassName,
} from "@/client/game/renderers/passes/composer";
import { RenderPassComposer } from "@/client/game/renderers/passes/composer";
import type { RenderPass } from "@/client/game/renderers/passes/pass";
import { SceneBasePass } from "@/client/game/renderers/passes/scene_base_pass";
import { shaderErrorCallback } from "@/client/game/renderers/renderer_controller";
import { log } from "@/shared/logging";
import { floor2, scale2 } from "@/shared/math/linear";
import type { Vec2 } from "@/shared/math/types";
import { makeCvalHook } from "@/shared/util/cvals";
import { ok } from "assert";
import * as THREE from "three";

export interface RendererOptions {
  antialias: boolean;
  canvas?: HTMLCanvasElement;
  allowSoftwareWebGL?: boolean;
  onCanvasResized?: (width: number, height: number) => void;
}

const DEFAULT_OPTIONS = {
  antialias: false,
} satisfies RendererOptions;

export class PassRenderer {
  private threeRenderer: THREE.WebGLRenderer;
  private composer: RenderPassComposer;
  private cleanups: (() => void)[] = [];
  private pendingCanvasResize: Vec2 | undefined;
  private pendingPixelRatioChange: number | undefined;
  private options: RendererOptions;
  private earlyZ: boolean | undefined;

  constructor(
    public readonly name: string,
    scenePasses: RenderPass[],
    options?: Partial<RendererOptions>
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    let softwareRendering = false;
    try {
      // Initialize the WebGL renderer.
      this.threeRenderer = this.createContext({
        // Will result in context loss failure if the GPU is unavailble, e.g.
        // because it's in a Chrome GPU blacklist for stability/security reasons:
        //   https://chromium.googlesource.com/chromium/src/gpu/+/master/config/software_rendering_list.json
        failIfMajorPerformanceCaveat: true,
      });
    } catch (e) {
      softwareRendering = true;
      // Try again to find out if context creation was going to fail independent
      // of failIfMajorPerformanceCaveat, in which case we just let the
      // error be handled as a normal unknown exception.
      this.threeRenderer = this.createContext();
    }

    if (softwareRendering && !options?.allowSoftwareWebGL) {
      throw new UnsupportedWebGLError(
        "Biomes requires hardware acceleration for WebGL rendering, but only software is available."
      );
    }

    const context = this.threeRenderer.getContext();
    if (!(context instanceof WebGL2RenderingContext)) {
      throw new UnsupportedWebGLError("Biomes requires WebGL 2.0.");
    }

    // Tell threejs not to sort objects by depth, so that we can sort manually,
    // e.g. by material to improve performance.
    this.threeRenderer.sortObjects = false;

    this.cleanups.push(() => {
      if (!this.options.canvas) {
        // If we're owning the canvas, explicitly calling forceContextLoss()
        // on shutdown prevents some strange sporadic issues with *other*
        // GL contexts being lost.
        this.threeRenderer.forceContextLoss();
      }
      this.threeRenderer.dispose();
    });

    this.threeRenderer.debug.checkShaderErrors = true;
    this.threeRenderer.debug.onShaderError = shaderErrorCallback;
    this.threeRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.threeRenderer.autoClear = false;

    this.setPixelRatio(window.devicePixelRatio);

    // Since we have multiple render passes, we need to manually indicate when
    // a new frame is starting.
    this.threeRenderer.info.autoReset = false;

    this.composer = new RenderPassComposer(this.threeRenderer);

    for (const pass of scenePasses) {
      this.composer.registerPass(pass);
    }

    this.setEarlyZEnabled(false);

    makeCvalHook({
      path: ["renderer", name, "threejs", "info"],
      help: "Per-frame render statistics provided by three.js",
      collect: () => {
        return {
          memory: this.threeRenderer.info.memory ?? 0,
          render: this.threeRenderer.info.render ?? 0,
        };
      },
    });

    const resizeObserver = new ResizeObserver((entries) => {
      ok(entries.length === 1);
      this.onCanvasResize(
        entries[0].contentRect.width,
        entries[0].contentRect.height
      );
    });
    resizeObserver.observe(this.canvas);
    this.cleanups.push(() => resizeObserver.disconnect());
    this.onCanvasResize(this.canvas.offsetWidth, this.canvas.offsetHeight);

    this.canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    this.cleanups.push(() =>
      this.canvas.removeEventListener("webglcontextlost", this.onContextLost)
    );
  }

  private createContext(extraOptions?: Partial<THREE.WebGLRendererParameters>) {
    return new THREE.WebGLRenderer({
      canvas: this.options.canvas,
      antialias: this.options.antialias ?? DEFAULT_OPTIONS.antialias,
      powerPreference: "high-performance",
      alpha: true,
      ...extraOptions,
    });
  }

  get canvas() {
    return this.threeRenderer.domElement;
  }

  shutdown() {
    for (const cleanup of this.cleanups.reverse()) {
      cleanup();
    }
    this.cleanups.length = 0;
  }

  render() {
    // We delay render buffer size changes until we render because
    // otherwise the screen flickers black.
    if (this.pendingCanvasResize !== undefined) {
      this.threeRenderer.setSize(...this.pendingCanvasResize, false);
      this.pendingCanvasResize = undefined;
    }
    if (this.pendingPixelRatioChange !== undefined) {
      this.threeRenderer.setPixelRatio(this.pendingPixelRatioChange);
      this.pendingPixelRatioChange = undefined;
    }
    this.renderInternal();
  }

  private renderInternal() {
    if (this.canvasSize().includes(0)) {
      // Nothing to render if width or height are zero.
      return;
    }

    // Tell the threejs metric tracker that we're starting a new frame.
    this.threeRenderer.info.reset();

    this.composer.render();
  }

  screenshot({
    width,
    height,
    format = "image/png",
  }: {
    width?: number;
    height?: number;
    format?: "image/png" | "image/jpeg" | "image/webp";
  } = {}) {
    // Saving these results into the pending fields will cause them to be
    // set the next time a render is done.
    this.pendingCanvasResize = this.canvasSize();
    this.pendingPixelRatioChange = this.pixelRatio();

    width = width || this.pendingCanvasResize[0];
    height = height || this.pendingCanvasResize[1];

    this.threeRenderer.setPixelRatio(1);
    this.threeRenderer.setSize(width, height, false);

    // Render to the canvas so that we can extract the results.
    this.renderInternal();

    const screenshotDataUri = this.canvas.toDataURL(format);

    return {
      screenshotDataUri,
      width,
      height,
      format,
    };
  }

  renderTargetSize(): Vec2 {
    return floor2(scale2(this.pixelRatio(), this.canvasSize()));
  }

  canvasSize(): Vec2 {
    return (
      this.pendingCanvasResize ??
      this.threeRenderer.getSize(new THREE.Vector2()).toArray()
    );
  }

  pixelRatio(): number {
    return this.pendingPixelRatioChange ?? this.threeRenderer.getPixelRatio();
  }

  setPixelRatio(ratio: number) {
    if (ratio === this.pixelRatio()) {
      return;
    }
    this.pendingPixelRatioChange = ratio;
  }

  context(): WebGLRenderingContext | WebGL2RenderingContext {
    const context = this.threeRenderer.getContext();
    ok(context instanceof WebGL2RenderingContext);
    return context;
  }

  postprocesses() {
    return this.composer.postprocesses;
  }

  setPostprocesses(newPostprocs: PostprocessingPipeline) {
    this.composer.setPostprocesses(newPostprocs);
  }

  getPass(passName: RenderPassName) {
    return this.composer.getPass(passName);
  }

  setEarlyZEnabled(enabled: boolean) {
    if (enabled === this.earlyZ) {
      return;
    }
    this.earlyZ = enabled;

    const basePass = this.getPass("base");
    if (basePass && basePass instanceof SceneBasePass) {
      basePass.options.clearState.depth = !enabled;
      basePass.options.clearState.stencil = !enabled;
      basePass.options.additionalInputs = enabled ? ["depth"] : [];
    }
    this.composer.needsRechain = true;
  }

  private onCanvasResize(width: number, height: number) {
    // We set updateStyle to false because if we're in this function,
    // then we're already responding to a style size update.
    this.pendingCanvasResize = [width, height];

    // Let our host know that the canvas size has changed.
    this.options.onCanvasResized?.(width, height);
  }

  private onContextLost = (event: Event) => {
    event.preventDefault();
    const maybeWebGlError = this.threeRenderer.getContext().getError();
    log.fatal(
      `Unexpectedly lost main WebGL context. ${
        maybeWebGlError ? `WebGL getError(): ${maybeWebGlError}` : ""
      }`
    );
  };
}
