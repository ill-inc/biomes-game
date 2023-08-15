import {
  UNKNOWN_DEVICE_ID,
  getDeviceIdCookie,
  setDeviceIdCookie,
} from "@/server/shared/auth/cookies";
import { HostPort, listenWithDevFallback } from "@/server/shared/ports";
import type { WebServerRequest } from "@/server/web/context";
import {
  isApiError,
  type ServerResponseMaybeBiomesError,
} from "@/server/web/errors";
import { log, withLogContext } from "@/shared/logging";
import finalhandler from "finalhandler";
import type {
  Server as HTTPServer,
  IncomingMessage,
  ServerResponse,
} from "http";
import { createServer } from "http";
import type { NextApiRequest } from "next";
import next from "next";
import type { NextServer } from "next/dist/server/next";
import { resolve } from "path";
import { list } from "recursive-readdir-async";
import responseTime from "response-time";
import { parse } from "url";

async function findStaticPaths() {
  const staticSet = new Set<string>("/");
  const absoluteBase = resolve("./public");
  await list(
    absoluteBase,
    {},
    (obj: {
      name: string;
      path: string;
      fullname: string;
      isDirectory: boolean;
    }) => {
      if (!obj.isDirectory) {
        staticSet.add(obj.fullname.slice(absoluteBase.length));
      }
    }
  );
  return staticSet;
}

export type NextApiRequestWithContext<C> = NextApiRequest & { context: C };

const GCP_USER_AGENT_PREFIXES = ["GoogleHC", "GoogleStackDriverMonitoring"].map(
  (a) => a.toLowerCase()
);

function addOriginTrialHeaders(req: IncomingMessage, res: ServerResponse) {
  // TODO: these headers allow SharedArrayBuffer without an origin trial, but
  //       they break the signin link flows.
  //       Chrome is expecting to change these requirements in the future.
  //       If change doesn't progress here we could change the
  //       signin/login/link flows to be a separate page without these headers
  //       and allow our main game page to use them.
  //context.res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  //context.res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  //context.res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  if (req.headers.host === "localhost:3000") {
    res.setHeader(
      "Origin-Trial",
      "AuKHz2ifylDpZfg7iawfCDGtilbLT+tg9CCbVG4PNSxRA1v2NtYGRKAKctmE4Us42+t1lZ3IkPO9s5/VlHy/rwIAAABgeyJvcmlnaW4iOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJmZWF0dXJlIjoiVW5yZXN0cmljdGVkU2hhcmVkQXJyYXlCdWZmZXIiLCJleHBpcnkiOjE2NTg4Nzk5OTl9"
    );
  } else {
    res.setHeader(
      "Origin-Trial",
      "AtC5hLqG56A2sDremQjS1ner5bn4eeziP0B1uCzLAJk/bj2gduVbLDOsAScnri+ezDb19qNUq7QRK3/7pw35OQEAAABzeyJvcmlnaW4iOiJodHRwczovL2Jpb21lcy5nZzo0NDMiLCJmZWF0dXJlIjoiVW5yZXN0cmljdGVkU2hhcmVkQXJyYXlCdWZmZXIiLCJleHBpcnkiOjE2NjYxMzc1OTksImlzU3ViZG9tYWluIjp0cnVlfQ=="
    );
  }
}

function determineLogUrl(raw?: string) {
  raw ??= "[unknown]";
  const url = parse(raw, false);
  if (
    url.pathname?.startsWith("/api/auth") ||
    url.pathname?.startsWith("/auth")
  ) {
    return `${url.pathname}?[redacted]`;
  }
  return raw;
}

export interface RequestLogInfo {
  url: string | undefined;
  method: string | undefined;
  headers: Record<string, string | string[]>;
  bdid: string | undefined;
  remoteAddress: string | undefined;
}

export function captureRequest(req: IncomingMessage): RequestLogInfo {
  return {
    url: determineLogUrl(req.url),
    method: req.method,
    headers: req.headers as Record<string, string | string[]>,
    bdid: getDeviceIdCookie(req),
    remoteAddress: req.socket.remoteAddress,
  };
}

export function httpRequestContext(req: RequestLogInfo) {
  return {
    BDID: req.bdid,
    httpRequest: {
      requestMethod: req.method,
      requestUrl: req.url,
      requestSize: req.headers["content-length"],
      status: 200,
      userAgent: req.headers["user-agent"],
      remoteIp: req.headers["x-forwarded-for"] || req.remoteAddress,
      serverIp: req.headers["host"],
      referer: req.headers["referer"],
    } as {
      [key: string]: any;
    },
  };
}

