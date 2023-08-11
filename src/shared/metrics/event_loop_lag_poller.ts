import type { Histogram } from "@/shared/metrics/metrics";
import { createHistogram, exponentialBuckets } from "@/shared/metrics/metrics";
import { getNowMs } from "@/shared/util/helpers";

// Generates metrics similar to prom-client's built-in
// nodejs_eventloop_lag_seconds. Instead of being based off of Node's
// monitorEventLoopDelay function
//  (e.g. https://github.com/siimon/prom-client/blob/0f444cd38e4c7074991270106c270f731bafddb8/lib/metrics/eventLoopLag.js#L47-L65),
// which has a problem with sampling bias (https://github.com/nodejs/node/issues/34661)
// we instead schedule probes far ahead in time to reduce the temporal locality
// between when the probe was scheduled and when it was executed.
export class EventLoopLagPoller {
  private timeoutId: ReturnType<typeof setTimeout> | undefined;
  private metric: Histogram;

  constructor(
    private readonly intervalMs: number,
    options?: { metricName?: string }
  ) {
    this.metric = createHistogram({
      name: options?.metricName ?? "event_loop_latency",
      help: "Time between when a setTimeout is scheduled and when it is executed.",
      buckets: exponentialBuckets(0.05, 2, 18),
    });

    let previousTime: number | undefined;

    const onTimer = () => {
      this.timeoutId = setTimeout(() => {
        const curTime = getNowMs();

        // Measure the latency between when this callback was scheduled to run
        // and when it actually was run.
        if (previousTime !== undefined) {
          const deltaMs = curTime - previousTime;

          this.onSample(deltaMs);
        }

        // Re-query the time in case the above sampling took a while.
        previousTime = getNowMs();
        onTimer();
      }, intervalMs);
    };
    onTimer();
  }

  private onSample(deltaMs: number) {
    this.metric.observe(deltaMs - this.intervalMs);
  }

  stop() {
    if (this.timeoutId !== undefined) {
      clearInterval(this.timeoutId);
    }
  }
}
