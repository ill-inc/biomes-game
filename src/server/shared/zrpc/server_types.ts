import type { BiomesId } from "@/shared/ids";
import type {
  RpcContext,
  ServiceDescription,
  ServiceImplementation,
} from "@/shared/zrpc/core";

export type ZService<TServiceDescription> =
  TServiceDescription extends ServiceDescription<
    infer TMethods,
    infer TStreamingMethods
  >
    ? ServiceImplementation<RpcContext, TMethods, TStreamingMethods>
    : never;

export type WebSocketAuthType = "unknown" | "user" | "gremlin";

export class WebSocketRpcContext implements RpcContext {
  constructor(
    private readonly ws: {
      userId: BiomesId;
      authType: WebSocketAuthType;
      serverSessionId: string;
      clientSessionId: string;
    },
    public signal: AbortSignal
  ) {}

  get userId(): BiomesId {
    return this.ws.userId;
  }

  get authType(): WebSocketAuthType {
    return this.ws.authType;
  }

  get serverSessionId(): string {
    return this.ws.serverSessionId;
  }

  get clientSessionId(): string {
    return this.ws.clientSessionId;
  }

  get fullId() {
    return `${this.userId}:${this.clientSessionId}:${this.serverSessionId}`;
  }
}

export type ZWebSocketService<TServiceDescription> =
  TServiceDescription extends ServiceDescription<
    infer TMethods,
    infer TStreamingMethods
  >
    ? ServiceImplementation<WebSocketRpcContext, TMethods, TStreamingMethods>
    : never;
