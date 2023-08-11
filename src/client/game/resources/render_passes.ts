import type { ClientContext } from "@/client/game/context";
import {
  makeTextureDebugPass,
  makeVisualizeBaseDepthPass,
  makeVisualizeDepthPass,
  makeVisualizeDepthPrePass,
  makeVisualizeNormalsPass,
  makeVisualizeSecondaryColorPass,
} from "@/client/game/renderers/passes/debug_passes";
import { makeSkyPostprocessingPasses } from "@/client/game/renderers/passes/sky";
import { makeSkyColorDebugPass } from "@/client/game/renderers/passes/skycolor";
import { makeStandardPostprocessingPipeline } from "@/client/game/renderers/passes/standard_passes";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type { RegistryLoader } from "@/shared/registry";

function genPostProcessingPipeline(
  context: ClientContext,
  deps: ClientResourceDeps
) {
  const graphicsSettings = deps.get("/settings/graphics/dynamic");

  const getCamera = () => context.resources.get("/scene/camera").three;

  const postprocesses = [
    ...makeSkyPostprocessingPasses(context, {
      // If bloom is not enabled, then we can bake color correction right
      // into the skyfade pass.
      withColorCorrection: !graphicsSettings.postprocesses.bloom,
    }),
    ...makeStandardPostprocessingPipeline(getCamera, {
      bloom: graphicsSettings.postprocesses.bloom,
      aa: graphicsSettings.postprocesses.aa,
      ssao: graphicsSettings.postprocesses.ssao,
    }),
  ];
  if (context.clientConfig.dev) {
    switch (graphicsSettings.postprocesses.debug) {
      default:
        break;
      case "normal":
        postprocesses.push(makeVisualizeNormalsPass());
        break;
      case "depth":
        postprocesses.push(makeVisualizeDepthPass(getCamera));
        break;
      case "depthPre":
        postprocesses.push(makeVisualizeDepthPrePass(getCamera));
        break;
      case "depthBase":
        postprocesses.push(makeVisualizeBaseDepthPass(getCamera));
        break;
      case "secondarycolor":
        postprocesses.push(makeVisualizeSecondaryColorPass());
        break;
      case "texture":
        postprocesses.push(makeTextureDebugPass());
        break;
      case "skyColorDebug":
        postprocesses.push(makeSkyColorDebugPass(context.resources));
        break;
    }
  }
  return postprocesses;
}

export function addRenderPassResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  // Returns the game renderer post-processing pipeline.
  builder.addHashChecked(
    "/renderer/postprocesses",
    loader.provide(genPostProcessingPipeline),
    // It's important to only recompute the post-processing pipeline when the
    // graphics settings change, because if the pipeline values change (even
    // if their contents do not), the graphics pipeline will be recreated
    // which can result in flickers.
    (deps) => deps.get("/settings/graphics/dynamic").postprocesses
  );
}
