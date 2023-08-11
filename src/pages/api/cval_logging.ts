import type { BigQueryConnection } from "@/server/web/bigquery";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { Counter, LabelValues, Summary } from "@/shared/metrics/metrics";
import {
  createCounter,
  createHistogram,
  exponentialBuckets,
  linearBuckets,
} from "@/shared/metrics/metrics";
import type { JSONable } from "@/shared/util/type_helpers";
import {
  clientErrorStat,
  clientLatencyStat,
  clientRequestStat,
} from "@/shared/zrpc/client_stats";
import * as grpc from "@/shared/zrpc/grpc";
import { z } from "zod";

const zCvalsSource = z.enum([
  "periodic", // Periodically logged cvals.
  "startup", // Cvals logged on client startup.
  "report", // Cvals logged on a client-reported issue.
  "wakeUp", // Cvals logged when a user logs in for the first time.
]);

type CvalsSource = z.infer<typeof zCvalsSource>;

export const zLogCvalsRequest = z.object({
  // The reason why this cval log is being generated.
  source: zCvalsSource,
  cvals: z.record(z.any()),
});

export type LogCvalsRequest = z.infer<typeof zLogCvalsRequest>;

function getJsonPath(path: string[], json: JSONable): JSONable | undefined {
  let curJson = json;
  for (let i = 0; i < path.length; ++i) {
    const key = path[i];
    if (
      !curJson ||
      typeof curJson !== "object" ||
      Array.isArray(curJson) ||
      !(key in curJson)
    ) {
      return undefined;
    }
    curJson = curJson[key];
  }
  return curJson;
}

type LookupCvalOptions = { warnIfNotFound?: boolean };

function getNumberAtPath(
  path: string[],
  json: JSONable,
  options?: LookupCvalOptions
): number | undefined {
  const value = getJsonPath(path, json);
  if (value === undefined) {
    if (options?.warnIfNotFound ?? true) {
      log.warn(`Could not find cval path ${path.join(":")}`);
    }
    return;
  }
  if (typeof value !== "number") {
    log.error(
      `Unexpected type found in cval path ${path.join(
        ":"
      )}. Expected "number", found type "${typeof value} instead, with value: ${JSON.stringify(
        value
      )}."`
    );
    return;
  }
  return value;
}

function getAverageFromSummaryAtPath(
  path: string[],
  json: JSONable,
  options?: LookupCvalOptions
): number | undefined {
  const count = getNumberAtPath([...path, "count"], json, options);
  if (count === undefined) {
    return;
  }
  const sum = getNumberAtPath([...path, "sum"], json, options);
  if (sum === undefined) {
    return;
  }

  if (count > 0) {
    return sum / count;
  }
}

function cvalPathToName(path: string[]) {
  // Sanitize invalid prometheus metric name characters.
  return path.join(":").replaceAll(/[^a-zA-Z0-9:_]/g, "_");
}

function averageCval(path: string[]) {
  return (cvals: JSONable) => {
    const value = getNumberAtPath(path, cvals);
    if (!value) {
      return;
    }

    const pathString = cvalPathToName(path);
    const countMetric = createCounter({
      name: `cvals:${pathString}_count`,
      help: `Metric aggregated from client-reported cvals with path "${pathString}".`,
    });
    countMetric.inc(1);

    if (value >= 0) {
      const sumMetric = createCounter({
        name: `cvals:${pathString}_sum`,
        help: `Metric aggregated from client-reported cvals with path "${pathString}".`,
      });
      sumMetric.inc(value);
    } else {
      const sumMetric = createCounter({
        name: `cvals:${pathString}_sum`,
        help: `Metric aggregated from client-reported cvals with path "${pathString}".`,
      });
      sumMetric.inc(-value);
    }
  };
}

function histogramCval(path: string[], buckets: number[]) {
  return (cvals: JSONable) => {
    const value = getNumberAtPath(path, cvals);
    if (!value) {
      return;
    }

    const pathString = cvalPathToName(path);

    const histogramMetric = createHistogram({
      name: `cvals:${pathString}`,
      help: `Histogram of client-reported cvals with path "${pathString}".`,
      buckets,
    });

    histogramMetric.observe(value);
  };
}

