import { BackgroundTaskController } from "@/shared/abort";
import { buildTimestamp } from "@/shared/build";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { GaussianDistribution } from "@/shared/math/gaussian";
import { sampleGaussian, scaleGaussian } from "@/shared/math/gaussian";
import { Timer, TimerNeverSet } from "@/shared/metrics/timer";
import { timeStamp } from "@/shared/metrics/timestamp";
import {
  ConditionVariable,
  Delayed,
  asyncGeneratorWithQueue,
  sleep,
} from "@/shared/util/async";
import { autoId } from "@/shared/util/auto_id";
import { mapMap } from "@/shared/util/collections";
import { makeCvalHook, removeCvalPath } from "@/shared/util/cvals";
import { BackoffDelay } from "@/shared/util/retry_helpers";
import { callbackToStream } from "@/shared/zrpc/callback_to_stream";
import { ClientRequestStatRecorder } from "@/shared/zrpc/client_stats";
import type {
  RequestType,
  ServiceDescription,
  UntypedMethods,
  UntypedStreamingMethods,
  WebSocketChannel,
  WebSocketChannelEvents,
  WebSocketClient,
  WsSocketState,
  WsSocketStatus,
} from "@/shared/zrpc/core";
import { willEverBeReady } from "@/shared/zrpc/core";
import { RpcClientError, wrapClientError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import { prepare } from "@/shared/zrpc/serde";
import { EventEmitter } from "events";
import type { Data } from "isomorphic-ws";
import WebSocket from "isomorphic-ws";
import { isEqual, mapKeys, mapValues } from "lodash";
import { pack, unpack } from "msgpackr";
import type TypedEventEmitter from "typed-emitter";
import type { ZodTypeAny } from "zod";
import { z } from "zod";

export const ZRPC_PROTOCOL_ARG = "p";
export const ZRPC_PROTOCOL_VERSION = "2";
export const ZRPC_CLIENT_SESSION_ARG = "cs";
export const ZRPC_CLIENT_USER_ARG = "u";
export const ZRPC_CLIENT_DESIRE_ANON_ARG = "a";

export const HEARTBEAT_PATH = "\u2665";
export const LAMEDUCK_PATH = "\uD83E\uDD86";
export const KILL_CLIENT_PATH = "\uD83D\uDC80";

const protocolMapping: { [key: string]: string } = {
  "http:": "ws:",
  "https:": "wss:",
} as const;

function prepareUri(
  raw: string,
  clientSessionId: string,
  userId?: BiomesId,
  desireAnon?: boolean
): string {
  const url = new URL(
    raw,
    process.env.IS_SERVER ? undefined : window.location.href
  );
  url.searchParams.set(ZRPC_PROTOCOL_ARG, ZRPC_PROTOCOL_VERSION);
  url.searchParams.set(ZRPC_CLIENT_SESSION_ARG, clientSessionId);
  if (userId && process.env.NODE_ENV !== "production") {
    url.searchParams.set(ZRPC_CLIENT_USER_ARG, String(userId));
  }
  if (desireAnon) {
    url.searchParams.set(ZRPC_CLIENT_DESIRE_ANON_ARG, "1");
  }
  url.protocol = protocolMapping[url.protocol] ?? url.protocol;

  return url.toString();
}

export interface WebSocketClientOptions {
  authUserId?: BiomesId;
  // Allows specifying an auth-token via a request parameter for tests.
  authSessionId?: string;
  artificialLagMs?: GaussianDistribution;
  clientSessionId?: string;
  desireAnonymous?: boolean;
}

interface CallUpdate extends grpc.StatusObject {
  response?: any;
}

function dataLength(data: Data) {
  if (typeof data === "string") {
    return data.length;
  } else if (data instanceof ArrayBuffer) {
    return data.byteLength;
  }
  if (process.env.IS_SERVER) {
    if (data instanceof Buffer) {
      return data.length;
    }
    return data.reduce((acc, buf) => acc + buf.length, 0);
  }
  log.warn(`Unexpected data type from WebSocket: ${typeof data}`);
  return 0;
}

export const zHeartbeatConfig = z.object({
  ttlMs: z.number().positive(),
  startupReconnectMs: z.number().positive().optional(),
  reconnectMs: z.number().positive(),
  serverSessionId: z.string().optional(),
  serverRtt: z.number().optional(),
  // If the client build is older than this, force reload.
  oldestAcceptableBuildTimestamp: z.number().optional(),
  maxBackpressure: z.number().optional(),
});

export type HeartbeatConfig = z.infer<typeof zHeartbeatConfig>;

// zRPC over WebSocket.
// All messages are encoded using msgpackr, and requests are additionally passed through
// the 'prepare' routine, thus being a zRPC compatible encoding.
//
// Possible Client -> Server Messages:
// - [id, status]: Status update for the given request, to terminate it.
// - [id, path, request]: Start request.
// Possible Server -> Client Messages:
// - [id, response]: Response to the given request.
// - [id, status, errorDetails]: Error response to the given request.
// - [\u2665, heartbeatConfig]: Heartbeat keep-alive, and the interval to expect.
//
// Reserved paths:
// - /ping: Response is just okay.
//
// Streaming requests are implemented by having the client send to the server a regular request,
// and then it receiving multiple events in return. The server uses 'undefined' as the response
// value to indicate a graceful end of stream.
//
// On socket error, a log message is printed. On socket close, all in-flight
// requests are terminated with state CANCELLED. If you do not wait for the socket
// to be ready, requests are failed fast with state UNIMPLEMENTED.
export class WebSocketZrpcClient
  extends (EventEmitter as {
    new (): TypedEventEmitter<WebSocketChannelEvents>;
  })
  implements WebSocketChannel
{
  /** The connection is not yet open. */
  static readonly CONNECTING = 0;
  /** The connection is open and ready to communicate. */
  static readonly OPEN = 1;
  /** The connection is in the process of closing. */
  static readonly CLOSING = 2;
  /** The connection is closed. */
  static readonly CLOSED = 3;

  public readonly id: string;
  public readonly clientSessionId: string;
  public readonly chooseUri: () => string;
  public uri?: string;
  private socket?: WebSocket;

  // Background tasks
  private readonly controller = new BackgroundTaskController();

  private lastReportedBufferedAmount?: number;
  private drain = new ConditionVariable();
  private sending: Promise<unknown> = Promise.resolve();

  // State tracking, update using this.state =
  private state: WsSocketState = "connecting";
  private lastReportedStatus?: WsSocketStatus;

  // During the connecting process, track an exponential backoff delay for
  // retrying a connection attempt after it fails.
  private reconnectDelay: BackoffDelay;

  // Inflight request track.
  private readonly inflight = new Map<number, (update: CallUpdate) => void>();
  private reqId = 1;

  // Heartbeat information.
  public lastServerMessageTime = new Timer(TimerNeverSet);
  private heartbeatConfig: HeartbeatConfig = {
    ttlMs: 5_000,
    reconnectMs: 10_000,
    maxBackpressure: 1024,
  };

  // Stats
  public sentMessages = 0;
  public sentBytes = 0;
  public receivedBytes = 0;
  public receivedMessages = 0;
  public recentReconnectReasons: string[] = [];

  constructor(
    uri: string | (() => string),
    private readonly options: WebSocketClientOptions = {}
  ) {
    super();
    this.setMaxListeners(Infinity);
    this.id = autoId();
    this.clientSessionId = options.clientSessionId ?? this.id;

    // Monitor health.
    makeCvalHook({
      path: ["network", this.id, "state"],
      help: "Current websocket state.",
      collect: () => this.state,
    });
    makeCvalHook({
      path: ["network", this.id, "timeSinceLastMessage"],
      help: "Time in milliseconds since last server message.",
      collect: () => this.lastServerMessageTime.elapsed,
      toHumanReadable: (value) => `${value.toFixed(2)}ms`,
    });
    makeCvalHook({
      path: ["network", this.id, "heartbeatConfig"],
      help: "Heartbeat TTL.",
      collect: () => this.heartbeatConfig,
    });
    makeCvalHook({
      path: ["network", this.id, "sentMessages"],
      help: "Total sent messages.",
      collect: () => this.sentMessages,
    });
    makeCvalHook({
      path: ["network", this.id, "sentBytes"],
      help: "Total sent bytes.",
      collect: () => this.sentBytes,
    });
    makeCvalHook({
      path: ["network", this.id, "receivedBytes"],
      help: "Total received bytes.",
      collect: () => this.receivedBytes,
    });
    makeCvalHook({
      path: ["network", this.id, "receivedMessages"],
      help: "Total received messages.",
      collect: () => this.receivedMessages,
    });
    makeCvalHook({
      path: ["network", this.id, "inFlightRequests"],
      help: "In-flight requests",
      collect: () => this.inflightRequests,
    });
    makeCvalHook({
      path: ["network", this.id, "serverSessionId"],
      help: "Server session ID",
      collect: () => this.heartbeatConfig.serverSessionId ?? "[unknown]",
    });
    makeCvalHook({
      path: ["network", this.id, "serverRtt"],
      help: "Server session ID",
      collect: () => this.heartbeatConfig.serverRtt ?? 0,
      toHumanReadable: (value) =>
        value ? `${value.toFixed(2)}ms` : "[unknown]",
    });
    makeCvalHook({
      path: ["network", this.id, "recentReconnectReasons"],
      help: "Recent reconnect reasons",
      collect: () => this.recentReconnectReasons,
      toHumanReadable: (value) => value.slice(0, 5).join(", "),
    });
    makeCvalHook({
      path: ["network", this.id, "backgroundTasks"],
      help: "Running background tasks",
      collect: () => this.controller.taskNames,
    });
    makeCvalHook({
      path: ["network", this.id, "bufferedBytes"],
      help: "Buffered bytes",
      collect: () => this.refreshBufferedAmount(),
    });
    this.chooseUri = () =>
      prepareUri(
        typeof uri === "string" ? uri : uri(),
        this.clientSessionId,
        options.authUserId,
        options.desireAnonymous
      );
    this.reconnectDelay = this.newReconnectDelay();
    this.controller.runInBackground("checkState", (signal) =>
      this.periodicallyCheckState(signal)
    );
    this.controller.runInBackground("watchForDrains", (signal) =>
      this.watchForDrains(signal)
    );
    this.lastServerMessageTime.reset();
    this.connectWebSocket();
  }

  private newReconnectDelay() {
    return new BackoffDelay({ baseMs: 100, maxMs: 5000, exponent: 1.5 });
  }

  private checkState(newState?: WsSocketState) {
    if (newState !== undefined) {
      this.state = newState;
    }
    if (
      this.state === "ready" &&
      this.lastServerMessageTime.elapsed > this.heartbeatConfig.reconnectMs
    ) {
      this.reconnectWebSocket("Connection timeout");
    } else if (
      this.state === "waitingOnHeartbeat" &&
      this.lastServerMessageTime.elapsed >
        (this.heartbeatConfig.startupReconnectMs ??
          this.heartbeatConfig.reconnectMs)
    ) {
      this.reconnectWebSocket("Heartbeat timeout");
    }
    if (this.lastReportedStatus !== this.status) {
      this.lastReportedStatus = this.status;
      timeStamp(`WS.status = ${this.status}`);
      this.emit("status", this.status);
    }
    this.refreshBufferedAmount();
  }

  private async periodicallyCheckState(signal: AbortSignal) {
    while (await sleep(500, signal)) {
      this.checkState();
    }
  }

  private async watchForDrains(signal: AbortSignal) {
    while (await sleep(20, signal)) {
      this.refreshBufferedAmount();
    }
  }

  private refreshBufferedAmount() {
    const current =
      this.socket?.readyState !== WebSocketZrpcClient.OPEN
        ? 0
        : this.socket.bufferedAmount;
    if (
      this.lastReportedBufferedAmount === undefined ||
      this.lastReportedBufferedAmount > current
    ) {
      this.drain.signal();
      this.lastReportedBufferedAmount = current;
    }
    return current;
  }

  private removeWebSocketHandlers() {
    if (this.socket) {
      const nop = () => {};
      this.socket.onopen = nop;
      this.socket.onclose = nop;
      this.socket.onerror = nop;
      this.socket.onmessage = nop;
    }
  }

  private installWebSocketHandlers() {
    if (this.socket) {
      this.socket.binaryType = process.env.IS_SERVER
        ? "nodebuffer"
        : "arraybuffer";
      this.socket.onopen = () => this.onOpen();
      this.socket.onclose = (ev) => this.onClose(ev);
      this.socket.onerror = (ev) => this.onError(ev);
      this.socket.onmessage = (ev) => this.onMessage(ev);
    }
  }

  private reconnectWebSocket(reason: string) {
    timeStamp(`WS.reconnecting`);
    log.warn(`Reconnecting: ${reason}`);
    this.recentReconnectReasons.push(reason);
    if (this.recentReconnectReasons.length > 50) {
      this.recentReconnectReasons.shift();
    }
    this.disconnectWebSocket("reconnecting", `reconnect due to ${reason}`);
  }

  private createWebSocket() {
    this.uri = this.chooseUri();
    if (
      (this.options.authUserId !== undefined ||
        this.options.authSessionId !== undefined) &&
      process.env.IS_SERVER
    ) {
      const cookies: string[] = [];
      if (this.options.authUserId !== undefined) {
        cookies.push(`BUID=${this.options.authUserId}`);
      }
      if (this.options.authSessionId !== undefined) {
        cookies.push(`BSID=${this.options.authSessionId}`);
      }
      return new WebSocket(this.uri, {
        headers: {
          Cookie: cookies.join("; "),
        },
      });
    } else {
      return new WebSocket(this.uri);
    }
  }

  private connectWebSocket() {
    if (this.socket) {
      return;
    }
    this.controller.runInBackground("connect", async (signal) => {
      if (!(await sleep(this.reconnectDelay.ms, signal))) {
        return;
      }
      this.reconnectDelay.incrementDelay();
      this.checkState("connecting");
      this.socket = this.createWebSocket();
      this.installWebSocketHandlers();
    });
  }

  private disconnectWebSocket(toState: WsSocketState, reason: string) {
    if (!this.socket) {
      return;
    }
    this.removeWebSocketHandlers();
    this.checkState(toState);
    if (
      this.socket.readyState === WebSocketZrpcClient.OPEN ||
      this.socket.readyState === WebSocketZrpcClient.CONNECTING
    ) {
      this.socket.close(3000 + grpc.status.ABORTED, `Client close: ${reason}`);
    }
    this.socket = undefined;
    this.drain.signal();
    this.controller.runInBackground("close", async (signal) => {
      const cancelInflight = Promise.all(
        mapMap(this.inflight, (callback) =>
          callback({
            code: grpc.status.CANCELLED,
            name: "CANCELLED",
            message: `${this.id} Disconnected: ${reason}`,
          })
        )
      );
      this.inflight.clear();
      if (!willEverBeReady(this.state) || signal.aborted) {
        log.warn(`${this.id} disconnected.`, {
          reason,
        });
        this.checkState("disconnected");
        return;
      }
      if (this.state !== "reconnecting") {
        log.error(`${this.id} closed unexpectedly, reconnecting...`, {
          reason,
        });
      }
      this.connectWebSocket();
      await cancelInflight;
    });
  }

  get status() {
    if (this.state === "ready") {
      return this.lastServerMessageTime.elapsed < this.heartbeatConfig.ttlMs
        ? "ready"
        : "unhealthy";
    }
    return this.state;
  }

  get inflightRequests() {
    return this.inflight.size;
  }

  private onOpen() {
    this.lastServerMessageTime.reset();
    log.info(`WebSocket connected to ${this.uri}`);
    this.reconnectDelay = this.newReconnectDelay();
    this.checkState("waitingOnHeartbeat");
  }

  private onError(details: WebSocket.ErrorEvent) {
    const context = {
      details: mapKeys(details, (k) => String(k)),
      detailsAsString: String(details),
      clientSessionId: this.clientSessionId,
      serverSessionId: this.heartbeatConfig.serverSessionId ?? "(unknown)",
    } as const;
    if (this.state === "waitingOnHeartbeat" || this.state === "ready") {
      log.error("WebSocket error, will reconnect", context);
      this.reconnectWebSocket("unexpected error");
    } else {
      log.error("WebSocket error while not connected", context);
    }
  }

  private onClose({ wasClean, code, reason }: WebSocket.CloseEvent) {
    this.disconnectWebSocket(
      "interrupted",
      `${wasClean ? "clean" : "unclean"} close event ${code} ${reason}`.trim()
    );
  }

  private onHeartbeat(response: any) {
    if (this.state === "waitingOnHeartbeat") {
      log.debug("Got heartbeat");
      this.checkState("ready");
    }
    const parsed = zHeartbeatConfig.optional().safeParse(response);
    if (!parsed.success) {
      log.warn(`Ignoring invalid heartbeat config`);
      return;
    }
    if (
      parsed.data === undefined ||
      isEqual(parsed.data, this.heartbeatConfig)
    ) {
      return;
    }
    this.heartbeatConfig = parsed.data;
    log.debug(
      `Received new heartbeat config: ${JSON.stringify(this.heartbeatConfig)}`
    );
    if (this.heartbeatConfig.oldestAcceptableBuildTimestamp) {
      if (
        buildTimestamp() &&
        buildTimestamp() <
          this.heartbeatConfig.oldestAcceptableBuildTimestamp &&
        process.env.NODE_ENV === "production" &&
        !process.env.IS_SERVER
      ) {
        this.emit("serverRequestsReload");
      }
    }
  }

  private onInternalMessage(path: string, response: any) {
    switch (path) {
      case HEARTBEAT_PATH:
        this.onHeartbeat(response);
        return;
      case LAMEDUCK_PATH:
        this.emit("lameDuck");
        return;
      case KILL_CLIENT_PATH:
        this.emit("serverRequestsReload");
        return;
      default:
        log.warn(`Ignoring unknown internal message: ${path}`);
    }
  }

  private validateMessage(data: Data):
    | undefined
    | {
        reqId: number | string;
        error?: {
          code: grpc.status;
          details: string;
        };
        response?: any;
      } {
    try {
      if (typeof data === "string") {
        // Internal message.
        return { reqId: data };
      } else if (data instanceof ArrayBuffer) {
        data = new Uint8Array(data);
      }
      if (process.env.IS_SERVER) {
        if (Array.isArray(data)) {
          data = Buffer.concat(data);
        }
      }
      const decoded = unpack(data as Uint8Array);
      if (
        !Array.isArray(decoded) ||
        (decoded.length !== 3 && decoded.length !== 2)
      ) {
        throw "data should be a 2 or 3-tuple";
      }
      const [reqId, response, details] = decoded;
      if (typeof reqId !== "number" && typeof reqId !== "string") {
        throw `request ID: ${typeof reqId}`;
      }
      if (details !== undefined) {
        const code = grpc.unknownToStatus(response);
        if (code === undefined) {
          throw `status: ${typeof response}`;
        }
        if (typeof details !== "string") {
          throw `error details: ${typeof details}`;
        }
        return {
          reqId,
          error: {
            code,
            details,
          },
        };
      }
      return {
        reqId,
        response,
      };
    } catch (error) {
      log.warn(`Ignoring malformed WebSocket data: ${error}`);
    }
  }

  private onMessage({ data }: WebSocket.MessageEvent) {
    timeStamp(`WS.onMessage`);
    this.lastServerMessageTime.reset();
    this.receivedMessages++;
    const length = dataLength(data);
    if (length === 0) {
      // Nothing to do.
      return;
    }
    this.receivedBytes += length;
    this.checkState();
    const validated = this.validateMessage(data);
    if (validated === undefined) {
      return;
    }
    const { reqId, error, response } = validated;
    if (typeof reqId === "string") {
      this.onInternalMessage(reqId, response);
      return;
    }
    const handler = this.inflight.get(reqId);
    if (handler === undefined) {
      return;
    }
    if (error !== undefined) {
      handler({
        ...error,
        name: grpc.status[error.code],
        message: error.details,
      });
    } else {
      handler({
        code: grpc.status.OK,
        name: "OK",
        message: "",
        response,
      });
    }
  }

  async close() {
    this.checkState("closing");
    this.disconnectWebSocket("closing", "finished");
    await this.controller.abortAndWait();
    // Remove our cval hooks after some time
    const cleanupTimeout = setTimeout(
      () =>
        removeCvalPath({
          path: ["network", this.id],
        }),
      1000 * 60 * 30
    ); // 30 minutes.
    if (process.env.IS_SERVER || process.env.MOCHA_TEST) {
      // Don't let this keep the process alive in tests/servers.
      cleanupTimeout.unref();
    }
  }

  async waitForReady(
    timeoutMs: number,
    signal?: AbortSignal
  ): Promise<boolean> {
    if (timeoutMs <= 0 || signal?.aborted) {
      return this.state === "ready";
    }
    return new Promise((resolve) => {
      if (this.state === "ready") {
        resolve(true);
        return;
      }
      const statusChange = () => {
        if (this.state !== "ready" && !aborted && willEverBeReady(this.state)) {
          // Keep waiting until we've been aborted or we're ready.
          return;
        }
        if (timeout !== undefined) {
          clearTimeout(timeout);
        }
        signal?.removeEventListener("abort", abort);
        this.off("status", statusChange);
        resolve(this.state === "ready");
      };

      let aborted = false;
      const abort = () => {
        aborted = true;
        statusChange();
      };

      const timeout = isFinite(timeoutMs)
        ? setTimeout(abort, timeoutMs)
        : undefined;
      signal?.addEventListener("abort", abort);
      this.on("status", statusChange);
    });
  }

  private async send(path: string | undefined, data: Buffer) {
    this.refreshBufferedAmount(); // Force checking and potentially draining.
    const promise = this.sending.then(async () => {
      if (
        this.heartbeatConfig.maxBackpressure !== undefined &&
        data.length < this.heartbeatConfig.maxBackpressure
      ) {
        while (
          this.socket?.readyState === WebSocketZrpcClient.OPEN &&
          this.refreshBufferedAmount() + data.length >
            this.heartbeatConfig.maxBackpressure
        ) {
          await this.drain.wait();
        }
      }
      if (
        !this.socket ||
        this.socket?.readyState !== WebSocketZrpcClient.OPEN
      ) {
        throw new RpcClientError(
          path ?? "unknown",
          grpc.status.UNAVAILABLE,
          `WebSocket not connected: ${this.state}`
        );
      }
      this.socket.send(data);
      this.sentMessages++;
      this.sentBytes += data.length;
    });
    this.sending = promise.catch(() => {});
    return promise;
  }

  private cancelRequest(id: number) {
    const responseHandler = this.inflight.get(id);
    if (responseHandler === undefined) {
      return;
    }
    this.inflight.delete(id);
    responseHandler({
      code: grpc.status.CANCELLED,
      name: "CANCELLED",
      message: "Client cancelled after send",
    });
    if (this.socket?.readyState !== WebSocketZrpcClient.OPEN) {
      return;
    }
    this.controller.runInBackground("cancel-request", async () => {
      try {
        await this.send(undefined, pack([id, grpc.status.CANCELLED]));
      } catch (error) {
        // The socket has been closed, just ignore.
      }
    });
  }

  async genericRequestStart<TRequest>(
    path: string,
    request: TRequest,
    signal: AbortSignal | undefined,
    responseHandler: (response: CallUpdate) => void,
    oneWay: boolean
  ): Promise<number> {
    if (!willEverBeReady(this.state)) {
      throw new RpcClientError(
        path,
        grpc.status.UNAVAILABLE,
        `WebSocket not connected: ${this.state}`
      );
    }
    const id = this.reqId++;
    while (true) {
      const ready = await this.waitForReady(Infinity, signal);
      // Check this.socket again after the wait to avoid a race
      // where a disconnect occurred at the same interval.
      if (ready && this.socket) {
        break;
      } else if (!ready) {
        throw new RpcClientError(
          path,
          grpc.status.CANCELLED,
          "Client cancelled before send"
        );
      }
    }
    try {
      await this.send(path, pack([id, path, prepare(request)]));
    } catch (error) {
      throw new RpcClientError(
        path,
        grpc.status.INTERNAL,
        `Unable to send data on socket: ${error}`
      );
    }
    if (oneWay) {
      responseHandler({
        code: grpc.status.OK,
        name: "OK",
        message: "No response needed",
        response: undefined,
      });
    } else {
      this.inflight.set(id, responseHandler);
    }
    return id;
  }

  async makeUnaryRequest<TRequest, TZodResponse extends ZodTypeAny>(
    path: string,
    request: TRequest,
    responseType: TZodResponse,
    requestSignal: AbortSignal | undefined,
    oneWay: boolean
  ): Promise<z.infer<TZodResponse>> {
    const recorder = new ClientRequestStatRecorder(path);
    const controller = this.controller.chain(requestSignal);
    try {
      const delayedUpdate = new Delayed<CallUpdate>();
      const reqId = await this.genericRequestStart<TRequest>(
        path,
        request,
        controller.signal,
        (update) => delayedUpdate.resolve(update),
        oneWay
      );
      const onAbort = () => {
        controller.signal.removeEventListener("abort", onAbort);
        this.cancelRequest(reqId);
      };
      controller.signal.addEventListener("abort", onAbort);
      const update = await delayedUpdate.wait();
      this.inflight.delete(reqId);
      if (update.code !== grpc.status.OK) {
        throw update;
      }
      recorder.gotResponse();
      try {
        return responseType.parse(update.response);
      } catch (error) {
        throw {
          code: grpc.status.INVALID_ARGUMENT,
          details: `Could not parse server response: ${error}`,
        };
      }
    } catch (error) {
      const status = wrapClientError(error, path);
      recorder.error(status.code);
      throw status;
    } finally {
      recorder.end();
      controller.abort();
    }
  }

  async *makeStreamingRequest<TRequest, TZodResponse extends ZodTypeAny>(
    path: string,
    request: TRequest,
    responseType: TZodResponse,
    streamSignal?: AbortSignal
  ): AsyncGenerator<z.infer<TZodResponse>, void, unknown> {
    const recorder = new ClientRequestStatRecorder(path);
    const controller = this.controller.chain(streamSignal);
    try {
      const [cb, stream] = callbackToStream<CallUpdate>(controller.signal);
      const reqId = await this.genericRequestStart<TRequest>(
        path,
        request,
        controller.signal,
        cb,
        false
      );
      const onAbort = () => {
        controller.signal.removeEventListener("abort", onAbort);
        this.cancelRequest(reqId);
      };
      controller.signal.addEventListener("abort", onAbort);
      for await (const update of stream) {
        if (update.code !== grpc.status.OK) {
          throw update;
        } else if (update.response === undefined) {
          return; // Graceful exit.
        }
        recorder.gotResponse();
        try {
          yield responseType.parse(update.response);
        } catch (error) {
          throw {
            code: grpc.status.INVALID_ARGUMENT,
            details: `Could not parse server response: ${error}`,
          };
        }
      }
      this.inflight.delete(reqId);
    } catch (error) {
      const status = wrapClientError(error, path);
      recorder.error(status.code);
      throw status;
    } finally {
      recorder.end();
      controller.abort();
    }
  }
}

export function makeWebSocketClient<
  TMethods extends UntypedMethods,
  TStreamingMethods extends UntypedStreamingMethods
>(
  service: ServiceDescription<TMethods, TStreamingMethods>,
  uri: string | (() => string),
  options: WebSocketClientOptions = {}
): WebSocketClient<TMethods, TStreamingMethods> {
  const socketClient = new WebSocketZrpcClient(uri, options);
  // Divide by 2 to convert from round trip time to one-way time.
  const artificialLagMs: GaussianDistribution | undefined =
    options.artificialLagMs
      ? scaleGaussian(0.5, options.artificialLagMs)
      : undefined;
  return {
    channel: socketClient as WebSocketChannel,
    ...mapValues(service.definition, (methodDefinition) => {
      if (methodDefinition.responseStream) {
        const f = (
          request: RequestType<TStreamingMethods[string]>,
          signal?: AbortSignal
        ) =>
          socketClient.makeStreamingRequest(
            methodDefinition.path,
            request,
            methodDefinition.responseType,
            signal
          );

        return artificialLagMs
          ? (
              request: RequestType<TStreamingMethods[string]>,
              signal?: AbortSignal
            ) => withLatencyGen(() => f(request, signal), artificialLagMs)
          : f;
      } else {
        const f = (
          request: RequestType<TMethods[string]>,
          signal?: AbortSignal
        ) =>
          socketClient.makeUnaryRequest(
            methodDefinition.path,
            request,
            methodDefinition.responseType,
            signal,
            methodDefinition.oneWay
          );
        return artificialLagMs
          ? (request: RequestType<TMethods[string]>, signal?: AbortSignal) =>
              withLatencyFunc(() => f(request, signal), artificialLagMs)
          : f;
      }
    }),
    close: () => socketClient.close(),
    waitForReady: (...args) => socketClient.waitForReady(...args),
  } as WebSocketClient<TMethods, TStreamingMethods>;
}

function sleepGaussian(gaussian: GaussianDistribution) {
  return sleep(Math.max(0, sampleGaussian(gaussian)));
}

async function withLatencyFunc<T>(
  f: () => Promise<T>,
  latencyMs: GaussianDistribution
) {
  // Send latency.
  await sleepGaussian(latencyMs);
  const x = await f();
  // Receive latency.
  await sleepGaussian(latencyMs);
  return x;
}

async function* withLatencyGen<T>(
  parent: () => AsyncGenerator<T, void, undefined>,
  latencyMs: GaussianDistribution
) {
  // Send latency.
  await sleepGaussian(latencyMs);

  async function* addSleep() {
    for await (const x of parent()) {
      yield { sleepPromise: sleepGaussian(latencyMs), value: x };
    }
  }

  // Using asyncGeneratorWithQueue to decouple production within addSleep() from
  // its consumption here in this for loop.
  for await (const { sleepPromise, value } of asyncGeneratorWithQueue(
    addSleep()
  )) {
    // Receive latency.
    await sleepPromise;
    yield value;
  }
}
