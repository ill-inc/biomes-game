import { downsampleIterations } from "@/client/game/renderers/passes/bloom";
import type { RenderPass } from "@/client/game/renderers/passes/pass";
import { PostprocessingPass } from "@/client/game/renderers/passes/pass";

import { log } from "@/shared/logging";
import type { Vec2 } from "@/shared/math/types";
import { ok } from "assert";
import { isEqual } from "lodash";
import * as THREE from "three";

export const POSTPROCESS_PRE_TRANSLUCENCY_PASSES = [
  // sky color luts
  "skyColorTransmittance",
  "skyColorMultipleScattering",
  "skyColorSkyMap",

  // ssao
  "ssao",

  // sky
  "skyFade",
  "skyFadeVolume",
  // combine is used instead of skyfade for renders without a background
  "combine",
] as const;

export const POSTPROCESS_POST_TRANSLUCENCY_PASSES = [
  // Postprocess passes
  // The order of the THREE Built-in postprocs is odd since some are built
  // with support for other postproc passes, and some are not

  "textureDebug",

  // bloom
  "threeBloom",
  "threeUnrealBloom",
  "bloomThreshold",
  "bloomDownsample0",
  "bloomDownsample1",
  "bloomDownsample2",
  "bloomDownsample3",
  "bloomDownsample4",
  "bloomGaussian0",
  "bloomGaussian1",
  "bloomCombine",

  "skyColorDebug",

  // Gamma correction
  "gamma",
  "gamma22",
  "color_correction",
  "threeLut",

  // debug
  "depth",
  "normal",
  "secondarycolor",

  // Post-gamma
  "grayscale",
  "threeSmaa",
  "threeAdaptiveToneMapping",

  "threeBokeh",

  // Artistic
  "threeDot",
  "threeFilm",
  "threeHalftone",
] as const;

export const POSTPROCESS_PASSES = [
  ...POSTPROCESS_PRE_TRANSLUCENCY_PASSES,
  ...POSTPROCESS_POST_TRANSLUCENCY_PASSES,
] as const;

export const RENDER_PASSES = [
  // Base render passes
  "earlyz",
  "base",
  "water",
  "water_depth",
  "water_color",
  "secondary",
  "punchthrough",
  "translucency",
  ...POSTPROCESS_PRE_TRANSLUCENCY_PASSES,
  // TODO: we should eventually render translucency between these two passes, with a shared render target (or copy).
  ...POSTPROCESS_POST_TRANSLUCENCY_PASSES,
] as const;

export const RENDER_CHANNELS = [
  "color",
  "secondaryColor",
  "translucency",
  "depth",
  "baseDepth",
  "bloomIntermediate",
  ...downsampleIterations.map((iteration) => `bloomDownsample${iteration}`),
  "skyColorTransmittanceLUT",
  "skyColorMultipleSCatteringLUT",
  "skyColorSkyMapLUT",
  "punchthroughColor",
  "depthPre",
] as const;

export const SHARED_BUFFERS = ["depth", "secondaryColor"];
export const SHARED_TARGETS = ["secondaryColor"];

export type RenderPassName = (typeof RENDER_PASSES)[number];
export type PostprocessName = (typeof POSTPROCESS_PASSES)[number];
export type RenderPassChannel = (typeof RENDER_CHANNELS)[number];
export type SharedBufferName = (typeof SHARED_BUFFERS)[number];
export type SharedTargetName = (typeof SHARED_BUFFERS)[number];

const debugText = false;

export type PostprocessingPipeline = PostprocessingPass[];

