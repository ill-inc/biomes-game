import { HostPort, listenWithDevFallback } from "@/server/shared/ports";
import { DeferredMetrics } from "@/shared/metrics/deferred";
import { ReattachableMetrics } from "@/shared/metrics/metrics";
import { MetricsPromClient } from "@/shared/metrics/promclient";
import type { VoxelooModule } from "@/shared/wasm/types";
import { createServer } from "http";
import { isMainThread } from "node:worker_threads";
import { collectDefaultMetrics, register } from "prom-client";
import { parse } from "url";

function connectMetricsToPrometheus() {
  if (!isMainThread) {
    // Nothing to do.
    return;
  }
  let metrics = globalThis.METRICS;
  while (metrics instanceof ReattachableMetrics) {
    metrics = metrics.backing;
  }
  if (metrics instanceof DeferredMetrics) {
    metrics.setSink(new MetricsPromClient());
  }
}

export function exposeMetrics(
  voxeloo: () => VoxelooModule | undefined,
  alive: () => Promise<boolean>,
  ready: () => Promise<boolean>,
  dump: () => Promise<unknown>
) {
  connectMetricsToPrometheus();
  collectDefaultMetrics();

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const server = createServer(async (req, res) => {
    if (!req.url) {
      res.statusCode = 404;
      res.end("NOT FOUND\n");
      return;
    }
    const { pathname } = parse(req.url, true);

    if (pathname === "/dump") {
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.end(JSON.stringify(await dump()));
      return;
    }

    res.setHeader("Content-Type", "text/plain");
    if (pathname === "/alive") {
      const ok = await alive();
      res.statusCode = ok ? 200 : 503;
      res.end(ok ? "OK\n" : "NOT ALIVE\n");
    } else if (pathname === "/ready") {
      const ok = await ready();
      res.statusCode = ok ? 200 : 503;
      res.end(ok ? "OK\n" : "NOT READY\n");
    } else if (pathname === "/config") {
      res.statusCode = 200;
      res.end(CONFIG.md5);
    } else {
      res.statusCode = 200;
      res.end(
        `${await register.metrics()}\n${voxeloo()?.exportMetrics() ?? ""}`
      );
    }
  });

  const port = HostPort.forMetrics().port;
  listenWithDevFallback("Metrics", server, port);
}
