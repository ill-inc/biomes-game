import type { Histogram } from "@/shared/metrics/metrics";
import { createHistogram } from "@/shared/metrics/metrics";
import { performance } from "perf_hooks";

export class EventLoopUtilizationPoller {
  metric: Histogram;
  utilization: ReturnType<typeof performance.eventLoopUtilization> | undefined;
  private timeoutId: ReturnType<typeof setTimeout> | undefined;

  constructor(intervalMs: number) {
    this.metric = createHistogram({
      name: "event_loop_utilization",
      help: "Indicates the fraction of time that the event loop was not idle. Based on Node's perf_hooks eventLoopUtilization method.",
      buckets: Array.from(Array(10).keys(), (i) => (i + 1) / 10),
    });

    const onTimer = () => {
      this.timeoutId = setTimeout(() => {
        this.onSample();
        onTimer();
      }, intervalMs);
    };
    onTimer();
  }

  private onSample() {
    this.utilization = performance.eventLoopUtilization(this.utilization);

    this.metric.observe(this.utilization.utilization);
  }

  stop() {
    if (this.timeoutId !== undefined) {
      clearInterval(this.timeoutId);
    }
  }
}
