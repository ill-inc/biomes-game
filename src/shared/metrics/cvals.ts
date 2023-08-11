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
import { TimeseriesWithRate } from "@/shared/util/counters";
import type { CvalDatabase } from "@/shared/util/cvals";
import { makeCvalHook } from "@/shared/util/cvals";
import type { JSONable } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { cloneDeep, isNumber } from "lodash";

abstract class CvalLabelledMetric<T extends string, U> {
  private readonly basePath: readonly string[];
  private readonly metrics = new Map<string, U>();

  constructor(name: string, private readonly labelNames?: readonly string[]) {
    this.basePath = ["metrics", ...name.split(":")];
  }

  protected pathForLabels(labels?: LabelValues<T>): readonly string[] {
    if (labels === undefined || this.labelNames === undefined) {
      return this.basePath;
    }
    const path = [...this.basePath];
    for (const label of this.labelNames ?? []) {
      if (labels && labels[label as T]) {
        path.push(String(labels[label as T]));
      } else {
        path.push("_");
      }
    }
    return path;
  }

  protected getOrCreateMetric(labels?: LabelValues<T>): U {
    const path = this.pathForLabels(labels);
    const key = path.join(":");
    const existing = this.metrics.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const newMetric = this.createMetric(path);
    this.metrics.set(key, newMetric);
    return newMetric;
  }

  protected abstract createMetric(path: readonly string[]): U;
}

class CvalBackedCounter<T extends string = string>
  extends CvalLabelledMetric<T, { value: number }>
  implements Counter<T>
{
  constructor(
    name: string,
    private readonly help: string,
    labelNames?: readonly string[],
    private readonly cvalDatabase?: CvalDatabase
  ) {
    super(name, labelNames);
    if (labelNames === undefined) {
      this.getOrCreateMetric();
    }
  }

  protected createMetric(path: readonly string[]) {
    const counter = { value: 0 };
    makeCvalHook<number, { count: number; rate: number }>({
      path,
      help: this.help,
      cvalDatabase: this.cvalDatabase,
      collect: () => counter.value,
      toHumanReadable: ({ count, rate }) => ({
        count,
        rate: `${rate.toFixed(2)}/s`,
      }),
      // Counters are mostly used to produce rates, so attach a rate computing
      // accumulator to the Cval so that rate can also be visualized for counters.
      makeAccumulator: () => {
        // Hard-code the rate to have a 1 second resolution...  We might want
        // this to be adjustable, in which case we could add a switch for it.
        const timeseries = new TimeseriesWithRate(1);
        let prevValue = counter.value;
        return (x: number, timeInSeconds: number) => {
          timeseries.push(x, timeInSeconds);
          const result = {
            count: counter.value,
            rate: timeseries.getRate(),
            diff: counter.value - prevValue,
          };
          prevValue = counter.value;
          return result;
        };
      },
    });
    return counter;
  }

  inc(labelOrValue?: LabelValues<T> | number, value?: number): void {
    this.getOrCreateMetric(
      typeof labelOrValue === "number" ? undefined : labelOrValue
    ).value += value ?? (isNumber(labelOrValue) ? labelOrValue : 1);
  }
}

class CvalBackedGauge<T extends string = string>
  extends CvalLabelledMetric<T, { value: number }>
  implements Gauge<T>
{
  constructor(
    name: string,
    private readonly help: string,
    labelNames?: readonly string[],
    private readonly collect?: (gauge: Gauge<T>) => void,
    private readonly print?: (value: number) => string,
    private readonly cvalDatabase?: CvalDatabase
  ) {
    super(name, labelNames);
    if (labelNames === undefined) {
      this.getOrCreateMetric();
    }
  }

  protected createMetric(path: readonly string[]) {
    const gauge = { value: 0 };
    makeCvalHook<number, number>({
      path,
      help: this.help,
      cvalDatabase: this.cvalDatabase,
      collect: () => {
        if (this.collect) {
          this.collect(this);
        }
        return gauge.value;
      },
      toHumanReadable: this.print,
    });
    return gauge;
  }

  set(labelOrValue?: LabelValues<T> | number, value?: number): void {
    this.getOrCreateMetric(
      typeof labelOrValue === "number" ? undefined : labelOrValue
    ).value = value ?? (isNumber(labelOrValue) ? labelOrValue : 1);
  }

  inc(labelOrValue?: LabelValues<T> | number, value?: number): void {
    this.getOrCreateMetric(
      typeof labelOrValue === "number" ? undefined : labelOrValue
    ).value += value ?? (isNumber(labelOrValue) ? labelOrValue : 1);
  }

  dec(labelOrValue?: LabelValues<T> | number, value?: number): void {
    this.getOrCreateMetric(
      typeof labelOrValue === "number" ? undefined : labelOrValue
    ).value -= value ?? (isNumber(labelOrValue) ? labelOrValue : 1);
  }
}

type HistogramData = JSONable & {
  buckets: number[];
  values: number[];
  sum: number;
  count: number;
};

