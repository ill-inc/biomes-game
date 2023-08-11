import {
  BloomCombinePass,
  BloomDownsamplePass,
  BloomGaussianPass,
  BloomThresholdPass,
} from "@/client/game/renderers/passes/bloom";
import { ColorCorrectionPass } from "@/client/game/renderers/passes/color_correction";
import type { PostprocessingPipeline } from "@/client/game/renderers/passes/composer";
import { DepthPrePass } from "@/client/game/renderers/passes/depth_pre_pass";
import type { RenderPass } from "@/client/game/renderers/passes/pass";
import { SceneBasePass } from "@/client/game/renderers/passes/scene_base_pass";
import { ScenePass } from "@/client/game/renderers/passes/scene_pass";
import { SceneWaterPass } from "@/client/game/renderers/passes/scene_water_pass";
import { SSAOPass } from "@/client/game/renderers/passes/ssao";
import { makeThreeSmaaPass } from "@/client/game/renderers/passes/three_pass";
import type { Scenes } from "@/client/game/renderers/scenes";
import type * as THREE from "three";

export interface ScenePassDeps {
  getCamera: () => THREE.PerspectiveCamera;
  getFogStartFar?: () => number;
}

export interface StandardPostprocessingOptions {
  bloom: boolean;
  aa: "smaa" | "none";
  ssao: "ssao" | "none";
}

const DEFAULT_OPTIONS: StandardPostprocessingOptions = {
  bloom: true,
  aa: "smaa",
  ssao: "ssao",
};

// Defines some standard post-processing pipeline passes that can be used in
// a wide range of contexts, such as in-game or in editor tools.
export function makeStandardPostprocessingPipeline(
  getCamera: () => THREE.PerspectiveCamera,
  options?: Partial<StandardPostprocessingOptions>
): PostprocessingPipeline {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };

  const pipeline: PostprocessingPipeline = [];

  if (resolvedOptions.bloom) {
    // If bloom is enabled, then we apply color correction after it,
    // otherwise we'll inline color correction at the end of skyfade.
    pipeline.push(new ColorCorrectionPass("color_correction"));
    pipeline.push(...makeBloomPasses());
  }

  if (resolvedOptions.aa === "smaa") {
    pipeline.push(makeThreeSmaaPass());
  }
  if (resolvedOptions.ssao === "ssao") {
    pipeline.push(new SSAOPass("ssao", getCamera));
  }

  return pipeline;
}

function makeBloomPasses(): PostprocessingPipeline {
  return [
    new BloomThresholdPass("bloomThreshold"),
    new BloomDownsamplePass("bloomDownsample0", 0),
    new BloomDownsamplePass("bloomDownsample1", 1),
    new BloomDownsamplePass("bloomDownsample2", 2),
    new BloomDownsamplePass("bloomDownsample3", 3),
    new BloomDownsamplePass("bloomDownsample4", 4),
    new BloomGaussianPass("bloomGaussian0", true),
    new BloomGaussianPass("bloomGaussian1", false),
    new BloomCombinePass("bloomCombine"),
  ];
}

export function makeStandardScenePasses(
  deps: ScenePassDeps,
  scenes: Scenes
): RenderPass[] {
  return [
    new DepthPrePass(deps, "earlyz", "depth", [scenes.base], {
      clearState: {
        color: [0, 0, 0, 0],
        depth: true,
        stencil: true,
      },
      // Note, since this is a shared target, it'll only really be correct if nothing else is rendering to the shared target after
      additionalOutputs: ["depthPre"],
    }),
    // Base render pass
    new SceneBasePass(deps, "base", [scenes.base], {
      clearState: {
        color: [0, 0, 0, 0],
        depth: true,
        stencil: true,
      },
      additionalInputs: [],
    }),
    // Water and secondary render to the same target, we want them both
    // to be fogged
    new SceneWaterPass(deps, [scenes.water], {
      additionalInputs: ["color", "depth"],
    }),
    new ScenePass(deps, "secondary", [scenes.three], {
      sharedTarget: "secondaryColor",
      outputChannel: "secondaryColor",
      additionalInputs: ["secondaryColor", "depth"],
    }),
    // Punchthrough to set alpha to a specific value
    new ScenePass(deps, "punchthrough", [scenes.punchthrough], {
      outputChannel: "punchthroughColor",
      clearState: {
        color: [1, 0, 0, 1],
      },
      additionalInputs: ["depth"],
    }),
    // Translucency is rendered to its own texture, since it's layered
    // after rendering sky.
    // Note that we should eventually share the render target texture with
    // the water pass, since we can render directly on top and
    // save the VRAM, but we need to modify ThreeJS's render target memory
    // management, since skyfade uses depth as an input
    new ScenePass(deps, "translucency", [scenes.translucent], {
      outputChannel: "translucency",
      clearState: {
        color: [0, 0, 0, 0],
      },
      additionalInputs: ["depth"],
    }),
  ];
}
