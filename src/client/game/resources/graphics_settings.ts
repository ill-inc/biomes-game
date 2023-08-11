import type { ClientContext } from "@/client/game/context";

import type {
  ClientResourceDeps,
  ClientResources,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type {
  ComputedRenderScale,
  DrawDistance,
  EntityDrawLimit,
  GraphicsQuality,
  PostprocessAA,
  PostprocessDebug,
  PostprocessSSAO,
  RenderScale,
  TypesafeLocalStorageSchema,
} from "@/client/util/typed_local_storage";
import {
  addTypedStorageChangeListener,
  getTypedStorageItem,
  removeTypedStorageChangeListener,
} from "@/client/util/typed_local_storage";
import { makeDisposable } from "@/shared/disposable";
import type { RegistryLoader } from "@/shared/registry";
import { assertNever } from "@/shared/util/type_helpers";
import { omitBy } from "lodash";

const LISTEN_SETTINGS: (keyof TypesafeLocalStorageSchema)[] = [
  "settings.graphics.renderScale",
  "settings.graphics.quality",
  "settings.graphics.postprocessing.aa",
  "settings.graphics.postprocessing.bloom",
  "settings.graphics.postprocessing.ssao",
  "settings.graphics.waterReflection",
  "settings.graphics.postprocessing.debug",
  "settings.graphics.drawDistance",
  "settings.graphics.entityDrawLimit",
  "settings.graphics.depthPrePass",
];

type LiteralPostProcesses = {
  bloom?: boolean;
  aa?: PostprocessAA;
  ssao?: PostprocessSSAO;
  debug?: PostprocessDebug;
  waterReflection?: boolean;
};

export type LiteralGraphicsSettings = {
  quality?: GraphicsQuality;
  renderScale?: RenderScale;
  entityDrawLimit?: EntityDrawLimit;
  drawDistance?: DrawDistance;
  postprocesses?: LiteralPostProcesses;
  floraQuality?: "low" | "high";
};

export type ResolvedGraphicsSettings = Required<LiteralGraphicsSettings> & {
  postprocesses: Required<LiteralPostProcesses>;
};

export type ComputedGraphicsSettings = {
  renderScale: ComputedRenderScale;
  entityDrawLimit: number;
  drawDistance: "dynamic" | number;
  postprocesses: Required<LiteralPostProcesses>;
  floraQuality: "low" | "high";
};

export type DynamicGraphicsSettings = Omit<
  ComputedGraphicsSettings,
  "renderScale" | "drawDistance"
> & {
  renderScale: number;
  drawDistance: number;
};

export function drawLimitValueWithTweak(
  resources: ClientResources,
  tweakValue: number
) {
  // This function is a bit of a hack to make it so that graphics settings
  // aren't invalidated every time tweaks change.
  const useTweak =
    resources.get("/settings/graphics/resolved").entityDrawLimit === "tweaks";
  return useTweak
    ? tweakValue
    : resources.get("/settings/graphics/dynamic").entityDrawLimit;
}

function genGraphicsSettingsLiteral(
  context: ClientContext,
  _deps: ClientResourceDeps
): LiteralGraphicsSettings {
  // Raw user settings, with defaults.
  const cleanups: (() => void)[] = [];
  const settingChangedCb = () =>
    context.resources.invalidate("/settings/graphics/literal");
  for (const setting of LISTEN_SETTINGS) {
    addTypedStorageChangeListener(setting, settingChangedCb);
    cleanups.push(() => {
      removeTypedStorageChangeListener(setting, settingChangedCb);
    });
  }
  const dispose = () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
  return makeDisposable(
    {
      quality: getTypedStorageItem("settings.graphics.quality") ?? undefined,
      renderScale:
        getTypedStorageItem("settings.graphics.renderScale") ?? undefined,
      entityDrawLimit:
        getTypedStorageItem("settings.graphics.entityDrawLimit") ?? undefined,
      drawDistance:
        getTypedStorageItem("settings.graphics.drawDistance") ?? undefined,
      postprocesses: {
        bloom:
          getTypedStorageItem("settings.graphics.postprocessing.bloom") ??
          undefined,
        aa:
          getTypedStorageItem("settings.graphics.postprocessing.aa") ??
          undefined,
        ssao:
          getTypedStorageItem("settings.graphics.postprocessing.ssao") ??
          undefined,
        waterReflection:
          getTypedStorageItem("settings.graphics.waterReflection") ?? undefined,
        debug:
          getTypedStorageItem("settings.graphics.postprocessing.debug") ??
          undefined,
      },
    },
    dispose
  );
}

function genGraphicsSettingsResolved(
  context: ClientContext,
  deps: ClientResourceDeps
): ResolvedGraphicsSettings {
  // Resolves user settings, which represents
  // inferred settings that a user could conceivably set themselves
  const literal = deps.get("/settings/graphics/literal");
  const quality =
    context.clientConfig.forceGraphicsQuality ?? literal.quality ?? "auto";
  const hasDynamicRenderScale =
    context.rendererController.profiler()?.supportsGpuTime() ?? false;
  const gpuTier = context.clientConfig.gpuTier;

  // Easy presets
  if (quality === "low") {
    return {
      quality: "low",
      renderScale: hasDynamicRenderScale
        ? { kind: "dynamic" }
        : { kind: "resolution", res: [1280, 720] },
      entityDrawLimit: "low",
      drawDistance: "low",
      floraQuality: "low",
      postprocesses: {
        bloom: false,
        aa: "none",
        ssao: "none",
        waterReflection: false,
        debug: "none",
      },
    };
  }

  if (quality === "high") {
    return {
      quality: "high",
      renderScale: hasDynamicRenderScale
        ? { kind: "dynamic" }
        : { kind: "resolution", res: [3840, 2160] },
      entityDrawLimit: "high",
      drawDistance: "high",
      floraQuality: "high",
      postprocesses: {
        bloom: true,
        aa: "smaa",
        ssao: "ssao",
        waterReflection: true,
        debug: "none",
      },
    };
  }

  if (quality === "safeMode") {
    // Turn everything to the lowest settings and don't use dynamic adjustments.
    return {
      quality: "safeMode",
      renderScale: { kind: "scale", scale: 0.3 },
      entityDrawLimit: "low",
      drawDistance: "veryLow",
      floraQuality: "low",
      postprocesses: {
        bloom: false,
        aa: "none",
        ssao: "none",
        waterReflection: false,
        debug: "none",
      },
    };
  }

  // Auto presets.
  const autoQuality: ResolvedGraphicsSettings = {
    quality: "auto",
    renderScale: { kind: "dynamic" },
    entityDrawLimit: "auto",
    drawDistance: "dynamic",
    floraQuality: gpuTier > 2 ? "high" : "low",
    postprocesses: {
      bloom: gpuTier > 2,
      aa: gpuTier > 2 ? "smaa" : "none",
      ssao: gpuTier > 2 ? "ssao" : "none",
      waterReflection: gpuTier > 2,
      debug: "none",
    },
  };
  if (quality === "auto" || quality === undefined) {
    return autoQuality;
  }

  // Should only be custom beyond this point
  // Custom settings overwrite any auto settings
  if (quality !== "custom") {
    assertNever(quality);
  }
  const customQuality: ResolvedGraphicsSettings = {
    ...autoQuality,
    ...omitBy(literal, (v) => v === undefined),
    quality: "custom",
  };
  return customQuality;
}

function genGraphicsSettingsComputed(
  context: ClientContext,
  deps: ClientResourceDeps
): ComputedGraphicsSettings {
  // Takes resolved render settings and translates them into more system-centric settings
  // i.e. resolves auto when applicable
  const resolvedSettings = deps.get("/settings/graphics/resolved");
  return {
    renderScale: computeRenderScale(context, resolvedSettings),
    entityDrawLimit: computeEntityDrawLimit(context, resolvedSettings),
    drawDistance: computeDrawDistance(context, resolvedSettings),
    postprocesses: resolvedSettings.postprocesses,
    floraQuality: resolvedSettings.floraQuality,
  };
}

function computeRenderScale(
  { rendererController, clientConfig }: ClientContext,
  resolved: ResolvedGraphicsSettings
): ComputedRenderScale {
  if (clientConfig.forceRenderScale !== undefined) {
    return { kind: "scale", scale: clientConfig.forceRenderScale };
  }

  if (resolved.renderScale.kind === "dynamic") {
    if (rendererController.profiler()?.supportsGpuTime() ?? false) {
      return { kind: "dynamic" };
    } else {
      switch (clientConfig.gpuTier) {
        case 3:
          return { kind: "scale", scale: 1 };
        case 2:
        default:
          return { kind: "scale", scale: 0.8 };
        case 1:
          return { kind: "scale", scale: 0.5 };
        case 0:
          return { kind: "scale", scale: 0.5 };
      }
    }
  } else if (resolved.renderScale.kind === "retina") {
    return { kind: "scale", scale: window.devicePixelRatio };
  } else if (resolved.renderScale.kind === "native") {
    return { kind: "scale", scale: 1.0 };
  }
  return resolved.renderScale;
}

const ENTITY_DRAW_LIMITS: {
  [key in Exclude<EntityDrawLimit, "auto" | "tweaks">]: number;
} = {
  low: 15,
  medium: 25,
  high: 35,
};

function computeEntityDrawLimit(
  { clientConfig }: ClientContext,
  resolved: ResolvedGraphicsSettings
) {
  if (
    resolved.entityDrawLimit === "auto" ||
    resolved.entityDrawLimit === "tweaks"
  ) {
    switch (clientConfig.gpuTier) {
      case 2:
        return ENTITY_DRAW_LIMITS["medium"];
      case 3:
        return ENTITY_DRAW_LIMITS["high"];
      default:
        return ENTITY_DRAW_LIMITS["low"];
    }
  }
  return ENTITY_DRAW_LIMITS[resolved.entityDrawLimit];
}

const DRAW_DISTANCES: {
  [key in Exclude<DrawDistance, "dynamic">]: number;
} = {
  veryLow: 64,
  low: 96,
  medium: 128,
  high: 256,
};

function computeDrawDistance(
  { clientConfig }: ClientContext,
  resolved: ResolvedGraphicsSettings
) {
  if (clientConfig.forceDrawDistance !== undefined) {
    return clientConfig.forceDrawDistance;
  }

  if (resolved.drawDistance === "dynamic") {
    return "dynamic";
  }
  return DRAW_DISTANCES[resolved.drawDistance];
}

function genGraphicsSettingsDynamic(
  context: ClientContext,
  deps: ClientResourceDeps
): DynamicGraphicsSettings {
  const computedSettings = deps.get("/settings/graphics/computed");
  const gpuTier = context.clientConfig.gpuTier;

  const renderScale =
    computedSettings.renderScale.kind === "scale"
      ? computedSettings.renderScale.scale
      : deps.get("/settings/graphics/dynamic_render_scale").value ??
        (gpuTier <= 1 ? 0.5 : 1.0);

  const drawDistance =
    computedSettings.drawDistance === "dynamic"
      ? deps.get("/settings/graphics/dynamic_draw_distance").value ??
        DRAW_DISTANCES.low
      : computedSettings.drawDistance;

  return {
    ...computedSettings,
    renderScale,
    drawDistance,
  };
}

export function addGraphicsSettingsResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  // The graphics settings explicitly specified by the user's preferences.
  builder.add(
    "/settings/graphics/literal",
    loader.provide(genGraphicsSettingsLiteral)
  );
  // Graphics settings after all defaults are supplied for everything the user
  // didn't explicitly set.
  builder.add(
    "/settings/graphics/resolved",
    loader.provide(genGraphicsSettingsResolved)
  );
  // Graphics settings after all category enums have been converted to their
  // numerical values (e.g. "low" draw distance becomes 96m).
  builder.add(
    "/settings/graphics/computed",
    loader.provide(genGraphicsSettingsComputed)
  );
  // The final concrete current graphics settings, after dynamic runtime
  // changes are applied (e.g. render scale adjustments that depend on frame
  // rate). These are the final computed graphics settings and what most
  // consumers of graphics settings should be looking at.
  builder.add(
    "/settings/graphics/dynamic",
    loader.provide(genGraphicsSettingsDynamic)
  );
  // Referred to by "/settings/graphics/dynamic", expected to be set externally.
  builder.addGlobal("/settings/graphics/dynamic_render_scale", {
    value: undefined,
  });
  builder.addGlobal("/settings/graphics/dynamic_draw_distance", {
    value: undefined,
  });
}
