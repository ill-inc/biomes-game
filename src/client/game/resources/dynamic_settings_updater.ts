import type { ReadonlyPerformanceProfiler } from "@/client/game/renderers/performance_profiler";
import type { ComputedGraphicsSettings } from "@/client/game/resources/graphics_settings";
import type { ClientResources } from "@/client/game/resources/types";
import { createCounter } from "@/shared/metrics/metrics";
import { fail, ok } from "assert";
import { compact, isEqual, mapValues } from "lodash";

interface PerformanceTargets {
  cpuBudgetMs: number;
  gpuBudgetMs: number;
  renderScale: number;
  drawDistance: number;
}

// A set of properties that we'll aim towards if we're currently performing
// worse than the specified ceilingFps. We'll work towards these targets
// incrementally, and the increments will be prioritized. The ranges express
// wiggle room between when we're looking to reduce quality, or improve it.
const PERFORMANCE_TARGETS = [
  {
    ceilingFps: { reduce: 24, increase: 30 },

    cpuBudgetMs: { reduce: 24, increase: 20 },
    gpuBudgetMs: { reduce: 24, increase: 20 },
    renderScale: 0.3,
    drawDistance: 64,
  },
  {
    ceilingFps: { reduce: 54, increase: 58 },

    cpuBudgetMs: { reduce: 14, increase: 11 },
    gpuBudgetMs: { reduce: 14, increase: 11 },
    renderScale: 0.5,
    drawDistance: 96,
  },
  {
    ceilingFps: { reduce: Infinity, increase: Infinity },

    cpuBudgetMs: { reduce: 14, increase: 11 },
    gpuBudgetMs: { reduce: 14, increase: 11 },
    renderScale: 1.0,
    drawDistance: 256,
  },
];

const RENDER_SCALE_ADJUSTMENT_INCREMENT = 0.1;

// Dynamic draw distance parameters
const DRAW_DISTANCE_ADJUSTMENT_INCREMENT = 16;

// Minimum number of performance samples we need before we'll start making
// decisions. Reset after every performance tweak.
const MIN_STAT_SAMPLES_COUNT = 110;

// Based on our current framerate, find out what quality settings we'll aim
// towards via dynamic graphics settings updates. The reason the settings are
// different depending on our current FPS is so that we can express things
// like "if despite our best efforts we can't even make 30fps, then we would
// be willing to reduce quality more than if we're between 30 and 60 fps".
// The `direction` is specified so that we can add wiggle room to avoid
// flip-flopping around quality increases and decreases.
function getPerformanceTargets(
  direction: "increase" | "reduce",
  renderIntervalMs: number
): PerformanceTargets {
  const fps = 1000 / renderIntervalMs;
  for (const constraints of PERFORMANCE_TARGETS) {
    const biasedTargets = biasTargets(direction, constraints);
    if (fps < biasedTargets.ceilingFps) {
      return biasedTargets;
    }
  }
  fail("Should have an `Infinity` for one of the ceilingFps.");
}

// Adjust the constraints such that there's wiggle room between when we increase
// vs. when we reduce quality.
function biasTargets(
  direction: "increase" | "reduce",
  constraints: (typeof PERFORMANCE_TARGETS)[number]
) {
  return {
    ceilingFps: constraints.ceilingFps[direction],
    cpuBudgetMs: constraints.cpuBudgetMs[direction],
    gpuBudgetMs: constraints.gpuBudgetMs[direction],
    renderScale: constraints.renderScale,
    drawDistance: constraints.drawDistance,
  };
}

interface DynamicValueUpdate {
  // Tags whether this update improves or reduces the quality (and
  // so reduces or improves performance, respectively).
  name: string;
  qualityChange: "increase" | "reduce";
  applyUpdate: () => void;
  minChangeIntervalMs: number;
}

const performanceSettings = ["renderScale", "drawDistance"] as const;
type PerformanceSetting = (typeof performanceSettings)[number];

type DynamicValueUpdates = {
  [K in (typeof performanceSettings)[number]]: DynamicValueUpdate | undefined;
};