class CvalBackedHistogram<T extends string = string>
  extends CvalLabelledMetric<
    T,
    { values: number[]; sum: number; count: number }
  >
  implements Histogram<T>
{
  constructor(
    name: string,
    private readonly help: string,
    private readonly buckets: number[],
    labelNames?: readonly string[],
    private readonly cvalDatabase?: CvalDatabase
  ) {
    super(name, labelNames);
    ok(buckets.length > 0);
    if (labelNames === undefined) {
      this.getOrCreateMetric();
    }
  }

  protected createMetric(path: readonly string[]) {
    const histogram = {
      buckets: this.buckets,
      values: new Array(this.buckets.length + 1).fill(0),
      sum: 0,
      count: 0,
    };

    makeCvalHook<
      HistogramData,
      HistogramData & {
        diffValues: number[];
        diffSum: number;
        diffCount: number;
        // The average is redundant, given the sum and count, but in many cases
        // it is really helpful to have it be visible.
        diffAvg: number;
      }
    >({
      path,
      help: this.help,
      cvalDatabase: this.cvalDatabase,
      collect: () => histogram,
      toHumanReadable: ({ diffAvg }) => {
        // Just project the histogram into an average for human consumption.
        return diffAvg;
      },
      makeAccumulator: () => {
        // Accumulate histograms by keeping only the values added since the
        // previous accumulation.
        let prevHistogram = cloneDeep(histogram);
        return (x: HistogramData, _timeInSeconds: number) => {
          const diffValues = Array.from(
            Array(histogram.values.length).keys()
          ).map((i) => histogram.values[i] - prevHistogram.values[i]);
          const diffCount = histogram.count - prevHistogram.count;
          const diffSum = histogram.sum - prevHistogram.sum;
          const diffAvg = diffCount === 0 ? 0 : diffSum / diffCount;
          prevHistogram = cloneDeep(x);
          return {
            ...prevHistogram,
            diffValues,
            diffSum,
            diffCount,
            diffAvg,
          };
        };
      },
    });
    return histogram;
  }

  observe(labelOrValue?: LabelValues<T> | number, value?: number): void {
    const histogram = this.getOrCreateMetric(
      typeof labelOrValue === "number" ? undefined : labelOrValue
    );
    value ??= isNumber(labelOrValue) ? labelOrValue : 1;
    histogram.sum += value;
    histogram.count += 1;
    for (let i = 0; i < this.buckets.length; ++i) {
      if (value <= this.buckets[i]) {
        histogram.values[i] += 1;
      }
    }
    histogram.values[histogram.values.length - 1] += 1;
  }
}

class CvalBackedSummary<T extends string = string>
  extends CvalLabelledMetric<T, { sum: number; count: number }>
  implements Summary<T>
{
  constructor(
    name: string,
    private readonly help: string,
    labelNames?: readonly string[],
    private readonly cvalDatabase?: CvalDatabase
  ) {
    super(name, labelNames);
    if (labelNames === undefined) {
      this.getOrCreateMetric();
    }
  }

  protected createMetric(path: readonly string[]) {
    const summary = { sum: 0, count: 0 };
    makeCvalHook<typeof summary>({
      path,
      help: this.help,
      cvalDatabase: this.cvalDatabase,
      collect: () => summary,
      toHumanReadable: ({ sum, count }) =>
        count === 0 ? "unknown" : sum / count,
    });
    return summary;
  }

  observe(labelOrValue?: LabelValues<T> | number, value?: number): void {
    const summary = this.getOrCreateMetric(
      typeof labelOrValue === "number" ? undefined : labelOrValue
    );
    summary.count++;
    summary.sum += value ?? (isNumber(labelOrValue) ? labelOrValue : 1);
  }
}

export class MetricsCvals implements Metrics {
  createCounter<T extends string = string>({
    name,
    help,
    labelNames,
    cvalDatabase,
  }: CounterConfig<T> & { cvalDatabase?: CvalDatabase }): Counter<T> {
    return new CvalBackedCounter<T>(name, help, labelNames, cvalDatabase);
  }

  createGauge<T extends string = string>({
    name,
    help,
    labelNames,
    collect,
    print,
    cvalDatabase,
  }: GaugeConfig<T> & {
    cvalDatabase?: CvalDatabase;
    print?: (value: number) => string;
  }): Gauge<T> {
    return new CvalBackedGauge<T>(
      name,
      help,
      labelNames,
      collect,
      print,
      cvalDatabase
    );
  }

  createHistogram<T extends string = string>({
    name,
    help,
    labelNames,
    buckets,
    cvalDatabase,
  }: HistogramConfig<T> & {
    cvalDatabase?: CvalDatabase;
  }): Histogram {
    return new CvalBackedHistogram<T>(
      name,
      help,
      buckets,
      labelNames,
      cvalDatabase
    );
  }

  createSummary<T extends string = string>({
    name,
    help,
    labelNames,
    cvalDatabase,
  }: SummaryConfig<T> & {
    cvalDatabase?: CvalDatabase;
  }): Summary {
    return new CvalBackedSummary<T>(name, help, labelNames, cvalDatabase);
  }
}
