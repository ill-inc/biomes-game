import {
  createCounter,
  createGauge,
  createHistogram,
  linearBuckets,
} from "@/shared/metrics/metrics";

export const requestStat = createCounter({
  name: "zrpc_server_request",
  help: "Requests from zRPC server",
  labelNames: ["path"],
});

export const inflightRequestStat = createGauge({
  name: "zrpc_server_inflight_request",
  help: "Inflight requests from zRPC server",
  labelNames: ["path"],
});

export const errorStat = createCounter({
  name: "zrpc_server_error",
  help: "Errors from zRPC server",
  labelNames: ["path", "code"],
});

export const latencyStat = createHistogram({
  name: "zrpc_server_latency_ms",
  help: "Latency of zRPC client",
  labelNames: ["path"],
  buckets: linearBuckets(0, 25, 20),
});
