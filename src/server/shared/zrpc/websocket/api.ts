import type { WebSocketRpcContext } from "@/server/shared/zrpc/server_types";
import type {
  ServiceDescription,
  ServiceImplementation,
  UntypedMethods,
  UntypedStreamingMethods,
} from "@/shared/zrpc/core";

export interface WebSocketZrpcServerLike {
  readonly port: number;
  readonly ready: boolean;

  start(port: number): Promise<void>;
  stop(): Promise<void>;

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
  ): void;

  forceReloadClients(): Promise<void>;
  lameDuck(): Promise<void>;
}
