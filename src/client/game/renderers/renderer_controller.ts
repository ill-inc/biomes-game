import type { ClientConfig } from "@/client/game/client_config";
import type { ClientContext } from "@/client/game/context";
import type { RenderPassName } from "@/client/game/renderers/passes/composer";
import type { RenderPass } from "@/client/game/renderers/passes/pass";
import type { ScenePassDeps } from "@/client/game/renderers/passes/standard_passes";
import { makeStandardScenePasses } from "@/client/game/renderers/passes/standard_passes";
import { PerformanceProfiler } from "@/client/game/renderers/performance_profiler";
import type { Scenes } from "@/client/game/renderers/scenes";
import { createNewScenes } from "@/client/game/renderers/scenes";
import { CSS3DRenderer } from "@/client/game/renderers/three_ext/css3d";
import { DynamicSettingsUpdater } from "@/client/game/resources/dynamic_settings_updater";
import type {
  ClientReactResources,
  ClientResources,
} from "@/client/game/resources/types";
import type { ScriptController } from "@/client/game/scripts/script_controller";
import { PassRenderer } from "@/client/renderer/pass_renderer";
import { getTypedStorageItem } from "@/client/util/typed_local_storage";
import { log } from "@/shared/logging";
import type { Vec2 } from "@/shared/math/types";
import type { PerformanceTimer } from "@/shared/metrics/performance_timing";
import { timeCode } from "@/shared/metrics/performance_timing";
import type { RegistryLoader } from "@/shared/registry";
import { makeCvalHook } from "@/shared/util/cvals";
import { ok } from "assert";
import { EventEmitter } from "events";
import { cloneDeep, isEqual } from "lodash";
import * as THREE from "three";
import type TypedEmitter from "typed-emitter";

export interface Renderer {
  name: string;
  draw(scenes: Scenes, dt: number): void;
}

export type RendererControllerEvents = {
  render: () => void;
};

// Shared render state between multiple passes
// maybe move this to resources?
export type RenderState = {
  sky: {
    sunDirection: THREE.Vector3;
    moonDirection: THREE.Vector3;
    moonDirectionOffset: THREE.Vector3;
    sunColor: THREE.Color;
    moonColor: THREE.Color;
    groundOffset: number;
    heightScale: number;
  };
};

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};
export type RenderStateDelta = RecursivePartial<RenderState>;

export function shaderErrorCallback(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  _vertexShader: WebGLShader,
  _fragmentShader: WebGLShader
) {
  log.error("Shader Error", {
    error: gl.getError(),
    validateStatus: gl.getProgramParameter(program, gl.VALIDATE_STATUS),
  });
}

export class RendererController {
  emitter: TypedEmitter<RendererControllerEvents>;
  css3dRenderer?: CSS3DRenderer;
  passRenderer?: PassRenderer;
  threeClock?: THREE.Clock;
  renderedFrames: number;
  scenes?: Scenes;
  lastSeenTweaksVersion: number;
  target?: THREE.WebGLRenderTarget;
  frameDelayTimer?: PerformanceTimer;
  val: number;
  renderingEnabled = true;
  onContextLost: (event: Event) => void;
  framerateBottleneck: "cpu" | "gpu" | undefined;
  #profiler?: PerformanceProfiler;
  private dynamicSettingsUpdater?: DynamicSettingsUpdater;
  renderSettingsVersion?: number;
  lastCanvasSize: Vec2 | undefined;
  private canvas?: HTMLCanvasElement;
  private cleanups: Array<() => unknown> = [];
  private scenePasses: RenderPass[] | undefined;
  private disabledPasses: { [K in RenderPassName]?: boolean } = {};

  constructor(
    private renderers: Renderer[],
    private resources: ClientResources,
    private rendererScripts: ScriptController,
    public readonly reactResources: ClientReactResources,
    private clientConfig: ClientConfig
  ) {
    this.emitter = new EventEmitter() as TypedEmitter<RendererControllerEvents>;
    this.emitter.setMaxListeners(1000);
    this.renderedFrames = 0;
    this.lastSeenTweaksVersion = -1;
    this.val = Math.random();

    this.onContextLost = (event: Event) => {
      event.preventDefault();
    };
  }

  setRenderers(renderers: Renderer[]) {
    this.renderers = renderers;
  }

  rendererNames() {
    return this.renderers.map((r) => r.name);
  }

  reattach() {
    const oldCanvas = this.canvas;
    if (!oldCanvas) {
      return;
    }
    this.detach();
    this.attach(oldCanvas);
  }

