import { BackgroundTaskController } from "@/shared/abort";
import { log } from "@/shared/logging";
import { mapMap } from "@/shared/util/collections";
import { Consumable } from "@/shared/util/consumable";
import {
  VALID_PATH,
  type Method,
  type MethodDefinition,
  type RpcContext,
  type ServiceDescription,
  type ServiceImplementation,
  type StreamingMethod,
  type UntypedMethods,
  type UntypedStreamingMethods,
} from "@/shared/zrpc/core";
import { RpcError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import type { MessagePortLike } from "@/shared/zrpc/messageport";
import { prepare } from "@/shared/zrpc/serde";
import { exceptionToStatus, parseOrRpcError } from "@/shared/zrpc/util";
import { throwIfAborted } from "abort-controller-x";
import { ok } from "assert";
import { isFunction } from "lodash";
import type { ZodTypeAny, z } from "zod";

// An in-flight call as exposed to the server implementation.
interface MessagePortCall {
  readonly context: RpcContext;
  readonly request: Consumable<unknown>;
  // Write a given response, for streaming calls 'undefined' is the
  // end of the stream. Returns true if the stream is still available.
  write(response: unknown): void;
  // Terminate the stream with an error.
  status(status: grpc.status, details?: string): void;
}

type MessagePortCallHandler = (call: MessagePortCall) => Promise<void>;

type MessagePortServiceImplementation = {
  [key: string]: MessagePortCallHandler;
};

// An inflight call, only used once.
class InternalMessagePortCall implements MessagePortCall {
  private readonly controller = new AbortController();
  public readonly context: RpcContext = { signal: this.controller.signal };
  private inflight: Promise<unknown> = Promise.resolve();

  constructor(
    private port: MessagePortLike,
    private readonly reqId: number,
    private readonly path: string,
    public readonly request: Consumable<unknown>
  ) {}

  // Write a response, can be called many times for streaming responses.
  async write(response: any) {
    if (this.controller.signal.aborted) {
      return;
    }
    return this.port.postMessage([this.reqId, prepare(response)]);
  }

  // Send a status code, this terminates the call.
  status(status: grpc.status, details?: string) {
    if (this.controller.signal.aborted) {
      return;
    }
    this.controller.abort();
    try {
      this.port.postMessage([this.reqId, status, details ?? ""]);
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
    this.status(grpc.status.CANCELLED, "The operation was cancelled");
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
  async run(path: string, handler?: MessagePortCallHandler) {
    try {
      if (handler === undefined || !isFunction(handler)) {
        throw new RpcError(grpc.status.UNIMPLEMENTED);
      }
      if (this.controller.signal.aborted) {
        return;
      }
      this.inflight = handler(this);
      await this.inflight;
    } catch (error: any) {
      const status = exceptionToStatus(path, error);
      this.status(status.code, status.details);
    }
  }
}

interface ValidatedMessage {
  reqId: number;
  status?: grpc.status;
  path?: string;
  request: Consumable<any>;
}

function createUnaryHandler<
  TZodRequest extends ZodTypeAny,
  TZodResponse extends ZodTypeAny
>(
  definition: MethodDefinition<TZodRequest, TZodResponse>,
  implementation: Method<
    RpcContext,
    z.infer<TZodRequest>,
    z.infer<TZodResponse>
  >
): MessagePortCallHandler {
  return async (call: MessagePortCall) => {
    const resultPromise = implementation(
      call.context,
      parseOrRpcError(definition.requestType, call.request.consume())
    );
    if (!definition.oneWay) {
      call.write(await resultPromise);
    }
  };
}

function createStreamingHandler<
  TZodRequest extends ZodTypeAny,
  TZodResponse extends ZodTypeAny
>(
  definition: MethodDefinition<TZodRequest, TZodResponse>,
  implementation: StreamingMethod<
    RpcContext,
    z.infer<TZodRequest>,
    z.infer<TZodResponse>
  >
): MessagePortCallHandler {
  return async (call: MessagePortCall) => {
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
      call.write(response);
    }
    call.write(undefined);
  };
}

function validateMessage(
  message: MessageEvent<unknown>
): ValidatedMessage | undefined {
  const data = message.data ?? message;
  if (!data) {
    return;
  }
  if (!Array.isArray(data)) {
    log.warn(`Unexpected data type: ${typeof data}`);
    return;
  }
  if (data.length !== 2 && data.length !== 3) {
    log.warn(`Unexpected data length: ${data.length}`);
    return;
  }
  const [reqId, statusOrPath, request] = data;
  if (typeof reqId !== "number") {
    log.warn("Invalid request-ID");
    return;
  }
  const status = grpc.unknownToStatus(statusOrPath);
  let path: string | undefined;
  if (status === undefined) {
    if (typeof statusOrPath !== "string") {
      log.warn(`Invalid request type: ${typeof statusOrPath}`);
      return;
    }
    path = statusOrPath;
  }
  return {
    reqId,
    status,
    path,
    request: new Consumable(request),
  };
}

// Socket server to support a zRPC implementation run over a conventional
// websocket connection.
export class MessagePortZrpcServer {
  private readonly controller = new BackgroundTaskController();
  private readonly implementation: MessagePortServiceImplementation = {};
  private readonly calls = new Map<number, InternalMessagePortCall>();

  constructor(private readonly port: MessagePortLike) {
    port.on("message", this.onMessage);
  }

  private async onStatusMessage(
    status: grpc.status,
    call?: InternalMessagePortCall
  ) {
    if (status !== grpc.status.CANCELLED) {
      log.warn(`Unexpected call status ${status}`);
      // Ignore it.
      return;
    }
    await call?.abort();
  }

  private async handleRequest({
    reqId,
    status,
    path,
    request,
  }: ValidatedMessage) {
    if (status !== undefined) {
      await this.onStatusMessage(status, this.calls.get(reqId));
      return;
    } else if (path === undefined) {
      return;
    }

    const existing = this.calls.get(reqId);
    if (existing !== undefined) {
      existing.status(grpc.status.INVALID_ARGUMENT, "Reused request ID");
      return;
    }
    const call = new InternalMessagePortCall(this.port, reqId, path, request);
    this.calls.set(reqId, call);
    try {
      await call.run(path, this.implementation[path]);
    } finally {
      this.calls.delete(reqId);
    }
  }

  private onMessage = (message: MessageEvent<unknown>) => {
    const validated = validateMessage(message);
    if (validated) {
      this.controller.runInBackground("handleRequest", () =>
        this.handleRequest(validated)
      );
    }
  };

  install<
    TMethods extends UntypedMethods<RpcContext>,
    TStreamingMethods extends UntypedStreamingMethods<RpcContext>
  >(
    service: ServiceDescription<TMethods, TStreamingMethods>,
    implementation: ServiceImplementation<
      RpcContext,
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
        `Invalid zRPC MessagePort method: ${methodDefinition.path}`
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

  async stop() {
    await Promise.all(mapMap(this.calls, (call) => call.abort()));
    this.port.close();
    this.port.off("message", this.onMessage);
  }
}
