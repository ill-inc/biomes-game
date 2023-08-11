import {
  errorStat,
  inflightRequestStat,
  latencyStat,
  requestStat,
} from "@/server/shared/zrpc/stats";
import { log } from "@/shared/logging";
import { Timer } from "@/shared/metrics/timer";
import type {
  Client,
  Method,
  MethodDefinition,
  RequestType,
  ResponseType,
  RpcContext,
  ServiceDescription,
  ServiceImplementation,
  StreamingMethod,
  UntypedMethods,
  UntypedStreamingMethods,
} from "@/shared/zrpc/core";
import * as grpc from "@/shared/zrpc/grpc";
import { zrpcDeserialize, zrpcSerialize } from "@/shared/zrpc/serde";
import { exceptionToStatus } from "@/shared/zrpc/util";
import type {
  UntypedServiceImplementation,
  handleServerStreamingCall,
  handleUnaryCall,
} from "@grpc/grpc-js";
import { Server, ServerCredentials } from "@grpc/grpc-js";
import type { Status } from "@grpc/grpc-js/build/src/constants";
import type { HandleCall } from "@grpc/grpc-js/build/src/server-call";
import { isAbortError, waitForEvent } from "abort-controller-x";
import { ok } from "assert";
import { mapValues } from "lodash";
import type { ZodTypeAny, z } from "zod";

// Time the server will let things gracefully shutdown before becoming forceful.
const LAME_DUCK_TIMEOUT = 1000;

function createStreamingHandler<
  TZodRequest extends ZodTypeAny,
  TZodResponse extends ZodTypeAny
>(
  methodDefinition: MethodDefinition<TZodRequest, TZodResponse>,
  methodImplementation: StreamingMethod<
    RpcContext,
    z.infer<TZodRequest>,
    z.infer<TZodResponse>
  >
): handleServerStreamingCall<Buffer, Buffer> {
  return (call) => {
    const metricLabels = { path: methodDefinition.path };
    requestStat.inc(metricLabels);
    inflightRequestStat.inc(metricLabels);
    const timer = new Timer();
    const controller = new AbortController();
    const context = {
      signal: controller.signal,
    };
    call.on("cancelled", () => {
      controller.abort("client requested cancellation");
    });

    void (async () => {
      try {
        const request = zrpcDeserialize(
          call.request,
          methodDefinition.requestType
        );
        const iterable = methodImplementation(context, request);
        const iterator = iterable[Symbol.asyncIterator]();

        let result = await iterator.next();
        while (!result.done) {
          try {
            const shouldContinue = call.write(zrpcSerialize(result.value));
            if (!shouldContinue) {
              await waitForEvent(controller.signal, call, "drain");
            }
          } catch (err) {
            result = (isAbortError(err)
              ? await iterator.return?.()
              : await iterator.throw?.(err)) ?? {
              done: true,
              value: undefined,
            };
            continue;
          }
          result = await iterator.next();
        }
        call.end();
      } catch (error) {
        const status = exceptionToStatus(methodDefinition.path, error);
        errorStat.inc({
          path: methodDefinition.path,
          code: grpc.status[status.code],
        });
        call.destroy(status);
      } finally {
        inflightRequestStat.dec(metricLabels);
        latencyStat.observe(metricLabels, timer.elapsed);
      }
    })();
  };
}

function createUnaryHandler<
  TZodRequest extends ZodTypeAny,
  TZodResponse extends ZodTypeAny
