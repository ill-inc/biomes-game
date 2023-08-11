import type {
  Counter,
  CounterConfig,
  Gauge,
  GaugeConfig,
  Histogram,
  HistogramConfig,
  LabelValues,
  Metrics,
  Summary,
  SummaryConfig,
} from "@/shared/metrics/metrics";
import { assertNever } from "@/shared/util/type_helpers";

function isLabels<T extends string>(
  labels?: LabelValues<T> | number | undefined
): labels is LabelValues<T> {
  return !(labels === undefined || typeof labels === "number");
}

export class DeferredCounter<T extends string = string> implements Counter<T> {
  private readonly values = new Map<string, number>();
  private sink?: Counter<T>;

  constructor(public readonly config: CounterConfig<T>) {}

  setSink(sink: Counter<T>) {
    for (const [pk, value] of this.values) {
      if (pk) {
        sink.inc(JSON.parse(pk), value);
      } else {
        sink.inc(value);
      }
    }
    this.sink = sink;
  }

  inc(labels: LabelValues<T>, value?: number | undefined): void;
  inc(value?: number | undefined): void;
  inc(labels?: LabelValues<T> | number | undefined, value?: number): void {
    if (this.sink !== undefined) {
      (this.sink.inc as any)(labels, value);
      return;
    }
    if (isLabels(labels)) {
      const pk = JSON.stringify(labels);
      this.values.set(pk, (this.values.get(pk) ?? 0) + (value ?? 1));
    } else {
      this.values.set("", (this.values.get("") ?? 0) + (labels ?? 1));
    }
  }
}

class GaugeMap {
  private readonly values = new Map<string, number>();

  clear() {
    this.values.clear();
  }

  [Symbol.iterator]() {
    return this.values[Symbol.iterator]();
  }

  set(key: string, value?: number) {
    this.values.set(key, value ?? 0);
  }

  inc(key: string, amount?: number) {
    this.values.set(key, (this.values.get(key) ?? 0) + (amount ?? 1));
  }

  dec(key: string, amount?: number) {
    this.values.set(key, (this.values.get(key) ?? 0) - (amount ?? 1));
  }
}

export class DeferredGauge<T extends string = string> implements Gauge<T> {
  private readonly cache = new GaugeMap();
  private sink?: Gauge<T>;

  constructor(public readonly config: GaugeConfig<T>) {}

  setSink(sink: Gauge<T>) {
    for (const [pk, value] of this.cache) {
      if (pk) {
        sink.set(JSON.parse(pk), value);
      } else {
        sink.set(value);
      }
    }
    this.cache.clear();
    this.sink = sink;
  }

  set(labels: LabelValues<T>, value: number): void;
  set(value: number): void;
  set(labels: LabelValues<T> | number, value?: number): void {
    if (this.sink !== undefined) {
      (this.sink.set as any)(labels, value);
      return;
    }
    if (isLabels(labels)) {
      this.cache.set(JSON.stringify(labels), value);
    } else {
      this.cache.set("", labels);
    }
  }

  inc(labels: LabelValues<T>, value?: number): void;
  inc(value?: number): void;
  inc(labels?: LabelValues<T> | number, value?: number): void {
    if (this.sink !== undefined) {
      (this.sink.inc as any)(labels, value);
      return;
    }
    if (isLabels(labels)) {
      this.cache.inc(JSON.stringify(labels), value);
    } else {
      this.cache.inc("", labels);
    }
  }

  dec(labels: LabelValues<T>, value?: number): void;
  dec(value?: number): void;
  dec(labels?: LabelValues<T> | number, value?: number): void {
    if (this.sink !== undefined) {
      (this.sink.dec as any)(labels, value);
      return;
    }
    if (isLabels(labels)) {
      this.cache.dec(JSON.stringify(labels), value);
    } else {
      this.cache.dec("", labels);
    }
  }
}

const MAX_DEFERRED_LOG_SIZE = 1000;