const increasesCounter = createCounter({
  name: "renderer:graphics:dynamic:qualityIncreases",
  help: "Number of times the graphics quality was dynamically improved.",
  labelNames: ["type"],
});
const reductionsCounter = createCounter({
  name: "renderer:graphics:dynamic:qualityReductions",
  help: "Number of times the graphics quality was dynamically reduced.",
  labelNames: ["type"],
});

interface PerformanceStats {
  renderIntervalMs: number;
  cpuTimeMs: number;
  gpuTimeMs: number | undefined;
}

function extractStats(
  direction: "increase" | "reduce",
  profiler: ReadonlyPerformanceProfiler
): PerformanceStats {
  ok(profiler.renderInterval().count() > 0);
  ok(profiler.cpuRenderTime().count() > 0);
  const gpuRenderTime = profiler.gpuRenderTime();
  ok(!gpuRenderTime || gpuRenderTime.count() > 0);

  // Frame interval has been found to vary quite a bit around 1/60hz when
  // capped at a 60hz vsync, so use the median for this.
  const renderIntervalMs = profiler.renderInterval().getPercentile(0.5);

  // To promote conservativeness when making quality adjustments,
  // if we're planning to increase the quality, consider our worst (largest).
  const cpuTimeMs = profiler
    .cpuRenderTime()
    .getPercentile(direction === "increase" ? 0.9 : 0.5);

  // GPU timings can be a bit less stable due to the timer itself, but lower
  // the actual GPU time will never be lower than a reported time, so prefer
  // lower percentiles for it.
  const gpuTimeMs = gpuRenderTime?.getPercentile(
    direction === "increase" ? 0.5 : 0.1
  );

  return { renderIntervalMs, cpuTimeMs, gpuTimeMs };
}
interface PerformanceCheck<T> {
  isDynamic: (computed: ComputedGraphicsSettings) => boolean;
  getValue: (resources: ClientResources) => T;
  updateValue: (resources: ClientResources, newValue: T) => void;
  // Don't make performance adjustmens more frequently than this.
  minChangeIntervalMs: number;
  tryReduceQuality: (
    stats: PerformanceStats,
    perfTargets: PerformanceTargets,
    current: T
  ) => T | undefined;
  tryIncreaseQuality: (
    stats: PerformanceStats,
    perfTargets: PerformanceTargets,
    current: T
  ) => T | undefined;
}

export class DynamicSettingsUpdater {
  private lastDynamicPerformanceUpdate: number = 0;

  constructor(private readonly profiler: ReadonlyPerformanceProfiler) {}

  updateDynamicSettings(
    resources: ClientResources,
    width: number,
    height: number
  ) {
    const computed = resources.get("/settings/graphics/computed");

    // Non-performance related dynamic render scale updates.
    this.updateRenderScaleNonPerformance(computed, resources, width, height);

    // Performance related dynamic updates.
    this.updatePerformanceSettings(computed, resources);
  }

  private updateRenderScaleNonPerformance(
    computed: ComputedGraphicsSettings,
    resources: ClientResources,
    width: number,
    height: number
  ) {
    if (computed.renderScale.kind === "dynamic") {
      // We deal with this case at a later stage.
      return;
    }

    const current = resources.get("/settings/graphics/dynamic").renderScale;

    const next = (() => {
      switch (computed.renderScale.kind) {
        case "resolution":
          return Math.min(
            Math.min(
              computed.renderScale.res[0] / width,
              computed.renderScale.res[1] / height
            ),
            1.0
          );
        case "scale":
          return computed.renderScale.scale;
      }
    })();

    if (current !== next) {
      resources.set("/settings/graphics/dynamic_render_scale", { value: next });
    }
  }