export function logHttpRequest(
  req: RequestLogInfo,
  statusCodeOrError: number | any,
  additional?: {
    latency?: string;
    responseSize?: string;
    [key: string]: any;
  }
) {
  let statusCode = 200;
  let error: any;
  if (typeof statusCodeOrError === "number") {
    statusCode = statusCodeOrError;
  } else if (isApiError(statusCodeOrError)) {
    statusCode = statusCodeOrError.status();
    error = statusCodeOrError;
  } else {
    statusCode = 500;
    error = statusCodeOrError;
  }

  const context = {
    ...httpRequestContext(req),
    ...additional,
  };
  context.httpRequest.status = statusCode;
  if (additional?.latency) {
    context.httpRequest.latency = additional.latency;
    delete additional.latency;
  }
  if (additional?.responseSize) {
    context.httpRequest.responseSize = additional.responseSize;
    delete additional.responseSize;
  }
  if (error) {
    if (statusCode >= 500) {
      log.error(`${statusCode} ${req.url}`, {
        ...context,
        error,
      });
    } else {
      log.info(`${statusCode} ${req.url}`, {
        ...context,
        error,
      });
    }
  } else {
    if (statusCode >= 500) {
      log.error(
        `${statusCode} ${req.url}: Internal error "${statusCode}", actual callstack can likely be found in the previous log.`,
        context
      );
    } else {
      log.info(`${statusCode} ${req.url}`, context);
    }
  }
}

const ACCEPTABLE_STATIC_FILES = new Set(["/sw.js"]);

function maybeReportStatic(path: string) {
  if (
    process.env.NODE_ENV === "production" &&
    !ACCEPTABLE_STATIC_FILES.has(path)
  ) {
    log.warn(`Web server serving static: ${path}`);
  }
}

export class ApiApp {
  public readonly http: HTTPServer;
  private context?: any;

  constructor(app: NextServer, private staticSet: Set<string>) {
    const middlewareResponseTime = responseTime((req, res, time) => {
      const userAgent = (req.headers["user-agent"] || "").toLowerCase();
      if (
        GCP_USER_AGENT_PREFIXES.some((prefix) => userAgent.startsWith(prefix))
      ) {
        // Ignore health check requests for logging purposes.
        return;
      }
      const errorOrStatusCode =
        (res as ServerResponseMaybeBiomesError).maybeBiomesError ??
        res.statusCode;
      logHttpRequest(captureRequest(req), errorOrStatusCode, {
        responseSize: String(res.getHeader("content-length")),
        latency: `${(time / 1000).toFixed(3)}s`,
      });
      res.setHeader("Server-Timing", `app;dur=${time.toFixed(0)}`);
    });

    this.http = createServer((req, res) => {
      if (this.context !== undefined) {
        (req as WebServerRequest).context = this.context;
      }
      if (getDeviceIdCookie(req) === UNKNOWN_DEVICE_ID) {
        req.headers["x-bdid"] = setDeviceIdCookie(res);
      }
      const url = parse(req.url!, true);
      withLogContext(
        {
          path: url.pathname ?? "[unknown]",
        },
        () => {
          const done = finalhandler(req, res);
          middlewareResponseTime(req, res, (err) => {
            if (err) return done(err);
            if (url.pathname) {
              if (url.pathname?.startsWith("/_next/static")) {
                res.setHeader(
                  "Cache-Control",
                  "public, max-age=31536000, immutable"
                );
                maybeReportStatic(url.pathname);
              } else if (this.staticSet.has(url.pathname)) {
                res.setHeader("Cache-Control", "public, max-age=3600");
                maybeReportStatic(url.pathname);
              }
            }

            addOriginTrialHeaders(req, res);
            void app
              .getRequestHandler()(req, res, url)
              .then(() => {
                if (res.statusCode === 413) {
                  // This particular error code is tricky to catch because it's
                  // interpreted as an API error (and thus usually not flagged as
                  // a network error), but is generated by next.js, not Biomes.
                  // Flag it here as an error explicitly to improve observability.
                  // See GI-1082 for more info on what prompted this.
                  log.error(
                    `Error 413 (${res.statusMessage}) produced (probably within NextJS) on request to "${url.pathname}". Check client and/or server logs for more details.`
                  );
                }
              });
          });
        }
      );
    });
  }

  public async start(context: any) {
    this.context = context;
    const port = HostPort.forWeb().port;
    listenWithDevFallback("Web", this.http, port);
  }

  public async stop() {
    this.http.close();
  }
}

export async function registerApp() {
  // Parse out enviornment variables.
  const dev = process.env.NODE_ENV !== "production";

  log.info(`Server is running in ${dev ? "development" : "production"} mode`);

  // Initialize next.js HTTP server.
  const app = next({ dev, quiet: false });
  await app.prepare();
  return new ApiApp(app, await findStaticPaths());
}
