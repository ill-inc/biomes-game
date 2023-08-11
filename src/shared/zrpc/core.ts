import type * as grpc from "@/shared/zrpc/grpc";
import { ok } from "assert";
import type TypedEventEmitter from "typed-emitter";
import type { z, ZodTypeAny } from "zod";

export const VALID_PATH = /\/[^/]+\/[^/]+/;

export interface RpcContext {
  signal: AbortSignal;
}

export type Method<TContext extends RpcContext, TRequest, TResponse> = (
  context: TContext,
  request: TRequest
) => Promise<TResponse>;
export type UntypedMethod<TContext extends RpcContext = any> = Method<
  TContext,
  any,
  any
>;
export type UntypedMethods<TContext extends RpcContext = any> = Record<
  string,
  UntypedMethod<TContext>
>;

export type StreamingMethod<
  TContext extends RpcContext,
  TRequest,
  TResponse
> = (context: TContext, request: TRequest) => AsyncIterable<TResponse>;
export type UntypedStreamingMethod<TContext extends RpcContext = any> =
  StreamingMethod<TContext, any, any>;
export type UntypedStreamingMethods<TContext extends RpcContext = any> = Record<
  string,
  UntypedStreamingMethod<TContext>
>;

export type RequestType<TMethod> = TMethod extends Method<
  any,
  infer TRequest,
  any
>
  ? TRequest
  : TMethod extends StreamingMethod<any, infer TRequest, any>
  ? TRequest
  : TMethod extends MethodDefinition<infer TRequest, any>
  ? TRequest
  : never;

export type ResponseType<TMethod> = TMethod extends Method<
  any,
  any,
  infer TResponse
>
  ? TResponse
  : TMethod extends StreamingMethod<any, any, infer TResponse>
  ? TResponse
  : TMethod extends MethodDefinition<any, infer TResponse>
  ? TResponse
  : never;

export type MethodDefinition<
  TZodRequest extends ZodTypeAny,
  TZodResponse extends ZodTypeAny
> = grpc.MethodDefinition<Buffer, Buffer> & {
  requestType: TZodRequest;
  responseType: TZodResponse;
  oneWay: boolean;
};

export type ServiceDefinition<
  TMethods extends UntypedMethods,
  TStreamingMethods extends UntypedStreamingMethods
> =
  | {
      [K in keyof TMethods]: MethodDefinition<
        RequestType<TMethods[K]>,
        ResponseType<TMethods[K]>
      >;
    } & {
      [K in keyof TStreamingMethods]: MethodDefinition<
        RequestType<TStreamingMethods[K]>,
        ResponseType<TStreamingMethods[K]>
      >;
    };

export type ServiceImplementation<
  TContext extends RpcContext,
  TMethods extends UntypedMethods,
  TStreamingMethods extends UntypedStreamingMethods
> =
  | {
      [K in keyof TMethods]: Method<
        TContext,
        RequestType<TMethods[K]>,
        ResponseType<TMethods[K]>
      >;
    } & {
      [K in keyof TStreamingMethods]: StreamingMethod<
        TContext,
        RequestType<TStreamingMethods[K]>,
        ResponseType<TStreamingMethods[K]>
      >;
    };

function noOp<T>(v: T) {
  return v;
}

export function createMethodDefinition<
  TZodRequest extends ZodTypeAny,
  TZodResponse extends ZodTypeAny
>(
  path: string,
  requestType: TZodRequest,
  responseType: TZodResponse,
  oneWay: boolean
): MethodDefinition<TZodRequest, TZodResponse> {
  return {
    path,
    requestStream: false,
    responseStream: false,
    responseType,
    requestType,
    oneWay,
    // In order to avoid issues, we embed only Buffers in request
    // and response and handle deserialization ourselves.
    requestSerialize: noOp,
    requestDeserialize: noOp,
    responseSerialize: noOp,
    responseDeserialize: noOp,
  };
}

export class ServiceDescription<
  TMethods extends UntypedMethods = {},
  TStreamingMethods extends UntypedStreamingMethods = {}
