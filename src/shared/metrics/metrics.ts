import { MetricsCvals } from "@/shared/metrics/cvals";
import { DeferredMetrics } from "@/shared/metrics/deferred";
import { ok } from "assert";
interface MetricConfig<T extends string> {
  name: string;
  help: string;
  labelNames?: T[] | readonly T[];
}

export type LabelValues<T extends string> = Partial<Record<T, string | number>>;

export interface Counter<T extends string = string> {
  inc(labels: LabelValues<T>, value?: number): void;
  inc(value?: number): void;
}

export interface CounterConfig<T extends string> extends MetricConfig<T> {}

export interface Gauge<T extends string = string> {
  set(labels: LabelValues<T>, value: number): void;
  set(value: number): void;
  inc(labels: LabelValues<T>, value?: number): void;
  inc(value?: number): void;
  dec(labels: LabelValues<T>, value?: number): void;
  dec(value?: number): void;
}

export interface GaugeConfig<T extends string> extends MetricConfig<T> {
  collect?: (gauge: Gauge<T>) => void;
}

export interface Histogram<T extends string = string> {
  observe(labels: LabelValues<T>, value: number): void;
  observe(value: number): void;
}

export interface HistogramConfig<T extends string = string>
  extends MetricConfig<T> {
  buckets: number[];
}

export interface Summary<T extends string = string> {
  observe(labels: LabelValues<T>, value: number): void;
  observe(value: number): void;
}

export interface SummaryConfig<T extends string> extends MetricConfig<T> {}

type Metric<T extends string> =
  | Gauge<T>
  | Counter<T>
  | Histogram<T>
  | Summary<T>;

export interface Metrics {
  createCounter<T extends string = string>(
    config: CounterConfig<T>
  ): Counter<T>;
  createGauge<T extends string = string>(config: GaugeConfig<T>): Gauge<T>;
  createHistogram<T extends string = string>(
    config: HistogramConfig<T>
  ): Histogram<T>;
  createSummary<T extends string = string>(
    config: SummaryConfig<T>
  ): Summary<T>;
}

export class ReattachableMetrics implements Metrics {
  private readonly created = new Map<string, Metric<any>>();

  constructor(public readonly backing: Metrics) {}

  private createOrReattachMetric<
    Config extends MetricConfig<T>,
    O extends Metric<T>,
    T extends string = string
  >(config: Config, create: (c: Config) => O): O {
    const existing = this.created.get(config.name);
    if (existing) {
      return existing as O;
    } else {
      const metric = create(config);
      this.created.set(config.name, metric);
      return metric;
    }
  }

  createCounter<T extends string = string>(
    config: CounterConfig<T>
  ): Counter<T> {
    return this.createOrReattachMetric(config, (config) => {
      return this.backing.createCounter(config);
    });
  }

  createGauge<T extends string = string>(config: GaugeConfig<T>): Gauge<T> {
    return this.createOrReattachMetric(config, (config) => {
      return this.backing.createGauge(config);
    });
  }

  createHistogram<T extends string = string>(
    config: HistogramConfig<T>
  ): Histogram<T> {
    return this.createOrReattachMetric(config, (config) => {
      return this.backing.createHistogram(config);
    });
  }

  createSummary<T extends string = string>(
    config: SummaryConfig<T>
  ): Summary<T> {
    return this.createOrReattachMetric(config, (config) => {
      return this.backing.createSummary(config);
    });
  }
}

// In some cases (e.g. hot module reloading), we want to simply re-attach to
// a previously created metric. Any create${Metric} function can be wrapped
// in this one in order to indicate that we should just re-use an existing
// metric if it already exists in the registry.
// A specific use-case of this is NextJS' hot reloading, where the server-side
// re-compilation and re-evaluation can result in metric objects defined at
// the top-level scope all getting re-created.
declare global {
  var METRICS: Metrics; // eslint-disable-line no-var
}
if (!globalThis.METRICS) {
  if (process.env.IS_SERVER) {
    globalThis.METRICS = new ReattachableMetrics(new DeferredMetrics());
  } else {
    globalThis.METRICS = new ReattachableMetrics(new MetricsCvals());
  }
}

export function exponentialBuckets(
  start: number,
  factor: number,
  count: number
) {
  ok(start > 0);
  ok(count >= 1);
  ok(factor > 1);
  const buckets: number[] = [];
  for (let i = 0; i < count; i++) {
    buckets[i] = start;
    start *= factor;
  }
  return buckets;
}

export function linearBuckets(start: number, step: number, count: number) {
  ok(start >= 0);
  ok(count >= 1);
  ok(step > 0);
  const buckets: number[] = [];
  for (let i = 0; i < count; i++) {
    buckets[i] = start + i * step;
  }
  return buckets;
}

// Module-level shortcut functions to get to the metrics interface.
export function createCounter<T extends string = string>(
  config: CounterConfig<T>
): Counter<T> {
  return globalThis.METRICS.createCounter(config);
}

export function createGauge<T extends string = string>(
  config: GaugeConfig<T>
): Gauge<T> {
  return globalThis.METRICS.createGauge(config);
}

export function createHistogram<T extends string = string>(
  config: HistogramConfig<T>
): Histogram<T> {
  return globalThis.METRICS.createHistogram(config);
}

export function createSummary<T extends string = string>(
  config: SummaryConfig<T>
): Summary<T> {
  return globalThis.METRICS.createSummary(config);
}
