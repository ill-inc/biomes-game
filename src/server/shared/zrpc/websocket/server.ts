import type { AuthenticationResult } from "@/server/shared/auth/cookies";
import { verifyCookies } from "@/server/shared/auth/cookies";
import type {
  WebSocketAuthType,
  WebSocketRpcContext,
} from "@/server/shared/zrpc/server_types";
import { ActiveWebSocketClient } from "@/server/shared/zrpc/websocket/active_client";
import type { WebSocketZrpcServerLike } from "@/server/shared/zrpc/websocket/api";
import {
  createStreamingHandler,
  createUnaryHandler,
  type WebSocketServiceImplementation,
} from "@/server/shared/zrpc/websocket/call";
import type { WebSocketZrpcServer2Options } from "@/server/shared/zrpc/websocket/options";
import {
  ZRPC_MAX_BACKPRESSURE,
  ZRPC_MAX_SERVER_PAYLOAD,
} from "@/server/shared/zrpc/websocket/serde";
import type { RequestLogInfo } from "@/server/web/app";
import { logHttpRequest } from "@/server/web/app";
import type { SessionStore } from "@/server/web/db/sessions";
import { BackgroundTaskController } from "@/shared/abort";
import type { APIErrorCode } from "@/shared/api/errors";
import { APIError, errorCodeToStatus } from "@/shared/api/errors";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID, safeParseBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { createCounter, createGauge } from "@/shared/metrics/metrics";
import { ConditionVariable, sleep } from "@/shared/util/async";
import { autoId } from "@/shared/util/auto_id";
import { mapMap } from "@/shared/util/collections";
import {
  VALID_PATH,
  type ServiceDescription,
  type ServiceImplementation,
  type UntypedMethods,
  type UntypedStreamingMethods,
} from "@/shared/zrpc/core";
import {
  ZRPC_CLIENT_DESIRE_ANON_ARG,
  ZRPC_CLIENT_SESSION_ARG,
  ZRPC_CLIENT_USER_ARG,
  ZRPC_PROTOCOL_ARG,
  ZRPC_PROTOCOL_VERSION,
} from "@/shared/zrpc/websocket_client";
import { ok } from "assert";
import { parse as parseCookies } from "cookie";
import { STATUS_CODES as HTTP_STATUS_CODES } from "http";
import querystring from "node:querystring";
import type {
  HttpRequest,
  HttpResponse,
  TemplatedApp,
  WebSocket,
  WebSocketBehavior,
  us_listen_socket,
  us_socket_context_t,
} from "uWebSockets.js";
import {
  App,
  DEDICATED_COMPRESSOR_64KB,
  DISABLED,
  us_listen_socket_close,
  us_socket_local_port,
} from "uWebSockets.js";

interface ValidatedRequest {
  authType: WebSocketAuthType;
  protocol: string;
  clientSessionId: string;
  serverSessionId: string;
  checkUserId: BiomesId;
  cookies: Record<string, string>;
  desireAnonymous: boolean;
  // Log this HTTP request with a given status code.
  log: (statusCodeOrError: number | any) => void;
  // Close the givne response, and log appropriately to
  // suit the given error code.
  closeWithError: (res: HttpResponse, error: APIErrorCode) => void;
  wsHeaders: {
    secWebSocketKey: string;
    secWebSocketProtocol: string;
    secWebSocketExtensions: string;
  };
}

interface AuthenticatedRequest extends ValidatedRequest {
  userId: BiomesId;
}

const websocketEvents = createCounter({
  name: "wss_events",
  help: "Number of WebSocket server events",
  labelNames: ["kind"],
});

const websocketEventErrors = createCounter({
  name: "wss_event_errors",
  help: "Number of WebSocket server events",
  labelNames: ["kind"],
});

function safeParseTextMessage(message: ArrayBuffer) {
  if (!message.byteLength) {
    return "(none)";
  }
  try {
    return Buffer.from(message).toString("utf8");
  } catch (error) {
    log.warn("Failed to decode WebSocket close message", { error });
    return "(corrupt)";
  }
}

// Socket server to support a zRPC implementation run over a conventional
// websocket connection.
export class WebSocketZrpcServer implements WebSocketZrpcServerLike {
  private readonly controller = new BackgroundTaskController();
  private readonly app: TemplatedApp;
  private socket: us_listen_socket | undefined;
  private readonly clients = new Map<string, ActiveWebSocketClient>();
  private readonly noMoreClients = new ConditionVariable();
  private readonly implementation: WebSocketServiceImplementation = {};
  private state: "stopped" | "started" | "lameDuck" = "stopped";

