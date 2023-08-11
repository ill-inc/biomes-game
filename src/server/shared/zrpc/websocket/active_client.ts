import { oldestAcceptableBuildTimestamp } from "@/server/shared/build";
import type { WebSocketAuthType } from "@/server/shared/zrpc/server_types";
import {
  inflightRequestStat,
  latencyStat,
  requestStat,
} from "@/server/shared/zrpc/stats";
import type {
  WebSocketConnection,
  WebSocketServiceImplementation,
} from "@/server/shared/zrpc/websocket/call";
import { WebSocketCall } from "@/server/shared/zrpc/websocket/call";
import type { WebSocketZrpcServer2Options } from "@/server/shared/zrpc/websocket/options";
import type { ValidatedMessage } from "@/server/shared/zrpc/websocket/serde";
import {
  ZRPC_MAX_BACKPRESSURE,
  ZRPC_MAX_SERVER_PAYLOAD,
  validateClientMessage,
  websocketPackr,
} from "@/server/shared/zrpc/websocket/serde";
import { BackgroundTaskController, chain } from "@/shared/abort";
import type { BiomesId } from "@/shared/ids";
import { log, withLogContext } from "@/shared/logging";
import { createHistogram, exponentialBuckets } from "@/shared/metrics/metrics";
import { Timer, TimerNeverSet } from "@/shared/metrics/timer";
import { ConditionVariable, Latch } from "@/shared/util/async";
import { RpcError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import type { HeartbeatConfig } from "@/shared/zrpc/websocket_client";
import {
  HEARTBEAT_PATH,
  KILL_CLIENT_PATH,
  LAMEDUCK_PATH,
} from "@/shared/zrpc/websocket_client";
import { Unpackr } from "msgpackr";
import { EventEmitter } from "stream";
import type TypedEventEmitter from "typed-emitter";
import type { WebSocket } from "uWebSockets.js";

export type WebSocketClientEvents = {
  closed: () => any;
};

function chooseBufferLimit(len: number) {
  if (!CONFIG.wsZrpcSoftBackpressure) {
    return ZRPC_MAX_BACKPRESSURE;
  }
  return len > CONFIG.wsZrpcSoftBackpressure
    ? ZRPC_MAX_BACKPRESSURE
    : CONFIG.wsZrpcSoftBackpressure;
}

export const bufferedBytesOnSend = createHistogram({
  name: "ws_buffered_bytes_on_send",
  help: "Amount of buffered bytes on each send start",
  buckets: exponentialBuckets(1, 2, 16),
});

export const messageSize = createHistogram({
  name: "ws_message_size",
  help: "Size of a message sent to the client",
  buckets: exponentialBuckets(1, 2, 16),
});

const unpackr = new Unpackr({ useRecords: false, copyBuffers: true });

export class ActiveWebSocketClient
  extends (EventEmitter as {
    new (): TypedEventEmitter<WebSocketClientEvents>;
  })
  implements WebSocketConnection
{
  private ws: WebSocket<unknown> | undefined;
  private readonly abortFn: () => void;
  private readonly controller = new BackgroundTaskController();
  private readonly sinceConnected = new Timer();
  private readonly lastServerMessage = new Timer(TimerNeverSet);
  private readonly lastHeartbeatConfig = new Timer(TimerNeverSet);
  private readonly calls = new Map<number, WebSocketCall>();
  private readonly spaceAvailable = new ConditionVariable();
  private readyToSend: Promise<unknown> = Promise.resolve();
  private sentLameDuckTimeout = false;

  constructor(
    signal: AbortSignal,
    private readonly impl: WebSocketServiceImplementation,
    ws: WebSocket<unknown>,
    public readonly authType: WebSocketAuthType,
    public readonly clientSessionId: string,
    public readonly serverSessionId: string,
    public readonly userId: BiomesId,
    private readonly options: WebSocketZrpcServer2Options
  ) {
    super();
    this.ws = ws;
    chain(this.controller, signal);
    this.abortFn = () => this.close();
    this.controller.signal.addEventListener("abort", this.abortFn);
  }

  get id() {
    return `${this.clientSessionId}/${this.serverSessionId}/${this.userId}`;
  }

  get bufferedBytes() {
    return this.ws?.getBufferedAmount() ?? 0;
  }

  private close(code?: number, message?: string) {
    code ??= grpc.status.CANCELLED;
    message ??= "Server closed connection.";
    this.ws?.end(code, message);
    this.controller.signal.removeEventListener("abort", this.abortFn);
    this.controller.abort();
    this.spaceAvailable.signal();
    this.emit("closed");
  }

  private async readyToSendMessage(len: number) {
    if (len < 0) {
      throw new RpcError(
        grpc.status.INTERNAL,
        "Invalid message length, dropping response"
      );
    } else if (len === 0) {
      return true;
    } else if (len >= ZRPC_MAX_SERVER_PAYLOAD) {
      // Drop on the floor, it's too large.
      throw new RpcError(
        grpc.status.RESOURCE_EXHAUSTED,
        "Message too large, dropping response"
      );
    }
    // If this individual message is too large, limit it by our true limit. Otherwise
    // use our soft limit to provide some backpressure to large streams of small
    // messages.
    const maxBufferedAmount = chooseBufferLimit(len);
    // Maintain serialization of all requests.
    const latch = new Latch();
    const prior = this.readyToSend;
    this.readyToSend = prior.then(() => latch.wait());
    try {
      await prior; // Wait for the last person in queue to go.
      if (this.ws) {
        bufferedBytesOnSend.observe(this.bufferedBytes);
        messageSize.observe(len);
      }
      while (!this.controller.aborted) {
        if (!this.ws) {
          // Drop on the floor, our connection went away.
          throw new RpcError(
            grpc.status.CANCELLED,
            "Connection closed, dropping request"
          );
        }
        if (this.bufferedBytes + len < maxBufferedAmount) {
          // We have space, send it now.
          return true;
        }
        // Wait for a drain event to indicate there is more space.
        await this.spaceAvailable.wait();
      }
      return false;
    } finally {
      latch.signal();
    }
  }

  async sendData(
    path:
      | string
      | [reqId: number, payload: unknown]
      | [path: string, payload: unknown]
      | [reqId: number, status: grpc.status, details: string]
  ) {
    const isBinary = typeof path !== "string";
    const data = isBinary
      ? websocketPackr.pack(path)
      : Buffer.from(path, "utf8");
    if (!(await this.readyToSendMessage(data.length)) || !this.ws) {
      // Aborted.
      return;
    }
    if (!this.ws) {
      // Drop on the floor, our connection went away.
      throw new RpcError(
        grpc.status.CANCELLED,
        "Connection closed, dropping request"
      );
    }
    const result = this.ws.send(
      data,
      isBinary,
      CONFIG.wsZrpcCompressionEnabled
    );
    if (result !== 1 && result !== 0) {
      throw new RpcError(
        grpc.status.INTERNAL,
        "Unable to send data on socket."
      );
    } else {
      this.lastServerMessage.reset();
    }
  }

  get shouldSendHeartbeatConfig() {
    return (
      this.lastHeartbeatConfig.elapsed > CONFIG.wsZrpcHeartbeatConfigRefreshMs
    );
  }

  async heartbeat() {
    if (
      !this.sentLameDuckTimeout &&
      this.sinceConnected.elapsed > CONFIG.wsZrpcLameDuckIntervalMs
    ) {
      if (await this.lameDuck()) {
        this.sentLameDuckTimeout = true;
      }
    }

    if (
      !this.shouldSendHeartbeatConfig &&
      this.lastServerMessage.elapsed < CONFIG.wsZrpcHeartbeatIntervalMs
    ) {
      return;
    }

    try {
      if (this.shouldSendHeartbeatConfig) {
        this.lastHeartbeatConfig.reset();
        await this.sendData([
          HEARTBEAT_PATH,
          <HeartbeatConfig>{
            ttlMs: CONFIG.wsZrpcHeartbeatTtlMs,
            startupReconnectMs: CONFIG.wsZrpcHeartbeatStartupReconnectMs,
            reconnectMs: CONFIG.wsZrpcHeartbeatReconnectMs,
            serverSessionId: this.serverSessionId,
            oldestAcceptableBuildTimestamp: oldestAcceptableBuildTimestamp(),
          },
        ]);
      } else {
        await this.sendData(HEARTBEAT_PATH);
      }
    } catch (error) {
      log.warn(`${this.id} failed to send heartbeat`, { error });
      // Force resend of config.
      this.lastHeartbeatConfig.reset(TimerNeverSet);
    }
  }

  async forceReload() {
    try {
      await this.sendData(KILL_CLIENT_PATH);
      return true;
    } catch (error) {
      log.warn(`${this.id} failed to send kill notification`, { error });
      return false;
    }
  }

  async lameDuck() {
    try {
      await this.sendData(LAMEDUCK_PATH);
      return true;
    } catch (error) {
      log.warn(`${this.id} failed to send lameduck notification`, { error });
      return false;
    }
  }

  // Handler for new WebSocket connection. WebSocket is valid from open
  // to close, no errors.
  onOpen() {}

  private async onStatusMessage(status: grpc.status, call?: WebSocketCall) {
    if (status !== grpc.status.CANCELLED) {
      log.warn(`Unexpected call status ${status}`);
      // Ignore it.
      return;
    }
    await call?.abort();
  }

  async sendStatus(reqId: number, status: grpc.status, details?: string) {
    try {
      await this.sendData([reqId, status, details ?? ""]);
    } catch (error) {
      if (grpc.isStatusObject(error) && error.code === grpc.status.CANCELLED) {
        // It was cancelled, that's fine.
        return;
      }
      log.warn(
        `${reqId}: Could not send ${grpc.status[status]}${
          details !== undefined ? `: ${details}` : ""
        }`,
        { error }
      );
    }
  }

  private async dispatchMessage({
    reqId,
    status,
    path,
    request,
  }: ValidatedMessage) {
    if (status !== undefined) {
      await this.onStatusMessage(status, this.calls.get(reqId));
    } else if (path !== undefined) {
      const timer = new Timer();
      requestStat.inc({ path });

      await withLogContext(
        {
          path,
          extra: {
            userId: this.userId,
            ws: {
              serverSessionId: this.serverSessionId,
              clientSessionId: this.clientSessionId,
            },
          },
        },
        async () => {
          const existing = this.calls.get(reqId);
          if (existing !== undefined) {
            await existing.status(
              grpc.status.INVALID_ARGUMENT,
              "Reused request ID"
            );
            return;
          }
          if (
            this.options.maxInflightRequestsPerClient &&
            this.calls.size > this.options.maxInflightRequestsPerClient
          ) {
            await this.sendStatus(
              reqId,
              grpc.status.RESOURCE_EXHAUSTED,
              "Too many requests"
            );
          }
          const call = new WebSocketCall(
            this.controller.signal,
            this,
            reqId,
            path,
            request
          );
          this.calls.set(reqId, call);
          inflightRequestStat.inc({ path });
          try {
            await call.run(path, this.impl[path]);
          } finally {
            inflightRequestStat.dec({ path });
            this.calls.delete(reqId);
            latencyStat.observe({ path }, timer.elapsed);
          }
        }
      );
    }
  }

  // Handler for a WebSocket message. Messages are given as ArrayBuffer
  // no matter if they are binary or not. Given ArrayBuffer is valid
  // during the lifetime of this callback (until first await or return)
  // and will be neutered.
  onMessage(message: ArrayBuffer, _isBinary: boolean) {
    const onError = (error: unknown) => {
      log.error(`${this.id} unexpected error, terminating`, { error });
      this.close(grpc.status.INTERNAL, "Internal error.");
    };

    try {
      const validated = validateClientMessage(
        Buffer.from(message),
        (x) => unpackr.unpack(x),
        {
          userId: this.userId,
          ws: {
            serverSessionId: this.serverSessionId,
            clientSessionId: this.clientSessionId,
          },
        }
      );
      // Do not block on handling, proceed to next message.
      void this.dispatchMessage(validated).catch(onError);
    } catch (error) {
      onError(error);
    }
  }

  // Handler for when WebSocket backpressure drains.
  // Check ws.getBufferedAmount(). Use this to guide / drive your
  // backpressure throttling.
  onDrain() {
    this.spaceAvailable.signal();
  }

  // Handler for close event, no matter if error, timeout or graceful
  // close. You may not use WebSocket after this event. Do not send on
  // this WebSocket from within here, it is closed.
  onClose(code: number, message: string) {
    this.ws = undefined;
    this.close(code, message);
  }
}