export class RenderPassComposer {
  passMap: Map<RenderPassName, RenderPass>;
  renderer: THREE.WebGLRenderer;
  outputPassName?: RenderPassName;
  clock: THREE.Clock;
  buffersDirty: boolean;
  previousTargetBufferSize: Vec2 | undefined;
  needsRechain: boolean;
  postprocesses: PostprocessingPipeline;
  sharedBuffers: { [name in SharedBufferName]?: THREE.Texture };
  sharedTargets: { [name in SharedTargetName]?: THREE.WebGLRenderTarget };

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.clock = new THREE.Clock();
    this.passMap = new Map();
    this.buffersDirty = true;
    this.needsRechain = true;
    this.sharedBuffers = {};
    this.sharedTargets = {};
    this.postprocesses = [];
  }

  generateBuffers() {
    if (this.outputPassName === undefined) {
      return;
    }
    debugText && log.info("generating shared buffers");
    for (const buffer of Object.values(this.sharedBuffers)) {
      buffer?.dispose();
    }
    for (const target of Object.values(this.sharedTargets)) {
      target?.dispose();
    }
    this.sharedBuffers = {};
    this.sharedTargets = {};
    const pixelRatio = this.renderer.getPixelRatio();
    const size = this.renderer.getSize(new THREE.Vector2());
    size.width *= pixelRatio;
    size.height *= pixelRatio;
    size.width = Math.max(size.width, 1);
    size.height = Math.max(size.height, 1);

    // Shared depth
    const depthTexture = new THREE.DepthTexture(
      size.width * pixelRatio,
      size.height * pixelRatio
    );
    depthTexture.format = THREE.DepthFormat;
    depthTexture.type = THREE.UnsignedIntType;
    this.sharedBuffers.depth = depthTexture;

    // Shared secondary color
    const secondaryColorTarget = new THREE.WebGLRenderTarget(
      size.width,
      size.height,
      { depthTexture }
    );
    secondaryColorTarget.texture.format = THREE.RGBAFormat;
    secondaryColorTarget.texture.type = THREE.HalfFloatType;
    secondaryColorTarget.texture.minFilter = THREE.NearestFilter;
    secondaryColorTarget.texture.magFilter = THREE.NearestFilter;
    secondaryColorTarget.texture.generateMipmaps = false;
    this.sharedTargets.secondaryColor = secondaryColorTarget;
    this.sharedBuffers.secondaryColor = secondaryColorTarget.texture;

    debugText && log.info("generating unique buffers");
    const outputPass = this.passMap.get(this.outputPassName);
    outputPass?.destroyBuffers();
    outputPass?.generateBuffers(true);
    debugText && log.info(`generated for output pass: ${outputPass?.name}`);
    for (const pass of this.passMap.values()) {
      if (pass !== outputPass && pass.enabled) {
        pass.destroyBuffers();
        pass.generateBuffers(false);
        debugText && log.info(`generated for intermediate pass: ${pass.name}`);
      }
    }
  }

  resizeBuffers() {
    // Resize shared
    // getDrawingBufferSize is based on the canvas size and the pixel ratio.
    const drawBufferSize = this.renderer.getDrawingBufferSize(
      new THREE.Vector2()
    );
    for (const buffer of Object.values(this.sharedBuffers)) {
      if (buffer) {
        buffer.image = {
          width: drawBufferSize.width,
          height: drawBufferSize.height,
        };
      }
    }
    for (const target of Object.values(this.sharedTargets)) {
      target?.setSize(drawBufferSize.width, drawBufferSize.height);
    }

    // Resize unique
    for (const pass of this.passMap.values()) {
      pass.resizeBuffers();
    }
  }

  getSharedBuffer(name: SharedBufferName) {
    return this.sharedBuffers[name];
  }

  getSharedTarget(name: SharedTargetName) {
    return this.sharedTargets[name];
  }

  registerPass(pass: RenderPass) {
    this.passMap.set(pass.name, pass);
    pass.composer = this;
    // Make sure the pass' buffer size is up-to-date upon attaching.
    pass.resizeBuffers();

    this.needsRechain = true;
  }

  unregisterPass(pass: RenderPass) {
    this.passMap.delete(pass.name);
    pass.composer = undefined;

    this.needsRechain = true;
  }

  getPass(passName: RenderPassName) {
    return this.passMap.get(passName);
  }

  private chainPasses() {
    // Chain in a specific order
    const lastChannelPasses = new Map<RenderPassChannel, RenderPass>();
    let changed = false;
    debugText && log.info("Chaining passes.");

    for (const passName of RENDER_PASSES) {
      const pass = this.passMap.get(passName);
      if (pass === undefined) {
        continue;
      }
      // Wire inputs
      for (const input of pass.inputChannels()) {
        const inputPass = lastChannelPasses.get(input);
        if (!inputPass) {
          // Be silent about manually disabled postprocess passes
          if (!(pass instanceof PostprocessingPass && !pass.passEnabled)) {
            log.info(
              `Pass ${passName} requires ${input}, but it has not yet been generated.
            Existing inputs: ${[...lastChannelPasses.keys()].join(", ")}.
            Registered passes: ${[...this.passMap.keys()].join(", ")}`
            );
          }
        }
        const existingInput = pass.inputs.get(input);
        if (
          !existingInput ||
          existingInput[0] !== inputPass ||
          existingInput[1] !== undefined
        ) {
          pass.setInput(input, inputPass);
          changed = true;
        }
      }
      // Remove any unused inputs
      const inputs = new Set(pass.inputChannels());
      for (const input of pass.inputs) {
        if (!inputs.has(input[0])) {
          pass.setInput(input[0], undefined);
          changed = true;
        }
      }
      // Also test for enabled passes after inputs; passes may be disabled if inputs are not connected
      if (!pass.enabled) {
        continue;
      }
      // Set outputs
      for (const output of pass.outputChannels()) {
        lastChannelPasses.set(output, pass);
      }
      debugText &&
        log.info(`Chain Passes: ${passName}.
Inputs:
${[...pass.inputs.entries()]
  .map(
    ([name, [pass, output]]) => `    ${name}: ${pass.name}//${output || name}`
  )
  .join("\n")}
Outputs:
${pass
  .outputChannels()
  .map((name) => `    ${name}`)
  .join("\n")}
Channel chain:
${[...lastChannelPasses.entries()]
  .map(([name, pass]) => `    ${name}: ${pass.name}`)
  .join("\n")}
        `);
    }

    const outputPass = lastChannelPasses.get("color");
    ok(
      outputPass !== undefined,
      `No output color pass found! Passes: ${this.passMap.keys()}`
    );
    if (this.outputPassName !== outputPass.name) {
      this.outputPassName = outputPass.name;
      changed = true;
    }

    if (changed) {
      debugText && log.info("Pass chain changed.");
      this.buffersDirty = true;
    }
  }

  setPostprocesses(newPostprocs: PostprocessingPipeline) {
    for (const postproc of this.postprocesses) {
      if (!newPostprocs.includes(postproc)) {
        this.unregisterPass(postproc);
      }
    }
    for (const postproc of newPostprocs) {
      if (!this.postprocesses.includes(postproc)) {
        this.registerPass(postproc);
      }
    }

    this.postprocesses = newPostprocs;
  }

  render(deltaTime?: number) {
    if (this.needsRechain) {
      this.chainPasses();
      this.needsRechain = false;
    }
    if (this.buffersDirty) {
      this.generateBuffers();
      this.buffersDirty = false;
    }

    const targetBufferSize = this.renderer
      .getDrawingBufferSize(new THREE.Vector2())
      .toArray();
    if (!isEqual(targetBufferSize, this.previousTargetBufferSize)) {
      this.resizeBuffers();
      this.previousTargetBufferSize = targetBufferSize;
    }
    // May need a rechain after regenerating buffers
    if (this.needsRechain) {
      this.chainPasses();
      this.needsRechain = false;
    }
    deltaTime = deltaTime === undefined ? this.clock.getDelta() : deltaTime;
    const outputPass =
      this.outputPassName && this.passMap.get(this.outputPassName);
    for (const pass of this.passMap.values()) {
      pass.needsRender = true;
    }
    if (!outputPass) {
      ok(false, "No output pass found");
    }
    outputPass.render(deltaTime, true);
  }
}