  constructor(
    private readonly sessionStore: SessionStore,
    paths: string[],
    private readonly options: WebSocketZrpcServer2Options = {}
  ) {
    const behaviour: WebSocketBehavior<AuthenticatedRequest> = {
      maxPayloadLength: ZRPC_MAX_SERVER_PAYLOAD,
      closeOnBackpressureLimit: undefined,
      maxLifetime: 0,
      idleTimeout: Math.max(CONFIG.wsZrpcTtlMs / 1000, 10),
      compression: CONFIG.wsZrpcCompressionEnabled
        ? DEDICATED_COMPRESSOR_64KB
        : DISABLED,
      maxBackpressure: ZRPC_MAX_BACKPRESSURE,
      sendPingsAutomatically: true,
      upgrade: (res, req, context) => {
        websocketEvents.inc({ kind: "upgrade" });
        try {
          this.onUpgrade(res, req, context);
        } catch (error) {
          websocketEventErrors.inc({ kind: "upgrade" });
          log.throttledError(1000, "Error handling WS upgrade event", {
            error,
          });
        }
      },
      open: (ws) => {
        websocketEvents.inc({ kind: "open" });
        try {
          this.getOrCreateClient(ws).onOpen();
        } catch (error) {
          websocketEventErrors.inc({ kind: "open" });
          log.throttledError(1000, "Error handling WS open event", { error });
        }
      },
      message: (ws, message, isBinary) => {
        websocketEvents.inc({ kind: "message" });
        try {
          this.getClient(ws)?.onMessage(message, isBinary);
        } catch (error) {
          websocketEventErrors.inc({ kind: "message" });
          log.throttledError(1000, "Error handling WS message event", {
            error,
          });
        }
      },
      drain: (ws) => {
        websocketEvents.inc({ kind: "drain" });
        try {
          this.getClient(ws)?.onDrain();
        } catch (error) {
          websocketEventErrors.inc({ kind: "drain" });
          log.throttledError(1000, "Error handling WS message event", {
            error,
          });
        }
      },
      close: (ws, code, rawMessage) => {
        websocketEvents.inc({ kind: "close" });
        const message = safeParseTextMessage(rawMessage);
        try {
          const client = this.getClient(ws);
          if (client) {
            log.info("WebSocket client closed", {
              clientSesssionId: client.clientSessionId,
              serverSessionId: client.serverSessionId,
              code,
              wsMessage: message,
            });
            client.onClose(code, message);
          } else {
            log.info("Unassociated WebSocket closed", {
              code,
              wsMessage: message,
            });
          }
        } catch (error) {
          websocketEventErrors.inc({ kind: "close" });
          log.throttledError(1000, "Error handling WS close event", {
            error,
          });
        }
      },
    };
    this.app = App().get("/", (res) => res.send("OK"));
    for (const path of paths) {
      this.app.ws(path, behaviour);
    }
    this.controller.runInBackground("heartbeat", (signal) =>
      this.periodicallySendHeartbeat(signal)
    );
    createGauge({
      name: "wss_clients",
      help: "Number of active WebSocket clients",
      collect: (g) => g.set(this.clients.size),
    });
  }

  private getOrCreateClient(ws: WebSocket<AuthenticatedRequest>) {
    const authenticated = ws.getUserData();
    const existing = this.clients.get(authenticated.serverSessionId);
    if (existing) {
      return existing;
    }
    const client = new ActiveWebSocketClient(
      this.controller.signal,
      this.implementation,
      ws,
      authenticated.authType,
      authenticated.clientSessionId,
      authenticated.serverSessionId,
      authenticated.userId,
      this.options
    );
    this.clients.set(authenticated.serverSessionId, client);
    client.on("closed", () => {
      this.clients.delete(client.serverSessionId);
      if (this.clients.size === 0) {
        this.noMoreClients.signal();
      }
    });
    this.controller.runInBackground(`${client.id}:initialHeartbeat`, () =>
      client.heartbeat()
    );
    return client;
  }

  private getClient(ws: WebSocket<AuthenticatedRequest>) {
    return this.clients.get(ws.getUserData().serverSessionId);
  }

  get ready() {
    return this.state === "started";
  }

  async start(port: number) {
    ok(this.state === "stopped");
    return new Promise<void>((resolve, reject) => {
      this.app.listen(port, (listenSocket) => {
        if (listenSocket) {
          this.socket = listenSocket;
          log.info(`WebSocket listening on port ${this.port}`);
          this.state = "started";
          resolve();
        } else {
          reject();
        }
      });
    });
  }

