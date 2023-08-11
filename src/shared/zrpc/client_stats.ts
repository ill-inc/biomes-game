import {
  createCounter,
  createGauge,
  createHistogram,
  linearBuckets,
} from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import * as grpc from "@/shared/zrpc/grpc";

export const clientRequestStat = createCounter({
  name: "zrpc_client_request",
  help: "Requests from zRPC client",
  labelNames: ["path"],
});

export const clientResponseStat = createCounter({
  name: "zrpc_client_response",
  help: "Responses to zRPC client",
  labelNames: ["path"],
});

export const inflightClientRequestStat = createGauge({
  name: "zrpc_client_inflight_request",
  help: "Inflight requests from zRPC client",
  labelNames: ["path"],
});

export const clientErrorStat = createCounter({
  name: "zrpc_client_error",
  help: "Errors from zRPC client",
  labelNames: ["path", "code"],
});

export const clientLatencyStat = createHistogram({
  name: "zrpc_client_ms_histogram",
  help: "Latency of zRPC client as histogram",
  labelNames: ["path"],
  buckets: linearBuckets(0, 25, 20),
});

export class ClientRequestStatRecorder {
  private readonly timer = new Timer();

  constructor(private readonly path: string) {
    clientRequestStat.inc({ path });
    inflightClientRequestStat.inc({ path });
  }

  gotResponse() {
    clientResponseStat.inc({ path: this.path });
  }

  error(code: grpc.status) {
    clientErrorStat.inc({
      path: this.path,
      code: grpc.status[code],
    });
  }

  end() {
    inflightClientRequestStat.dec({ path: this.path });
    clientLatencyStat.observe({ path: this.path }, this.timer.elapsed);
  }
}