  private updatePerformanceSettings(
    computed: ComputedGraphicsSettings,
    resources: ClientResources
  ) {
    // Make sure we have gathered enough data before making performance decisions.
    const gpuRenderTime = this.profiler.gpuRenderTime();
    if (
      this.profiler.cpuRenderTime().count() < MIN_STAT_SAMPLES_COUNT ||
      (gpuRenderTime && gpuRenderTime.count() < MIN_STAT_SAMPLES_COUNT) ||
      this.profiler.renderInterval().count() < MIN_STAT_SAMPLES_COUNT
    ) {
      return;
    }

    const tweaks = resources.get("/tweaks");
    const updates = mapValues(dynamicPerformanceChecks, (check, name) => {
      if (tweaks.clientRendering.disabledDynamicPerformanceUpdates[name]) {
        return undefined;
      }
      return this.runPerformanceCheck(name, check, computed, resources);
    });

    // We'll only apply a single quality increase and a single quality reduction at a time.
    const qualityIncreases = this.chooseQualityIncrease(
      mapValues(updates, (v) =>
        v?.qualityChange === "increase" ? v : undefined
      )
    );
    if (qualityIncreases.length > 0) {
      this.applyChanges(qualityIncreases);
      // Don't continue with quality reductions if we've applied any quality
      // increases.
      return;
    }

    this.applyChanges(
      this.chooseQualityReduction(
        mapValues(updates, (v) =>
          v?.qualityChange === "reduce" ? v : undefined
        )
      )
    );
  }

  private applyChanges(updates: DynamicValueUpdate[]) {
    if (updates.length === 0) {
      return;
    }

    const maxMinChangeIntervalMs = updates.reduce(
      (a, x) => Math.max(x.minChangeIntervalMs, a),
      -Infinity
    );

    const now = performance.now();

    // Pace out performance adjustments.
    if (now - this.lastDynamicPerformanceUpdate < maxMinChangeIntervalMs) {
      return;
    }
    this.lastDynamicPerformanceUpdate = now;

    for (const update of updates) {
      update.applyUpdate();
    }
  }

  private runPerformanceCheck<T>(
    name: string,
    check: PerformanceCheck<T>,
    computed: ComputedGraphicsSettings,
    resources: ClientResources
  ): DynamicValueUpdate | undefined {
    if (!check.isDynamic(computed)) {
      return;
    }

    const current = check.getValue(resources);

    const change:
      | { newValue: T; qualityChange: DynamicValueUpdate["qualityChange"] }
      | undefined = (() => {
      const reduceStats = extractStats("reduce", this.profiler);
      const qualityReduction = check.tryReduceQuality(
        reduceStats,
        getPerformanceTargets("reduce", reduceStats.renderIntervalMs),
        current
      );
      if (qualityReduction !== undefined) {
        return {
          newValue: qualityReduction,
          qualityChange: "reduce",
        };
      }

      const increaseStats = extractStats("increase", this.profiler);
      const qualityIncrease = check.tryIncreaseQuality(
        increaseStats,
        getPerformanceTargets("increase", increaseStats.renderIntervalMs),
        current
      );
      if (qualityIncrease !== undefined) {
        return {
          newValue: qualityIncrease,
          qualityChange: "increase",
        };
      }

      return undefined;
    })();

    if (change !== undefined && !isEqual(current, change.newValue)) {
      return {
        name,
        qualityChange: change.qualityChange,
        applyUpdate: () => {
          (change.qualityChange === "increase"
            ? increasesCounter
            : reductionsCounter
          ).inc({
            type: name,
          });
          check.updateValue(resources, change.newValue);
        },
        minChangeIntervalMs: check.minChangeIntervalMs,
      };
    }
  }

  private chooseQualityIncrease(
    increases: DynamicValueUpdates
  ): DynamicValueUpdate[] {
    // Always apply all quality increases simultaneously, we'll leave the precision logic for quality reduction.
    return compact(Object.values(increases));
  }

