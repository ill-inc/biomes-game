import { log } from "@/shared/logging";
import { createGauge } from "@/shared/metrics/metrics";
import { Averager } from "@/shared/util/counters";
import { getNowMs, getPerformance } from "@/shared/util/helpers";

// We leave async timer results out of the Performance API measure calls
// because they add a lot of noise to the output (e.g. ~800 calls to
// queued background tasks that take ~1-5 seconds to complete). That said,
// it's a global variable so that it's easy to tweak from the dev console,
// so feel free to tweak this as needed.
declare global {
  var enablePerformanceApiMeasuresForAsyncFunctions: boolean; // eslint-disable-line no-var
  var enablePerformanceApi: boolean; // eslint-disable-line no-var
}
globalThis.enablePerformanceApiMeasuresForAsyncFunctions = false;
globalThis.enablePerformanceApi = false; // Enabling this will result in constant consumption of memory.

// If you hit a NotAPromise error here:
//   1. Probably you just want to call timeAsyncCode instead. It will
//      track until the resolution of the promise.
//   2. If you actually want to time the function that generates the
//      promise and not resolution of the promise, call timeSyncCode
//      explicitly instead.
type NotAPromise<T> = T extends PromiseLike<infer _U> ? never : T;
export function timeCode<T>(label: string, func: () => NotAPromise<T>): T {
  return timeSyncCode(label, func);
}

// This function prints the average timing to the console every time `samples`
// samples have been collected.
// We may not need this function anymore, now that there's multiple different
// outputs to view the timeSyncCode under, however for headless node.js
// instances it may still be useful to have the console.logs().
// Client code can always just use timeSyncCode() though, because you don't
// need the console log to get visibility into the timers, just open up the
// Cval corresponding to this timer, or use Chrome Dev Tools.
export function timeCodeSampled<T>(
  label: string,
  samples: number,
  func: () => NotAPromise<T>
): T {
  return timeSyncCodeSampled(label, samples, func);
}

export function timeSyncCode<T>(label: string, func: () => T): T {
  const timer = new PerformanceTimer(label);
  try {
    return func();
  } finally {
    timer.stop();
  }
}

export function timeSyncCodeSampled<T>(
  label: string,
  samples: number,
  func: () => T
): T {
  const timer = new PerformanceTimer(label);
  try {
    return func();
  } finally {
    timer.stop();

    const duration = timer.duration()!;
    let sampleRecord = sampledTimerMap.get(label);
    if (sampleRecord == undefined) {
      sampleRecord = { ticks: 1, sum: duration };
    } else {
      sampleRecord.ticks++;
      sampleRecord.sum += duration;
    }

    if (sampleRecord.ticks >= samples) {
      const avg = sampleRecord.sum / sampleRecord.ticks;
      log.debug(`${label} took ${avg}ms on average`);
      sampleRecord.ticks = 0;
      sampleRecord.sum = 0;
    }
    sampledTimerMap.set(label, sampleRecord);
  }
}
const sampledTimerMap = new Map<string, { ticks: number; sum: number }>();

export async function timeAsyncCode<T = any>(
  label: string,
  func: () => Promise<T>
): Promise<T> {
  const timer = new PerformanceTimer(label);
  try {
    const ret = await func();
    return ret;
  } finally {
    timer.stop({
      createPerformanceApiMeasure:
        globalThis.enablePerformanceApiMeasuresForAsyncFunctions,
    });
  }
}

// The clock starts as soon as this object is constructed.
interface PerformanceTimerStats {
  latest: number;
  smoothedAvg: Averager;
  push: (x: number) => void;
}
export class PerformanceTimer {
  startTime: number;
  stopTime?: number;
  labelBegin?: string;
  labelEnd?: string;

  constructor(
    public readonly label: string,
    private readonly labelFromRoot = false
  ) {
    if (globalThis.enablePerformanceApi) {
      this.labelBegin = `${label}-begin`;
      this.labelEnd = `${label}-end`;
      // We use the Performance API's mark/measure system because Chrome's
      // DevTools can visualize it in the "performance" tab.
      getPerformance().mark(this.labelBegin);
    }
    this.startTime = getNowMs();
  }

  get aggregateStats() {
    const aggregateStatsCval = globalTimerStatsCvalMap.get(this.label);
    if (aggregateStatsCval) {
      return aggregateStatsCval;
    }

    const stats = {
      gauge: createGauge({
        name: `performanceTiming:${this.label}`,
        help: `Performance timing stats (in ms) for code timing with label ${this.label}. Record these events through the Chrome DevTools "performance" tab to get more details.`,
      }),
      latest: 0,
      smoothedAvg: new Averager(0, 0.95),
      push: (x: number) => {
        stats.latest = x;
        stats.smoothedAvg.push(x);
        stats.gauge.set(stats.smoothedAvg.get());
      },
    };

    globalTimerStatsCvalMap.set(this.label, stats);
    return stats;
  }

  stop({ createPerformanceApiMeasure = true } = {}) {
    if (this.stopTime) {
      // Already stopped.
      return;
    }
    this.stopTime = getNowMs();
    if (this.labelEnd) {
      getPerformance().mark(this.labelEnd);
      // This is what puts the timing scopes into Chrome
      if (createPerformanceApiMeasure) {
        getPerformance().measure(this.label, this.labelBegin, this.labelEnd);
      }
    }

    // Update the Cval map with the resulting duration.
    const duration = this.duration()!;
    this.aggregateStats.push(duration);
  }

  duration() {
    if (!this.stopTime) {
      return undefined;
    }
    return this.stopTime - this.startTime;
  }
}

const globalTimerStatsCvalMap = new Map<string, PerformanceTimerStats>();