  get port() {
    ok(this.socket);
    return us_socket_local_port(this.socket);
  }

  async stop() {
    if (this.state === "stopped") {
      return;
    }
    log.warn("WebSocketServer stopping, terminating all connections");
    this.state = "stopped";
    await this.controller.abortAndWait();
    await this.sleepUntilNoMoreClients(CONFIG.wsZrpcCloseMs);
    if (this.socket) {
      us_listen_socket_close(this.socket);
      this.socket = undefined;
    }
  }

  private async sleepUntilNoMoreClients(timeMs: number) {
    if (this.clients.size === 0) {
      return;
    }
    const controller = new AbortController();
    void (async () => {
      await this.noMoreClients.wait();
      if (this.clients.size === 0) {
        controller.abort();
      }
    })();
    await sleep(timeMs, controller.signal);
  }

  async forceReloadClients() {
    await Promise.all(mapMap(this.clients, (client) => client.forceReload()));
  }

  async lameDuck() {
    this.state = "lameDuck";
    await Promise.all(mapMap(this.clients, (client) => client.lameDuck()));
    await this.sleepUntilNoMoreClients(CONFIG.wsZrpcLameDuckMs);
  }

  private async periodicallySendHeartbeat(signal: AbortSignal) {
    while (await sleep(CONFIG.wsZrpcHeartbeatIntervalMs, signal)) {
      await Promise.all(mapMap(this.clients, (client) => client.heartbeat()));
    }
  }

  install<
    TMethods extends UntypedMethods<WebSocketRpcContext>,
    TStreamingMethods extends UntypedStreamingMethods<WebSocketRpcContext>
  >(
    service: ServiceDescription<TMethods, TStreamingMethods>,
    implementation: ServiceImplementation<
      WebSocketRpcContext,
      TMethods,
      TStreamingMethods
    >
  ) {
    for (const [methodName, methodDefinition] of Object.entries(
      service.definition
    )) {
      ok(!methodDefinition.requestStream);
      const methodImplementation =
        implementation[methodName].bind(implementation);
      ok(
        methodDefinition.path.match(VALID_PATH),
        `Invalid zRPC WebSocket method: ${methodDefinition.path}`
      );
      this.implementation[methodDefinition.path] =
        methodDefinition.responseStream
          ? createStreamingHandler(methodDefinition, methodImplementation)
          : createUnaryHandler(methodDefinition, methodImplementation);
    }
  }

  uninstall(service: ServiceDescription<any, any>) {
    for (const key in service.definition) {
      delete this.implementation[key];
    }
  }

  private validateUpgradeRequest(
    res: HttpResponse,
    req: HttpRequest
  ): ValidatedRequest | undefined {
    const headers: Record<string, string | string[]> = {};
    const cookies: Record<string, string> = {};
    req.forEach((k, v) => {
      k = k.toLowerCase();
      if (k === "cookie") {
        Object.assign(cookies, parseCookies(v));
      }
      const existing = headers[k];
      if (existing !== undefined) {
        if (typeof existing === "string") {
          headers[k] = [existing, v];
        } else {
          existing.push(v);
        }
      } else {
        headers[k] = v;
      }
    });
    const logInfo: RequestLogInfo = {
      url: req.getUrl(),
      headers,
      bdid: cookies["BDID"] || "unknown",
      method: req.getMethod(),
      remoteAddress: res.getRemoteAddressAsText().toString(),
    };
    const result: Partial<ValidatedRequest> &
      Pick<ValidatedRequest, "closeWithError" | "log"> = {
      cookies,
      serverSessionId: `WS${autoId()}`,
      log: (statusCodeOrError: any) => {
        logHttpRequest(logInfo, statusCodeOrError, {
          authType: result.authType,
          protocol: result.protocol,
          clientSessionId: result.clientSessionId,
          serverSessionId: result.serverSessionId,
          checkUserId: result.checkUserId,
          userId: (result as any).userId,
        });
      },
      closeWithError: (res, error) => {
        const code = errorCodeToStatus[error];
        res.writeStatus(`${code} ${HTTP_STATUS_CODES[code]}`);
        res.end(
          JSON.stringify({
            error,
          })
        );
        result.log(new APIError(error));
      },
    };
    if (!req.getUrl()) {
      result.closeWithError(res, "not_found");
      return;
    }
    const query = querystring.parse(req.getQuery());
    if (query[ZRPC_PROTOCOL_ARG] !== ZRPC_PROTOCOL_VERSION) {
      result.closeWithError(res, "bad_param");
      return;
    }
    result.protocol = ZRPC_PROTOCOL_VERSION;
    const clientSessionId = query[ZRPC_CLIENT_SESSION_ARG];
    if (!clientSessionId || typeof clientSessionId !== "string") {
      result.closeWithError(res, "bad_param");
      return;
    }
    result.clientSessionId = clientSessionId;

    const clientCheckUserId = query[ZRPC_CLIENT_USER_ARG];
    if (clientCheckUserId) {
      if (typeof clientCheckUserId !== "string") {
        result.closeWithError(res, "bad_param");
        return;
      }
      result.checkUserId = safeParseBiomesId(clientCheckUserId);
    }
    result.wsHeaders = {
      secWebSocketKey: req.getHeader("sec-websocket-key"),
      secWebSocketProtocol: req.getHeader("sec-websocket-protocol"),
      secWebSocketExtensions: req.getHeader("sec-websocket-extensions"),
    };

    result.desireAnonymous = query[ZRPC_CLIENT_DESIRE_ANON_ARG] === "1";

    return result as ValidatedRequest;
  }