> {
  constructor(
    public readonly serviceName: string,
    public readonly definition: ServiceDefinition<TMethods, TStreamingMethods>
  ) {}

  extend<
    TOtherMethods extends UntypedMethods,
    TOtherStreamingMethods extends UntypedStreamingMethods
  >(other: ServiceDescription<TOtherMethods, TOtherStreamingMethods>) {
    type TNewMethods = TMethods & TOtherMethods;
    type TNewStreamingMethods = TStreamingMethods & TOtherStreamingMethods;
    return new ServiceDescription<TNewMethods, TNewStreamingMethods>(
      this.serviceName,
      {
        ...this.definition,
        ...other.definition,
      } as ServiceDefinition<TNewMethods, TNewStreamingMethods>
    );
  }

  private createMethodDefinition<
    TZodRequest extends ZodTypeAny,
    TZodResponse extends ZodTypeAny
  >(
    methodName: string,
    requestType: TZodRequest,
    responseType: TZodResponse,
    oneWay: boolean
  ): MethodDefinition<TZodRequest, TZodResponse> {
    ok(methodName.match(/^[a-z][a-zA-Z0-9]*$/));
    ok(!Object.hasOwn(this.definition, methodName));
    return createMethodDefinition(
      `/${this.serviceName}/${methodName}`,
      requestType,
      responseType,
      oneWay
    );
  }

  addStreamingRpc<
    TName extends string,
    TZodRequest extends ZodTypeAny,
    TZodResponse extends ZodTypeAny
  >(methodName: TName, requestType: TZodRequest, responseType: TZodResponse) {
    type TRequest = z.infer<TZodRequest>;
    type TResponse = z.infer<TZodResponse>;
    type TNewStreamingMethods = TStreamingMethods &
      Record<TName, StreamingMethod<any, TRequest, TResponse>>;
    return new ServiceDescription<TMethods, TNewStreamingMethods>(
      this.serviceName,
      {
        ...this.definition,
        [methodName]: {
          ...this.createMethodDefinition(
            methodName,
            requestType,
            responseType,
            false
          ),
          responseStream: true,
        },
      }
    );
  }

  addRpc<
    TName extends string,
    TZodRequest extends ZodTypeAny,
    TZodResponse extends ZodTypeAny
  >(
    methodName: TName,
    requestType: TZodRequest,
    responseType: TZodResponse,
    options?: {
      // Whether this is a one-way RPC that doesn't expect or need response.
      // Default = false.
      oneWay?: boolean;
    }
  ) {
    type TRequest = z.infer<TZodRequest>;
    type TResponse = z.infer<TZodResponse>;
    type TNewMethods = TMethods &
      Record<TName, Method<any, TRequest, TResponse>>;
    return new ServiceDescription<TNewMethods, TStreamingMethods>(
      this.serviceName,
      {
        ...this.definition,
        [methodName]: this.createMethodDefinition(
          methodName,
          requestType,
          responseType,
          options?.oneWay ?? false
        ),
      }
    );
  }
}
export interface BaseClient {
  address: string;
  close: () => Promise<void>;
  waitForReady: (timeoutMs: number, signal?: AbortSignal) => Promise<boolean>;
}

export type ClientStreamingMethod<TDefinition> = (
  request: RequestType<TDefinition>,
  abort?: AbortSignal
) => AsyncIterable<ResponseType<TDefinition>>;

export type Client<
  TMethods extends UntypedMethods,
  TStreamingMethods extends UntypedStreamingMethods
> = {
  [K in keyof TMethods]: (
    request: RequestType<TMethods[K]>,
    abort?: AbortSignal
  ) => Promise<ResponseType<TMethods[K]>>;
} & {
  [K in keyof TStreamingMethods]: ClientStreamingMethod<TStreamingMethods[K]>;
} & BaseClient;

export type ZClient<TService> = TService extends ServiceDescription<
  infer TMethods,
  infer TStreamingMethods
>
  ? Client<TMethods, TStreamingMethods>
  : never;

export type WsSocketState =
  // The socket is currently disconnected, either startup or shutdown.
  | "disconnected"
  // The socket has opened and is beginning its connection to server.
  | "connecting"
  // We're waiting on an initial heartbeat config from the server.
  | "waitingOnHeartbeat"
  // We had trouble on the socket, so disconnected and waiting to reconnect.
  | "reconnecting"
  // We had trouble on the socket, so disconnected and waiting to reconnect.
  | "interrupted"
  // The socket has begun shutting down due to a close() call.
  | "closing"
  // The socket's ready for business.
  | "ready";

// It's been a while since we heard from the server, but we're still open.
export type WsSocketStatus = WsSocketState | "unhealthy";

export function willEverBeReady(state: WsSocketStatus) {
  switch (state) {
    case "disconnected":
    case "closing":
      return false;
  }
  return true;
}

export type WebSocketChannelEvents = {
  status: (state: WsSocketStatus) => void;
  lameDuck: () => void;
  serverRequestsReload: () => void;
};

export interface WebSocketChannelStats {
  readonly status: WsSocketStatus;
  readonly sentMessages: number;
  readonly sentBytes: number;
  readonly receivedBytes: number;
  readonly receivedMessages: number;
}

export function emptyChannelStats(): WebSocketChannelStats {
  return {
    status: "connecting",
    sentMessages: 0,
    sentBytes: 0,
    receivedBytes: 0,
    receivedMessages: 0,
  };
}

export interface WebSocketChannel
  extends TypedEventEmitter<WebSocketChannelEvents>,
    WebSocketChannelStats {
  readonly id: string;
  readonly clientSessionId: string;
  readonly serverSessionId?: string;
}

export interface BaseWebSocketClient extends BaseClient {
  readonly channel: WebSocketChannel;
}

export type WebSocketClient<
  TMethods extends UntypedMethods,
  TStreamingMethods extends UntypedStreamingMethods
> = Client<TMethods, TStreamingMethods> & BaseWebSocketClient;

export type ZWebSocketClient<TService> = TService extends ServiceDescription<
  infer TMethods,
  infer TStreamingMethods
>
  ? WebSocketClient<TMethods, TStreamingMethods>
  : never;
