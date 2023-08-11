import { BackgroundTaskController } from "@/shared/abort";
import { log } from "@/shared/logging";
import { Delayed } from "@/shared/util/async";
import { mapMap } from "@/shared/util/collections";
import { callbackToStream } from "@/shared/zrpc/callback_to_stream";
import { ClientRequestStatRecorder } from "@/shared/zrpc/client_stats";
import type {
  Client,
  RequestType,
  ServiceDescription,
  UntypedMethods,
  UntypedStreamingMethods,
} from "@/shared/zrpc/core";
import { RpcClientError, wrapClientError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import type { MessagePortLike } from "@/shared/zrpc/messageport";
import { prepare } from "@/shared/zrpc/serde";
import { mapValues } from "lodash";
import type { ZodTypeAny, z } from "zod";

export interface MessagePortClientOptions {}

interface CallUpdate extends grpc.StatusObject {
  response?: unknown;
}

interface ValidatedMessage {
  reqId: number;
  error?: {
    code: grpc.status;
    details: string;
  };
  response?: unknown;
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
  const [reqId, response, details] = data;
  if (typeof reqId !== "number") {
    log.warn("Invalid request-ID");
    return;
  }
  if (details !== undefined) {
    const code = grpc.unknownToStatus(response);
    if (code === undefined) {
      log.warn(`Unexpected status type ${typeof response}`);
      return;
    }
    if (typeof details !== "string") {
      log.warn(`Unexpected details ${typeof details}`);
      return;
    }
    return {
      reqId,
      error: {
        code,
        details,
      },
    };
  }
  return { reqId, response };
}

// zRPC over MessagePort.
//
// Possible Client -> Server Messages:
// - [id, status]: Status update for the given request, to terminate it.
// - [id, path, request]: Start request.
// Possible Server -> Client Messages:
// - [id, response]: Response to the given request.
// - [id, status, errorDetails]: Error response to the given request.
//
// Streaming requests are implemented by having the client send to the server a regular request,
// and then it receiving multiple events in return. The server uses 'undefined' as the response
// value to indicate a graceful end of stream.
//
// On close, all in-flight requests are terminated with state CANCELLED.
export class MessagePortZrpcClient {
  private controller = new BackgroundTaskController();
  private readonly inflight = new Map<number, (update: CallUpdate) => void>();
  private reqId = 1;

  constructor(
    private readonly port: MessagePortLike,
    private readonly _options: MessagePortClientOptions = {}
  ) {
    port.on("message", this.onMessage);
    port.start();
  }

  private onMessage = (message: MessageEvent<unknown>) => {
    const validated = validateMessage(message);
    if (!validated) {
      return;
    }
    const { reqId, error, response } = validated;
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
  };

  async close() {
    await this.controller.abortAndWait();
    await Promise.all(
      mapMap(this.inflight, (callback) =>
        callback({
          code: grpc.status.CANCELLED,
          name: "CANCELLED",
          message: `Client closing`,
        })
      )
    );
    this.port.close();
    this.port.off("message", this.onMessage);
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
    this.port.postMessage([id, grpc.status.CANCELLED]);
  }

  async genericRequestStart<TRequest>(
    path: string,
    request: TRequest,
    _signal: AbortSignal | undefined,
    responseHandler: (response: CallUpdate) => void,
    oneWay: boolean
  ): Promise<number> {
    if (this.controller.signal.aborted) {
      responseHandler({
        code: grpc.status.CANCELLED,
        name: "CANCELLED",
        message: "Client closed before send",
      });
    }
    const id = this.reqId++;
    try {
      this.port.postMessage([id, path, prepare(request)]);
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
        message: "No repsonse needed",
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

export function makeMessagePortClient<
  TMethods extends UntypedMethods,
  TStreamingMethods extends UntypedStreamingMethods
>(
  service: ServiceDescription<TMethods, TStreamingMethods>,
  port: MessagePortLike,
  options: MessagePortClientOptions = {}
): Client<TMethods, TStreamingMethods> {
  const client = new MessagePortZrpcClient(port, options);
  return {
    address: "[MessagePort]",
    ...mapValues(service.definition, (methodDefinition) => {
      if (methodDefinition.responseStream) {
        return (
          request: RequestType<TStreamingMethods[string]>,
          signal?: AbortSignal
        ) =>
          client.makeStreamingRequest(
            methodDefinition.path,
            request,
            methodDefinition.responseType,
            signal
          );
      } else {
        return (request: RequestType<TMethods[string]>, signal?: AbortSignal) =>
          client.makeUnaryRequest(
            methodDefinition.path,
            request,
            methodDefinition.responseType,
            signal,
            methodDefinition.oneWay
          );
      }
    }),
    close: () => client.close(),
    waitForReady: async () => true,
  } as Client<TMethods, TStreamingMethods>;
}
