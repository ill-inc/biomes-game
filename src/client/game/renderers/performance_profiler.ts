import type { GpuTimer } from "@/client/game/renderers/gpu_timer";
import { makeGpuTimer } from "@/client/game/renderers/gpu_timer";
import { log } from "@/shared/logging";
import type { Histogram } from "@/shared/metrics/metrics";
import { createHistogram } from "@/shared/metrics/metrics";
import { PerformanceTimer } from "@/shared/metrics/performance_timing";
import { makeCvalHook } from "@/shared/util/cvals";

// Exponential moving average falloffs
const RENDER_INTERVAL_SAMPLE_WINDOW = 200;
const CPU_SAMPLE_WINDOW = 200;
const GPU_SAMPLE_WINDOW = 200;

// Exponential Moving Average, more or less according to
// https://www.investopedia.com/terms/e/ema.asp with "Smoothing" set to 1.
class SampleWindow {
  #count = 0;
  #last = 0;
  private windowSamples: number[];
  private nextSampleIndex = 0;

  private histogram: Histogram;

  private sortedSamples: number[] | undefined;

  constructor(name: string, private readonly windowSize: number) {
    this.histogram = createHistogram({
      name: `performanceTiming:${name}Hist`,
      help: `Histogram of observations for value ${name}.`,
      buckets: [1, 2, 4, 8, 12, 16, 24, 32, 64],
    });
    makeCvalHook({
      path: ["renderer", "profiling", `${name}Ema`, "median"],
      help: `Current value of the calculated EMA for ${name}`,
      collect: () => this.getPercentile(0.5),
    });
    this.windowSamples = Array.from({ length: windowSize });
  }

  push(value: number) {
    this.#last = value;
    this.histogram.observe(value);
    this.windowSamples[this.nextSampleIndex] = value;
    this.nextSampleIndex = (this.nextSampleIndex + 1) % this.windowSize;

    ++this.#count;
    this.sortedSamples = undefined;
  }

  windowFull(): boolean {
    return this.#count >= this.windowSize;
  }

  count() {
    return this.#count;
  }

  last() {
    return this.#last;
  }

  // Returns the low-water-mark in the window.
  min() {
    return Math.min(...this.windowSamples.slice(0, this.#count));
  }

  clear() {
    this.#count = 0;
    this.sortedSamples = undefined;
  }

  getPercentile(percentile: number) {
    this.ensureSorted();
    const index = Math.round((this.sortedSamples!.length - 1) * percentile);
    return this.sortedSamples![index];
  }

  asReadonly(): Omit<this, "push" | "clear"> {
    return this;
  }

  private ensureSorted() {
    if (this.sortedSamples) {
      return;
    }
    this.sortedSamples = this.windowSamples
      .slice(0, this.#count)
      .sort((a, b) => a - b);
  }
}

export class PerformanceProfiler {
  #cpuRenderTime = new SampleWindow("cpuRenderTime", CPU_SAMPLE_WINDOW);
  #gpuRenderTime = new SampleWindow("gpuRenderTime", GPU_SAMPLE_WINDOW);
  #renderInterval = new SampleWindow(
    "renderInterval",
    RENDER_INTERVAL_SAMPLE_WINDOW
  );
  private renderIntervalTimer: PerformanceTimer | undefined = undefined;
  private gpuTimer: GpuTimer | undefined;
  private options;

  constructor(
    context: WebGLRenderingContext | WebGL2RenderingContext,
    options?: { enableGpuTimer?: boolean }
  ) {
    this.options = { enableGpuTimer: true, ...options };
    if (this.options.enableGpuTimer) {
      this.gpuTimer = makeGpuTimer(context);
    }
  }

  supportsGpuTime() {
    return this.gpuTimer !== undefined;
  }

  measureCpu(render: () => void) {
    this.timeCpu(render);

    if (this.renderIntervalTimer) {
      this.renderIntervalTimer.stop();
      this.#renderInterval.push(this.renderIntervalTimer.duration() || 0);
    }
    this.renderIntervalTimer = new PerformanceTimer("renderInterval");
  }

  clear() {
    this.#renderInterval.clear();
    this.#cpuRenderTime.clear();
    this.#gpuRenderTime.clear();
  }

  cpuRenderTime() {
    return this.#cpuRenderTime.asReadonly();
  }

  gpuRenderTime() {
    return this.supportsGpuTime()
      ? this.#gpuRenderTime.asReadonly()
      : undefined;
  }

  renderInterval() {
    return this.#renderInterval.asReadonly();
  }

  asReadonly(): ReadonlyPerformanceProfiler {
    return this;
  }

  private timeCpu(render: () => void) {
    const loopTimer = new PerformanceTimer("cpuRenderTime");
    render();
    loopTimer.stop();
    this.#cpuRenderTime.push(loopTimer.duration() || 0);
  }

  measureGpu(render: () => void) {
    if (this.gpuTimer) {
      void this.gpuTimer
        .measure(render)
        .then((timeElapsedNs) => {
          this.#gpuRenderTime.push(timeElapsedNs / 1000000);
        })
        .catch((error) => {
          log.error(`Error while tracking GPU time, disabling GPU timing.`, {
            error,
          });
          this.gpuTimer = undefined;
        });
    } else {
      render();
    }
  }
}

export type ReadonlyPerformanceProfiler = Omit<
  PerformanceProfiler,
  "measure" | "clear"
>;
