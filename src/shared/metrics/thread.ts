import type { Closable } from "@/shared/closable";
import { DeferredMetrics } from "@/shared/metrics/deferred";
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
import { ReattachableMetrics } from "@/shared/metrics/metrics";
import type { Remote } from "comlink";
import { expose, releaseProxy, wrap } from "comlink";
import nodeEndpoint from "comlink/dist/umd/node-adapter";
import type { MessagePort } from "node:worker_threads";
import { isMainThread } from "node:worker_threads";

interface CrossThreadMetrics {
  incCounter<T extends string>(
    config: CounterConfig<T>,
    labels?: LabelValues<T> | number | undefined,
    value?: number
  ): void;
  setGauge<T extends string>(
    usesCollect: boolean,
    config: GaugeConfig<T>,
    labels?: LabelValues<T> | number | undefined,
    value?: number
  ): void;
  incGauge<T extends string>(
    usesCollect: boolean,
    config: GaugeConfig<T>,
    labels?: LabelValues<T> | number | undefined,
    value?: number
  ): void;
  decGauge<T extends string>(
    usesCollect: boolean,
    config: GaugeConfig<T>,
    labels?: LabelValues<T> | number | undefined,
    value?: number
  ): void;
  observeHistogram<T extends string>(
    config: HistogramConfig<T>,
    labels?: LabelValues<T> | number | undefined,
    value?: number
  ): void;
  observeSummary<T extends string>(
    config: SummaryConfig<T>,
    labels?: LabelValues<T> | number | undefined,
    value?: number
  ): void;
}

class CrossThreadMetricsSink implements Metrics {
  private remote?: Remote<CrossThreadMetrics>;
  private readonly collects = new Map<string, () => void>();

  constructor(
    sinkPort: MessagePort,
    private readonly collectPort: MessagePort
  ) {
    this.remote = wrap<CrossThreadMetrics>(nodeEndpoint(sinkPort));
    collectPort.on("message", (name) => {
      if (name === "") {
        this.close();
      }
      this.collects.get(name)?.();
    });
  }

  close() {
    if (this.remote) {
      this.remote[releaseProxy]();
      this.remote = undefined;
    }
    this.collectPort.removeAllListeners();
  }

  createCounter<T extends string = string>(
    config: CounterConfig<T>
  ): Counter<T> {
    return {
      inc: (labels: LabelValues<T> | number | undefined, value?: number) => {
        if (this.remote) {
          void this.remote.incCounter(config, labels, value);
        }
      },
    };
  }

  createGauge<T extends string = string>(config: GaugeConfig<T>): Gauge<T> {
    const collect = config.collect;
    config.collect = undefined;
    const gauge = {
      set: (labels: LabelValues<T> | number | undefined, value?: number) => {
        if (this.remote) {
          void this.remote.setGauge(
            collect !== undefined,
            config,
            labels,
            value
          );
        }
      },
      inc: (labels: LabelValues<T> | number | undefined, value?: number) => {
        if (this.remote) {
          void this.remote.incGauge(
            collect !== undefined,
            config,
            labels,
            value
          );
        }
      },
      dec: (labels: LabelValues<T> | number | undefined, value?: number) => {
        if (this.remote) {
          void this.remote.decGauge(
            collect !== undefined,
            config,
            labels,
            value
          );
        }
      },
    };
    if (this.remote !== undefined && collect !== undefined) {
      this.collects.set(config.name, () => collect(gauge));
      // Force a no-op set call to create it on the remote eng.
      void this.remote.setGauge(collect !== undefined, config);
    }
    return gauge;
  }

  createHistogram<T extends string = string>(
    config: HistogramConfig<T>
  ): Histogram<T> {
    return {
      observe: (
        labels: LabelValues<T> | number | undefined,
        value?: number
      ) => {
        if (this.remote) {
          void this.remote.observeHistogram(config, labels, value);
        }
      },
    };
  }

  createSummary<T extends string = string>(
    config: SummaryConfig<T>
  ): Summary<T> {
    return {
      observe: (
        labels: LabelValues<T> | number | undefined,
        value?: number
      ) => {
        if (this.remote) {
          void this.remote.observeSummary(config, labels, value);
        }
      },
    };
  }
}

export function connectMetricsToParent(
  sinkPort: MessagePort,
  collectPort: MessagePort
): Closable {
  if (!isMainThread) {
    let metrics = globalThis.METRICS;
    while (metrics instanceof ReattachableMetrics) {
      metrics = metrics.backing;
    }
    if (metrics instanceof DeferredMetrics) {
      const sink = new CrossThreadMetricsSink(sinkPort, collectPort);
      metrics.setSink(sink);
      return sink;
    }
  }
  return { close: () => {} };
}

class CrossThreadMetricsExporter implements CrossThreadMetrics {
  constructor(
    private readonly backing: Metrics,
    private readonly collectPort: MessagePort
  ) {}

  close() {
    // Signal remote to close.
    this.collectPort.postMessage("");
  }

  incCounter<T extends string>(
    config: CounterConfig<T>,
    labels?: number | Partial<Record<T, string | number>> | undefined,
    value?: number | undefined
  ): void {
    (this.backing.createCounter(config).inc as any)(labels, value);
  }

  setGauge<T extends string>(
    usesCollect: boolean,
    config: GaugeConfig<T>,
    labels?: number | Partial<Record<T, string | number>> | undefined,
    value?: number | undefined
  ): void {
    if (usesCollect) {
      config.collect = () => this.collectPort.postMessage(config.name);
    }
    const gauge = this.backing.createGauge(config);
    if (labels || value) {
      (gauge.set as any)(labels, value);
    }
  }

  incGauge<T extends string>(
    usesCollect: boolean,
    config: GaugeConfig<T>,
    labels?: number | Partial<Record<T, string | number>> | undefined,
    value?: number | undefined
  ): void {
    if (usesCollect) {
      config.collect = () => this.collectPort.postMessage(config.name);
    }
    const gauge = this.backing.createGauge(config);
    if (labels || value) {
      (gauge.inc as any)(labels, value);
    }
  }

  decGauge<T extends string>(
    usesCollect: boolean,
    config: GaugeConfig<T>,
    labels?: number | Partial<Record<T, string | number>> | undefined,
    value?: number | undefined
  ): void {
    if (usesCollect) {
      config.collect = () => this.collectPort.postMessage(config.name);
    }
    const gauge = this.backing.createGauge(config);
    if (labels || value) {
      (gauge.dec as any)(labels, value);
    }
  }

  observeHistogram<T extends string>(
    config: HistogramConfig<T>,
    labels?: number | Partial<Record<T, string | number>> | undefined,
    value?: number | undefined
  ): void {
    (this.backing.createHistogram(config).observe as any)(labels, value);
  }

  observeSummary<T extends string>(
    config: SummaryConfig<T>,
    labels?: number | Partial<Record<T, string | number>> | undefined,
    value?: number | undefined
  ): void {
    (this.backing.createSummary(config).observe as any)(labels, value);
  }
}

export function exposeMetricsToChild(
  sinkPort: MessagePort,
  collectPort: MessagePort
): Closable {
  const exporter = new CrossThreadMetricsExporter(
    globalThis.METRICS,
    collectPort
  );
  expose(exporter, nodeEndpoint(sinkPort));
  return exporter;
}