  private chooseQualityReduction(
    reductions: DynamicValueUpdates
  ): DynamicValueUpdate[] {
    const stats = extractStats("reduce", this.profiler);
    const perfTargets = getPerformanceTargets("reduce", stats.renderIntervalMs);

    // If at least the CPU is having budget problems, always start by reducing draw distance.
    if (cpuBudgetPct(stats, perfTargets) >= 1 && reductions.drawDistance) {
      return [reductions.drawDistance];
    }

    // Otherwise, just apply quality reductions in a priority order.
    for (const k of [
      "renderScale",
      "drawDistance",
    ] satisfies (keyof typeof reductions)[]) {
      const update = reductions[k];
      if (update) {
        return [update];
      }
    }

    // In case the priority list above wasn't exhaustive, just run any reduceFns.
    for (const update of Object.values(reductions)) {
      if (update) {
        return [update];
      }
    }

    return [];
  }
}

function cpuBudgetPct(
  stats: PerformanceStats,
  perfTargets: PerformanceTargets
) {
  return stats.cpuTimeMs / perfTargets.cpuBudgetMs;
}

function gpuBudgetPct(
  stats: PerformanceStats,
  perfTargets: PerformanceTargets
) {
  return stats.gpuTimeMs
    ? stats.gpuTimeMs / perfTargets.gpuBudgetMs
    : undefined;
}

function bottleneck(stats: PerformanceStats, perfTargets: PerformanceTargets) {
  const gpuPct = gpuBudgetPct(stats, perfTargets);
  if (gpuPct === undefined) {
    return "cpu";
  }
  const cpuPct = cpuBudgetPct(stats, perfTargets);

  if (cpuPct > gpuPct) {
    return "cpu";
  } else {
    return "gpu";
  }
}

const dynamicPerformanceChecks = {
  renderScale: {
    isDynamic: (computed) => computed.renderScale.kind === "dynamic",
    getValue: (resources) =>
      resources.get("/settings/graphics/dynamic").renderScale,
    updateValue: (resources, newValue) =>
      resources.set("/settings/graphics/dynamic_render_scale", {
        value: Math.round(newValue * 1000.0) / 1000.0,
      }),
    minChangeIntervalMs: 2000,

    tryReduceQuality: (stats, perfTargets, current) => {
      if (
        current > perfTargets.renderScale &&
        bottleneck(stats, perfTargets) === "gpu"
      ) {
        return current - RENDER_SCALE_ADJUSTMENT_INCREMENT;
      }
    },
    tryIncreaseQuality: (stats, perfTargets, current) => {
      if (
        current < perfTargets.renderScale &&
        bottleneck(stats, perfTargets) !== "gpu"
      ) {
        return current + RENDER_SCALE_ADJUSTMENT_INCREMENT;
      }
    },
  } satisfies PerformanceCheck<number>,
  drawDistance: {
    isDynamic: (computed) => computed.drawDistance === "dynamic",
    getValue: (resources) =>
      resources.get("/settings/graphics/dynamic").drawDistance,
    updateValue: (resources, newValue) =>
      resources.set("/settings/graphics/dynamic_draw_distance", {
        value: newValue,
      }),
    minChangeIntervalMs: 3000,

    tryReduceQuality: (stats, perfTargets, current) => {
      if (
        current > perfTargets.drawDistance &&
        ((gpuBudgetPct(stats, perfTargets) ?? 1) > 1 ||
          cpuBudgetPct(stats, perfTargets) > 1)
      ) {
        return current - DRAW_DISTANCE_ADJUSTMENT_INCREMENT;
      }
    },
    tryIncreaseQuality: (stats, perfTargets, current) => {
      if (
        current < perfTargets.drawDistance &&
        (gpuBudgetPct(stats, perfTargets) ?? 1) < 1 &&
        cpuBudgetPct(stats, perfTargets) < 1
      ) {
        return current + DRAW_DISTANCE_ADJUSTMENT_INCREMENT;
      }
    },
  } satisfies PerformanceCheck<number>,
} as const satisfies Record<PerformanceSetting, PerformanceCheck<any>>;

export const dynamicPerformanceUpdateNames = Object.keys(
  dynamicPerformanceChecks
) as (keyof typeof dynamicPerformanceChecks)[];