  private checkAuthentication(
    res: HttpResponse,
    req: ValidatedRequest,
    authResult: AuthenticationResult
  ): AuthenticatedRequest | undefined {
    const complete = (authType: WebSocketAuthType, userId: BiomesId) => {
      // Take user ID from authentication.
      req.authType = authType;
      (req as any).userId = userId;
      return req as AuthenticatedRequest;
    };

    if (authResult.error === null) {
      if (req.checkUserId && req.checkUserId !== authResult.auth.userId) {
        // Failed to match supplied user ID.
        res.closeWithError(res, "unauthorized");
        return;
      }

      if (!req.desireAnonymous) {
        return complete(
          authResult.auth.session.gremlin ? "gremlin" : "user",
          authResult.auth.userId
        );
      }
    }

    if (this.options.permitAnonymous || authResult.error !== null) {
      log.info("WS server permitting anonymous session", {
        error: authResult.error,
      });
      return complete("unknown", INVALID_BIOMES_ID);
    }

    if (process.env.NODE_ENV === "production" || !req.checkUserId) {
      // We're in production, they failed to authenticate.
      res.closeWithError(res, "unauthorized");
      return;
    }
    log.warn("WS server in development mode, ignoring failed authentication", {
      error: authResult.error,
    });
    return complete("unknown", req.checkUserId);
  }

  private onUpgrade(
    res: HttpResponse,
    req: HttpRequest,
    context: us_socket_context_t
  ) {
    const validated = this.validateUpgradeRequest(res, req);
    if (!validated) {
      return;
    }
    if (this.state === "lameDuck") {
      validated.closeWithError(res, "lameduck");
      return;
    } else if (CONFIG.disableGame) {
      validated.closeWithError(res, "killswitched");
      return;
    } else if (
      this.state !== "started" ||
      (this.options.maxConnections &&
        this.clients.size >= this.options.maxConnections)
    ) {
      log.warn("WS server rejecting connection (overloaded)", {
        state: this.state,
        maxConnections: this.options.maxConnections,
        currentConnections: this.clients.size,
      });
      validated.closeWithError(res, "overloaded");
      return;
    }
    const state = { aborted: false };
    res.onAborted(() => (state.aborted = true));
    // Must copy needed details out of the request, as it's only valid
    // in the direct callback.
    this.controller.runInBackground("verify", async (_signal) => {
      // Make this non-throwing.
      const authResult = await verifyCookies(
        this.sessionStore,
        validated.cookies
      ).catch((details: unknown) => ({ error: "internal", details } as const));

      if (state.aborted) {
        // Aborted in the interim, nothing to do.
        return;
      }

      res.cork(() => {
        if (authResult.error === "internal") {
          log.debug("WebSocket auth error", { error: authResult.details });
          validated.closeWithError(res, "unauthorized");
        } else if (this.controller.aborted) {
          validated.closeWithError(res, "internal_error");
        } else {
          const authenticated = this.checkAuthentication(
            res,
            validated,
            authResult
          );
          if (!authenticated) {
            // Response has already been sent.
            return;
          }
          authenticated.log(200);
          res.upgrade(
            authenticated,
            authenticated.wsHeaders.secWebSocketKey,
            authenticated.wsHeaders.secWebSocketProtocol,
            authenticated.wsHeaders.secWebSocketExtensions,
            context
          );
        }
      });
    });
  }
}