  detach() {
    this.passRenderer?.shutdown();
    this.passRenderer = undefined;
    this.threeClock = undefined;
    this.canvas = undefined;
    this.#profiler = undefined;
    this.dynamicSettingsUpdater = undefined;
    for (const cleanup of this.cleanups) {
      cleanup?.();
    }
    this.cleanups = [];
    this.renderSettingsVersion = undefined;
  }

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Initialize the CSS renderer.
    const containerElement = document.querySelector(".css3d-container")!;
    const cameraElement = document.querySelector(".css3d-camera")!;
    this.css3dRenderer = new CSS3DRenderer(
      containerElement as HTMLElement,
      cameraElement as HTMLElement
    );

    const tweaks = this.resources.get("/tweaks");
    this.scenes = createNewScenes();
    const scenePassDeps: ScenePassDeps = {
      getCamera: () => this.resources.get("/scene/camera").three,
      getFogStartFar: () => tweaks.fogStartFar,
    };

    this.scenePasses = makeStandardScenePasses(scenePassDeps, this.scenes);

    // Initialize the scene renderer.
    this.passRenderer = new PassRenderer("game", this.scenePasses, {
      canvas,
      allowSoftwareWebGL: this.clientConfig.allowSoftwareWebGL,
    });
    this.#profiler = new PerformanceProfiler(this.passRenderer.context(), {
      enableGpuTimer: tweaks.enableGpuTimer,
    });
    this.dynamicSettingsUpdater = new DynamicSettingsUpdater(
      this.#profiler.asReadonly()
    );

    makeCvalHook({
      path: ["renderer", "renderTargetSize"],
      help: "Width and height of the main rendering target.",
      collect: () => {
        if (!this.passRenderer) {
          return { w: 0, h: 0 };
        }
        const wh = this.passRenderer.renderTargetSize();
        return { w: wh[0], h: wh[1] };
      },
    });

    makeCvalHook({
      path: ["renderer", "graphics", "settings"],
      help: "Current finalized dynamically adjusted graphics settings.",
      collect: () => this.resources.get("/settings/graphics/dynamic"),
    });

    makeCvalHook({
      path: ["renderer", "graphics", "renderTargetPixelRatio"],
      help: "Pixel ratio of the main rendering target.",
      collect: () => this.passRenderer?.pixelRatio() ?? 0,
    });

    this.ensureRendererUpToDate();
    // Kick off an initial render. The initial render is slow due to loading of
    // large textures. This render prevents blocking in an interstitial state.
    timeCode("initialRender", () => {
      this.passRenderer!.render();
    });

    // Schedule the render loop.
    this.threeClock = new THREE.Clock();

    canvas.addEventListener("webglcontextlost", this.onContextLost, false);
  }

  renderFrame() {
    let deferredRender: (() => void) | undefined = undefined;
    try {
      if (!this.renderingEnabled || !this.canvas) {
        return;
      }
      this.#profiler!.measureCpu(() => {
        this.renderedFrames++;

        if (deferredRender) {
          deferredRender();
          deferredRender = undefined;
        }

        // Check for updated settings
        this.ensureRendererUpToDate();

        const scenes = this.scenes!;

        // Build the scene graph for this frame.
        // Clear out the existing scene because we will re-populate it each frame,
        // however we still want to re-use the same scene object from frame to
        // frame because THREE.js caches intermediate results within it.
        Object.values(scenes).map((scene) => {
          scene.clear();
          scene.materialDependencies.clear();
        });
        const delta = this.threeClock!.getDelta();
        this.rendererScripts.tick(delta, "rendererScripts");
        timeCode("draw", () => this.drawAll(scenes, delta));

        const render = () => {
          timeCode("render + postprocessing", () => {
            this.#profiler!.measureGpu(() => {
              this.css3dRenderer?.render(
                this.scenes!.css,
                this.resources.get("/scene/camera").three
              );
              this.passRenderer?.render();
            });
          });

          timeCode("react emitter invalidate", () => {
            // Update react state based on all resource changes.
            const emitter = this.reactResources.emitter;
            if (emitter) {
              emitter.eventNames().forEach((path) => {
                if (path !== "hot") {
                  emitter.emit(path);
                }
              });
            }
          });
          this.emitter.emit("render");
        };

        if (this.resources.get("/tweaks").deferSceneRender) {
          // TODO(top): Can also pre-compile the scenes here.
          deferredRender = render;
        } else {
          render();
        }
      });
    } catch (error: any) {
      log.fatal(`Exception while rendering: ${error}`, { error });
      throw error;
    }
  }

  private ensureRendererUpToDate() {
    if (!this.scenePasses) {
      return;
    }

    const tweaks = this.resources.get("/tweaks");
    const disabledPasses = tweaks.clientRendering.disabledPasses;
    if (!isEqual(this.disabledPasses, disabledPasses)) {
      this.disabledPasses = cloneDeep(disabledPasses);

      // If the set of disabled passes is modified, recreate the pass renderer
      // object with the new set of passes.
      this.passRenderer = new PassRenderer(
        "game",
        this.scenePasses.filter((p) => !this.disabledPasses[p.name]),
        {
          canvas: this.canvas,
        }
      );
    }

    // Postprocesses
    if (this.passRenderer) {
      const postprocesses = this.resources
        .get("/renderer/postprocesses")
        .filter((p) => !this.disabledPasses[p.name]);

      this.passRenderer.setPostprocesses(postprocesses);
    }

    // EarlyZ Depth PrePass
    // Quick hacky way to turn it on/off
    const useEarlyZ = !!getTypedStorageItem("settings.graphics.depthPrePass");
    this.passRenderer?.setEarlyZEnabled(useEarlyZ);

    this.checkForResizeUpdates();

    this.updateDynamicSettings();
  }

  scenePassNames(): RenderPassName[] {
    return [
      ...(this.scenePasses ?? []),
      ...this.resources.get("/renderer/postprocesses"),
    ].map((p) => p.name);
  }

  updateDynamicSettings() {
    if (!this.passRenderer) {
      return;
    }

    const [width, height] = this.getCanvasSize();
    this.dynamicSettingsUpdater?.updateDynamicSettings(
      this.resources,
      width,
      height
    );

    const dynamicSettings = this.resources.get("/settings/graphics/dynamic");

    if (this.passRenderer.pixelRatio() !== dynamicSettings.renderScale) {
      this.passRenderer.setPixelRatio(dynamicSettings.renderScale);
    }

    const renderSettingsVersion = this.resources.version(
      "/settings/graphics/dynamic"
    );
    if (renderSettingsVersion !== this.renderSettingsVersion) {
      this.renderSettingsVersion = renderSettingsVersion;
      this.#profiler?.clear();
    }
  }

  getCanvasSize(): Vec2 {
    ok(this.passRenderer);
    return this.passRenderer.canvasSize();
  }

  private checkForResizeUpdates() {
    if (!this.passRenderer) {
      return;
    }

    const canvasSize = this.passRenderer.canvasSize();
    const [width, height] = canvasSize;
    if (!isEqual(canvasSize, this.lastCanvasSize)) {
      this.lastCanvasSize = canvasSize;
      this.css3dRenderer?.setSize(width, height);
      this.resources.update("/scene/camera", (camera) => {
        camera.three.aspect = width / height;
        camera.three.updateProjectionMatrix();
      });
    }
  }

  captureScreenshot({
    width,
    height,
    format = "image/png",
  }: {
    width?: number;
    height?: number;
    format?: "image/png" | "image/jpeg";
  } = {}) {
    ok(this.passRenderer);
    const passRenderer = this.passRenderer;

    const camera = this.resources.get("/scene/camera");
    if (!camera || !this.threeClock) {
      return undefined;
    }

    const oldSize = this.getCanvasSize();
    width = width || oldSize[0];
    height = height || oldSize[1];

    camera.three.aspect = width / height;
    camera.three.updateProjectionMatrix();

    const scenes = this.scenes!;

    const delta = this.threeClock.getDelta();
    timeCode("screenshot draw", () => {
      this.drawAll(scenes, delta);
    });

    const screenshot = timeCode("screenshot", () =>
      passRenderer.screenshot({ width, height, format })
    );

    const screenshotProjectionMatrix = camera.three.projectionMatrix;
    const screenshotMatrixWorldInverse = camera.three.matrixWorldInverse;
    camera.three.aspect = oldSize[0] / oldSize[1];
    camera.three.updateProjectionMatrix();

    // Re-render the old scene
    this.drawAll(scenes, delta);
    passRenderer.render();
    return {
      ...screenshot,
      screenshotMatrixWorldInverse,
      screenshotProjectionMatrix,
    };
  }

  profiler() {
    return this.#profiler?.asReadonly();
  }

  private drawAll(scenes: Scenes, delta: number) {
    const disabledRenderers =
      this.resources.get("/tweaks").clientRendering.disabledRenderers;
    for (const renderer of this.renderers) {
      if (disabledRenderers[renderer.name] === true) {
        continue;
      }

      timeCode(`renderers:${renderer.name}`, () => {
        renderer.draw(scenes, delta);
      });
    }
  }
}

export async function buildRendererController(
  loader: RegistryLoader<ClientContext>,
  renderers: Renderer[]
) {
  // Grab all renderer dependencies.
  const [resources, reactResources, rendererScripts, clientConfig] =
    await Promise.all([
      loader.get("resources"),
      loader.get("reactResources"),
      loader.get("rendererScripts"),
      loader.get("clientConfig"),
    ]);

  return new RendererController(
    renderers,
    resources,
    rendererScripts,
    reactResources,
    clientConfig
  );
}