function getHistogramAtPathOrLogError(path: string[], json: JSONable) {
  const histData = getJsonPath(path, json);
  if (!histData) {
    log.warn(`Could not find cval path ${path.join(":")}`);
    return;
  }

  // We're only interested in the diff* fields of the incoming histogram data,
  // since otherwise when the same client sends us histogram data multiple
  // times it would get accumulated twice, once on the client and once on the
  // server.
  if (
    typeof histData !== "object" ||
    !(
      "buckets" in histData &&
      "diffValues" in histData &&
      "diffSum" in histData &&
      "diffCount" in histData
    )
  ) {
    log.error(`Expected a histogram at path ${path.join(":")}`);
    return;
  }

  const diffSum = histData["diffSum"];
  const diffCount = histData["diffCount"];
  if (typeof diffSum !== "number" || typeof diffCount !== "number") {
    log.error(`Expected sum/count to be numbers at path ${path.join(":")}`);
    return;
  }

  const isNumberArray = (x: JSONable): x is number[] => {
    if (!Array.isArray(x)) {
      return false;
    }
    for (const i of x) {
      if (typeof i !== "number") {
        return false;
      }
    }
    return true;
  };
  const buckets = histData["buckets"];
  const diffValues = histData["diffValues"];
  if (
    !isNumberArray(buckets) ||
    !isNumberArray(diffValues) ||
    buckets.length != diffValues.length - 1
  ) {
    log.error(`Incorrect arrays size at path ${path.join(":")}`);
    return;
  }

  return { buckets, diffValues, diffSum, diffCount };
}

// Accumulates the data in a client histogram into the server's histogram,
// merging the buckets.
function accumulateHistogramCval(path: string[]) {
  return (cvals: JSONable) => {
    const histogram = getHistogramAtPathOrLogError(path, cvals);
    if (!histogram) {
      return;
    }

    const pathString = cvalPathToName(path);
    const baseOutputName = `cvals:${pathString}`;

    // Manually construct the components of a histogram with counters, since
    // promclient doesn't expose an efficient way of bulk merging data into a
    // histogram metric.
    const bucketMetrics = createCounter({
      name: `${baseOutputName}_bucket`,
      help: `Histogram buckets for histogram ${pathString}`,
      labelNames: ["le"],
    });
    const countMetric = createCounter({
      name: `${baseOutputName}_count`,
      help: `Count for histogram ${pathString}`,
    });
    const sumMetric = createCounter({
      name: `${baseOutputName}_sum`,
      help: `Sum for histogram ${pathString}`,
    });

    const values = histogram.diffValues;
    for (let i = 0; i < histogram.buckets.length; ++i) {
      bucketMetrics.inc({ le: histogram.buckets[i].toString() }, values[i]);
    }
    bucketMetrics.inc({ le: "+Inf" }, values[values.length - 1]);
    countMetric.inc(histogram.diffCount);
    sumMetric.inc(histogram.diffSum);
  };
}

// TODO(top): In order for these to look more similar and be more consistent
//            with accumulateHistogramCval() above, we would need to make
//            specifying the server-side `counter` optional, and if it is not
//            provided, construct one with a default path (e.g. "cvals:...").
function accumulateCounterCval<T extends string = string>(
  path: string[],
  counter: Counter<T>,
  labelValues?: LabelValues<T>,
  lookupCvalOptions?: LookupCvalOptions
) {
  return (cvals: JSONable) => {
    // We want to accumulate the diffs only, not the absolute client counts,
    // otherwise there will be much double counting.
    const counterDiff = getNumberAtPath(
      [...path, "diff"],
      cvals,
      lookupCvalOptions
    );
    if (counterDiff !== undefined) {
      counter.inc(labelValues ?? {}, counterDiff);
    }
  };
}

function accumulateSummaryCval<T extends string = string>(
  path: string[],
  summary: Summary<T>,
  labelValues?: LabelValues<T>,
  lookupCvalOptions?: LookupCvalOptions
) {
  return (cvals: JSONable) => {
    const summaryAverage = getAverageFromSummaryAtPath(
      path,
      cvals,
      lookupCvalOptions
    );
    if (summaryAverage !== undefined) {
      summary.observe(labelValues ?? {}, summaryAverage);
    }
  };
}

const CLIENT_ZRPC_PATHS = [
  "/sync/keepAlive",
  "/sync/publish",
  "/sync/subscribe",
];

