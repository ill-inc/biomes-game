import type { WebSocketAuthType } from "@/server/shared/zrpc/server_types";
import { WebSocketRpcContext } from "@/server/shared/zrpc/server_types";
import { errorStat } from "@/server/shared/zrpc/stats";
import { UnboundedAbortController, chain } from "@/shared/abort";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { Consumable } from "@/shared/util/consumable";
import type {
  Method,
  MethodDefinition,
  StreamingMethod,
} from "@/shared/zrpc/core";
import { RpcError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import { prepare } from "@/shared/zrpc/serde";
import { exceptionToStatus, parseOrRpcError } from "@/shared/zrpc/util";
import { Status } from "@grpc/grpc-js/build/src/constants";
import { throwIfAborted } from "abort-controller-x";
import { ok } from "assert";
import { isFunction } from "lodash";
import type { ZodTypeAny, z } from "zod";

export interface WebSocketConnection {
  userId: BiomesId;
  authType: WebSocketAuthType;
  serverSessionId: string;
  clientSessionId: string;

  sendData(
    pathOrData:
      | string
      | [reqId: number, payload: unknown]
      | [path: string, payload: unknown]
      | [reqId: number, status: grpc.status, details: string]
  ): Promise<void>;
}

// An inflight call, only used once.
export class WebSocketCall {
  public readonly context: WebSocketRpcContext;
  private readonly controller = new UnboundedAbortController();
  private inflight: Promise<unknown> = Promise.resolve();

  constructor(
    signal: AbortSignal | undefined,
    private readonly conn: WebSocketConnection,
    private readonly reqId: number,
    private readonly path: string,
    public readonly request: Consumable<any>
  ) {
    chain(this.controller, signal);
    this.context = new WebSocketRpcContext(conn, this.controller.signal);
  }

  // Write a response, can be called many times for streaming responses.
  async write(response: any) {
    if (!this.controller.aborted) {
      return this.conn.sendData([this.reqId, prepare(response)]);
    }
  }

  // Send a status code, this terminates the call.
  async status(status: grpc.status, details?: string) {
    if (this.controller.aborted) {
      return;
    }
    this.controller.abort();
    try {
      await this.conn.sendData([this.reqId, status, details ?? ""]);
    } catch (error) {
      if (grpc.isStatusObject(error) && error.code === grpc.status.CANCELLED) {
        // It was cancelled, that's fine.
        return;
      }
      log.warn(
        `${this.path ?? "unknown"}: Could not send ${grpc.status[status]}${
          details !== undefined ? `: ${details}` : ""
        }`,
        { error }
      );
    }
  }

  async abort() {
    // Just in case the operation refuses to listen to the signal
    // handler, lets report it as cancelled so the client responds
    // quickly.
    await this.status(grpc.status.CANCELLED, "The operation was cancelled");
    try {
      await this.inflight;
    } catch (_) {
      // `this.inflight` is also being awaited on elsewhere, which is where
      // we'll properly handle errors, however over here we just want to make
      // sure it's completed.
    }
  }

  // Run the given call rountine under the given path, incrementing
  // appropriate counters.
  async run(path: string, handler?: WebSocketCallHandler) {
    try {
      if (handler === undefined || !isFunction(handler)) {
        throw new RpcError(grpc.status.UNIMPLEMENTED);
      }
      if (this.controller.aborted) {
        return;
      }
      this.inflight = handler(this);
      await this.inflight;
      this.controller.abort();
    } catch (error: any) {
      const status = exceptionToStatus(path, error);
      errorStat.inc({
        path,
        code: Status[status.code],
      });
      await this.status(status.code, status.details);
    }
  }
}

export type WebSocketCallHandler = (call: WebSocketCall) => Promise<void>;

export type WebSocketServiceImplementation = {
  [key: string]: WebSocketCallHandler;
};

export function createUnaryHandler<
  TZodRequest extends ZodTypeAny,
  TZodResponse extends ZodTypeAny
>(
  definition: MethodDefinition<TZodRequest, TZodResponse>,
  implementation: Method<
    WebSocketRpcContext,
    z.infer<TZodRequest>,
    z.infer<TZodResponse>
  >
): WebSocketCallHandler {
  return async (call: WebSocketCall) => {
    const resultPromise = implementation(
      call.context,
      parseOrRpcError(definition.requestType, call.request.consume())
    );
    if (!definition.oneWay) {
      await call.write(await resultPromise);
    }
  };
}

export function createStreamingHandler<
  TZodRequest extends ZodTypeAny,
  TZodResponse extends ZodTypeAny
>(
  definition: MethodDefinition<TZodRequest, TZodResponse>,
  implementation: StreamingMethod<
    WebSocketRpcContext,
    z.infer<TZodRequest>,
    z.infer<TZodResponse>
  >
): WebSocketCallHandler {
  return async (call: WebSocketCall) => {
    for await (const response of implementation(
      call.context,
      parseOrRpcError(definition.requestType, call.request.consume())
    )) {
      // Even if the implementation doesn't terminate, we can.
      throwIfAborted(call.context.signal);
      ok(
        response !== undefined,
        "Streaming method returned undefined, this will be interperted as a stream end."
      );
      await call.write(response);
    }
    await call.write(undefined);
  };
}