>(
  methodDefinition: MethodDefinition<TZodRequest, TZodResponse>,
  methodImplementation: Method<
    RpcContext,
    z.infer<TZodRequest>,
    z.infer<TZodResponse>
  >
): handleUnaryCall<Buffer, Buffer> {
  return (call, callback) => {
    const metricLabels = { path: methodDefinition.path };
    requestStat.inc(metricLabels);
    inflightRequestStat.inc(metricLabels);
    const timer = new Timer();
    const controller = new AbortController();
    const context = {
      signal: controller.signal,
    };
    call.on("cancelled", () => {
      controller.abort("client requested cancellation");
    });

    void (async () => {
      try {
        const request = zrpcDeserialize(
          call.request,
          methodDefinition.requestType
        );
        const result = await methodImplementation(context, request);
        callback(null, zrpcSerialize(result));
      } catch (error) {
        const status = exceptionToStatus(methodDefinition.path, error);
        errorStat.inc({
          path: methodDefinition.path,
          code: grpc.status[status.code],
        });
        callback(
          {
            name: grpc.status[status.code],
            message: status.message,
            code: status.code as unknown as Status,
            metadata: call.metadata,
          },
          null
        );
      } finally {
        inflightRequestStat.dec(metricLabels);
        latencyStat.observe(metricLabels, timer.elapsed);
      }
    })();
  };
}

export function makeClientFromImplementation<
  TMethods extends UntypedMethods<RpcContext>,
  TStreamingMethods extends UntypedStreamingMethods<RpcContext>
>(
  service: ServiceDescription<TMethods, TStreamingMethods>,
  implementation: ServiceImplementation<RpcContext, TMethods, TStreamingMethods>
): Client<TMethods, TStreamingMethods> {
  return {
    ...mapValues(service.definition, (methodDefinition, methodName) => {
      return (
        request: z.infer<typeof methodDefinition.requestType>,
        signal?: AbortSignal
      ) => {
        return implementation[methodName](
          { signal: signal ?? new AbortController().signal },
          request
        );
      };
    }),
    close: async () => {},
    waitForReady: async (_timeoutMs?: number, _signal?: AbortSignal) => true,
  } as Client<TMethods, TStreamingMethods>;
}

export class ZrpcServer {
  private readonly server: Server;
  private started = false;

  constructor(options?: grpc.ChannelOptions) {
    this.server = new Server(
      options ??
        (process.env.NODE_ENV === "production"
          ? {}
          : {
              "grpc.max_receive_message_length": -1,
              "grpc.max_send_message_length": -1,
            })
    );
  }

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
    ok(!this.started, "cannot install services after server has started");
    this.server.addService(
      service.definition,
      mapValues(
        service.definition,
        (methodDefinition, methodName): HandleCall<Buffer, Buffer> => {
          const methodImplementation =
            implementation[methodName]?.bind(implementation);
          ok(
            methodImplementation,
            `Missing implementation for ${service.serviceName}.${methodName}`
          );
          ok(
            !methodDefinition.requestStream,
            "Client streaming not supported."
          );
          if (methodDefinition.responseStream) {
            return createStreamingHandler(
              methodDefinition as MethodDefinition<
                RequestType<TStreamingMethods[string]>,
                ResponseType<TStreamingMethods[string]>
              >,
              methodImplementation
            );
          } else {
            return createUnaryHandler(
              methodDefinition as MethodDefinition<
                RequestType<TMethods[string]>,
                ResponseType<TMethods[string]>
              >,
              methodImplementation
            );
          }
        }
        // Type inference, for wierd reasons, thinks the above is a Dictionary[boolean] not
        // Dictionary[HandleCall]. So force it.
      ) as unknown as UntypedServiceImplementation
    );
  }

  start(port: number = 0): Promise<number> {
    this.started = true;
    ok(port >= 0);
    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        `0.0.0.0:${port}`,
        ServerCredentials.createInsecure(),
        (error, port) => {
          if (error) {
            reject(error);
          } else if (port < 0) {
            reject(new Error(`Failed to bind to port: ${port}`));
          } else {
            log.info(`> zRPC listening on port ${port}`);
            this.server.start();
            resolve(port);
          }
        }
      );
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.tryShutdown(() => resolve());
      setTimeout(() => this.server.forceShutdown(), LAME_DUCK_TIMEOUT);
    });
  }
}

export async function registerRpcServer(
  options?: grpc.ChannelOptions
): Promise<ZrpcServer> {
  return new ZrpcServer(options);
}
