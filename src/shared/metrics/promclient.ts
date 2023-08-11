import type {
  Counter,
  CounterConfig,
  Gauge,
  GaugeConfig,
  Histogram,
  HistogramConfig,
  Metrics,
  Summary,
  SummaryConfig,
} from "@/shared/metrics/metrics";

let promClient: any;
function getPromClient(): any {
  if (!promClient) {
    promClient = require("prom-client");
  }
  return promClient;
}

export class MetricsPromClient implements Metrics {
  createCounter<T extends string = string>({
    name,
    help,
    labelNames,
  }: CounterConfig<T>): Counter<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return new (getPromClient().Counter)({
      name,
      help,
      labelNames: labelNames || [],
    });
  }

  createGauge<T extends string = string>({
    name,
    help,
    labelNames,
    collect,
  }: GaugeConfig<T>): Gauge<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return new (getPromClient().Gauge)({
      name,
      help,
      labelNames: labelNames || [],
      collect:
        collect === undefined
          ? undefined
          : function (this: any) {
              // eslint-disable-next-line @typescript-eslint/no-this-alias
              const promGauge = this;
              collect({
                set: (labels, value) => {
                  promGauge.set(labels, value);
                },
              } as Gauge<T>);
            },
    });
  }

  createHistogram<T extends string = string>({
    name,
    help,
    labelNames,
    buckets,
  }: HistogramConfig<T>): Histogram {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return new (getPromClient().Histogram)({
      name,
      help,
      buckets,
      labelNames: labelNames || [],
    });
  }

  createSummary<T extends string = string>({
    name,
    help,
    labelNames,
  }: SummaryConfig<T>): Summary<T> {
    return new (getPromClient().Summary)({
      name,
      help,
      labelNames: labelNames || [],
    });
  }
}