export class DeferredHistogram<T extends string = string>
  implements Histogram<T>
{
  private readonly log: [string, number][] = [];
  private sink?: Histogram<T>;

  constructor(public readonly config: HistogramConfig<T>) {}

  setSink(sink: Histogram<T>) {
    for (const [pk, value] of this.log) {
      if (pk) {
        sink.observe(JSON.parse(pk), value);
      } else {
        sink.observe(value);
      }
    }
    this.sink = sink;
  }

  observe(labels: LabelValues<T>, value: number): void;
  observe(value: number): void;
  observe(labels: LabelValues<T> | number, value?: number): void {
    if (this.sink !== undefined) {
      (this.sink.observe as any)(labels, value);
      return;
    }
    if (isLabels(labels)) {
      this.log.push([JSON.stringify(labels), value!]);
    } else {
      this.log.push(["", labels]);
    }
    if (this.log.length > MAX_DEFERRED_LOG_SIZE) {
      this.log.splice(0, 1);
    }
  }
}

export class DeferredSummary<T extends string = string> implements Summary<T> {
  private readonly log: [string, number][] = [];
  private sink?: Summary<T>;

  constructor(public readonly config: SummaryConfig<T>) {}

  setSink(sink: Summary<T>) {
    for (const [pk, value] of this.log) {
      if (pk) {
        sink.observe(JSON.parse(pk), value);
      } else {
        sink.observe(value);
      }
    }
    this.sink = sink;
  }

  observe(labels: LabelValues<T>, value: number): void;
  observe(value: number): void;
  observe(labels: LabelValues<T> | number, value?: number): void {
    if (this.sink !== undefined) {
      (this.sink.observe as any)(labels, value);
      return;
    }
    if (isLabels(labels)) {
      this.log.push([JSON.stringify(labels), value!]);
    } else {
      this.log.push(["", labels]);
    }
    if (this.log.length > MAX_DEFERRED_LOG_SIZE) {
      this.log.splice(0, 1);
    }
  }
}

export class DeferredMetrics implements Metrics {
  private readonly metrics = new Map<
    string,
    DeferredCounter | DeferredGauge | DeferredHistogram | DeferredSummary
  >();
  private sink?: Metrics;

  setSink(sink: Metrics) {
    this.sink = sink;
    for (const metric of this.metrics.values()) {
      if (metric instanceof DeferredCounter) {
        metric.setSink(sink.createCounter(metric.config));
      } else if (metric instanceof DeferredGauge) {
        metric.setSink(sink.createGauge(metric.config));
      } else if (metric instanceof DeferredHistogram) {
        metric.setSink(sink.createHistogram(metric.config));
      } else if (metric instanceof DeferredSummary) {
        metric.setSink(sink.createSummary(metric.config));
      } else {
        assertNever(metric);
      }
    }
  }

  createCounter<T extends string = string>(config: CounterConfig<T>) {
    const counter = new DeferredCounter(config);
    this.metrics.set(counter.config.name, counter);
    if (this.sink) {
      counter.setSink(this.sink.createCounter(config));
    }
    return counter;
  }

  createGauge<T extends string = string>(config: GaugeConfig<T>) {
    const gauge = new DeferredGauge(config);
    this.metrics.set(gauge.config.name, gauge);
    if (this.sink) {
      gauge.setSink(this.sink.createGauge(config));
    }
    return gauge;
  }

  createHistogram<T extends string = string>(config: HistogramConfig<T>) {
    const histogram = new DeferredHistogram(config);
    this.metrics.set(histogram.config.name, histogram);
    if (this.sink) {
      histogram.setSink(this.sink.createHistogram(config));
    }
    return histogram;
  }

  createSummary<T extends string = string>(config: SummaryConfig<T>) {
    const summary = new DeferredSummary(config);
    this.metrics.set(summary.config.name, summary);
    if (this.sink) {
      summary.setSink(this.sink.createSummary(config));
    }
    return summary;
  }
}
