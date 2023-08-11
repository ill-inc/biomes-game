import type { ClientContextSubset } from "@/client/game/context";
import type { PostprocessingPipeline } from "@/client/game/renderers/passes/composer";
import {
  SkyColorMultipleScatteringLUT,
  SkyColorSkyMapLUT,
  SkyColorTransmittanceLUT,
} from "@/client/game/renderers/passes/skycolor";
import { SkyFadePass } from "@/client/game/renderers/passes/skyfade";

export function makeSkyPostprocessingPasses(
  context: ClientContextSubset<"resources">,
  options?: { withColorCorrection?: boolean }
): PostprocessingPipeline {
  const camera = context.resources.get("/scene/camera").three;

  return [
    new SkyColorTransmittanceLUT("skyColorTransmittance"),
    new SkyColorMultipleScatteringLUT("skyColorMultipleScattering"),
    new SkyColorSkyMapLUT(context, "skyColorSkyMap", camera),
    new SkyFadePass(context, "skyFade", camera, options),
  ];
}