function clientZrpcStats() {
  const accumulators: ((cvals: JSONable) => void)[] = [];
  for (const path of CLIENT_ZRPC_PATHS) {
    accumulators.push(
      accumulateCounterCval(
        ["metrics", "zrpc_client_request", path],
        clientRequestStat,
        {
          path,
        }
      )
    );
    for (const code in grpc.status) {
      accumulators.push(
        accumulateCounterCval(
          ["metrics", "zrpc_client_error", path, code],
          clientErrorStat,
          { path, code },
          {
            // This will only exist if the client saw errors.
            warnIfNotFound: false,
          }
        )
      );
    }
    accumulators.push(
      accumulateSummaryCval(
        ["metrics", "zrpc_client_ms", path],
        clientLatencyStat,
        {
          path,
        },
        {
          // Entries don't necessarily exist for all paths (e.g. subscriptions).
          warnIfNotFound: false,
        }
      )
    );
  }

  return (cvals: JSONable) => {
    accumulators.forEach((a) => a(cvals));
  };
}

// A CvalAggregator is a function that has access to all cvals and from them
// it may extract a value (or values) and send that value in to be consumed
// by a promclient metric.
type CvalAggregator = (cvals: JSONable) => void;
const cvalAggregators: CvalAggregator[] = [
  histogramCval(
    ["metrics", "performanceTiming", "scriptController"],
    exponentialBuckets(0.5, 2, 8)
  ),
  averageCval(["metrics", "performanceTiming", "render + postprocessing"]),
  averageCval(["renderer", "players", "numPlayers"]),
  averageCval(["renderer", "players", "numRenderedPlayers"]),
  averageCval(["renderer", "npcs", "numNpcs"]),
  averageCval(["renderer", "npcs", "numRenderedNpcs"]),
  averageCval(["game", "table"]),
  histogramCval(["game", "startupLoadSeconds"], exponentialBuckets(0.5, 2, 8)),
  histogramCval(
    ["metrics", "performanceTiming", "network", "rtt"],
    exponentialBuckets(10, 2, 8)
  ),
  histogramCval(["game", "clientLifetime"], exponentialBuckets(300, 2, 9)),
  histogramCval(
    ["memory", "usedJSHeapSize"],
    linearBuckets(512 * 1024 * 1024, 256 * 1024 * 1024, 12)
  ),
  accumulateHistogramCval([
    "metrics",
    "performanceTiming",
    "renderIntervalHist",
  ]),
  accumulateHistogramCval([
    "metrics",
    "performanceTiming",
    "cpuRenderTimeHist",
  ]),
  accumulateHistogramCval([
    "metrics",
    "performanceTiming",
    "gpuRenderTimeHist",
  ]),
  accumulateHistogramCval(["metrics", "game", "loop", "eventLoopLatencyMs"]),
  clientZrpcStats(),
];

export function writeCvalsToBigQuery(
  bigQuery: BigQueryConnection,
  userId: BiomesId | undefined,
  cvals: Record<string, any>,
  source: CvalsSource
) {
  if (process.env.NODE_ENV !== "production") {
    // Don't log local cvals to bigquery.
    log.info(`Logging cvals from source "${source}"`);
    return;
  }

  try {
    const table = bigQuery.getTable({
      datasetName: "prod",
      tableName: "cval",
    });
    if (table.pendingSize > CONFIG.bigQueryCvalMaxPendingRows) {
      // If we have too many rows pending, we don't want to add more.
      return;
    }
    // Send the cval data as a single row to bigquery so we can drill down
    // more on it if we want.
    table.insert({
      userId: userId,
      json: { ...cvals, source },
    });
  } catch (error) {
    log.error("Error uploading data to BigQuery", { error });
  }
}

export default biomesApiHandler(
  {
    auth: "optional",
    body: zLogCvalsRequest,
  },
  async ({ context: { bigQuery }, auth, body: { cvals, source } }) => {
    // Only aggregate stats from periodic cval updates, since those will have
    // the most stable performance numbers.
    if (source === "periodic") {
      cvalAggregators.forEach((f) => f(cvals));
    }

    writeCvalsToBigQuery(bigQuery, auth?.userId, cvals, source);
  }
);

// Set a limit on the body size since we expect this data to be regularly
// sent and don't want it to get too big.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "512kb",
    },
  },
};
