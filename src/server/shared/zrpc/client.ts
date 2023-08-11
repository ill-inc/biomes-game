import { log } from "@/shared/logging";
import { ClientRequestStatRecorder } from "@/shared/zrpc/client_stats";
import type {
  Client,
  MethodDefinition,
  RequestType,
  ResponseType,
  ServiceDescription,
  UntypedMethods,
  UntypedStreamingMethods,
} from "@/shared/zrpc/core";
import type { RpcClientError } from "@/shared/zrpc/errors";
import { wrapClientError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import { zrpcDeserialize, zrpcSerialize } from "@/shared/zrpc/serde";
import type { ChannelCredentials } from "@grpc/grpc-js";
import {
  Client as GrpcClient,
  Metadata,
  credentials as gRpcCredentials,
} from "@grpc/grpc-js";
import { mapValues } from "lodash";
import type { ZodTypeAny, z } from "zod";

function createMetadata(): Metadata {
  const metadata = new Metadata({
    waitForReady: true,
  });
  return metadata;
}

function createStreamingCaller<
  TZodRequest extends ZodTypeAny,
  TZodResponse extends ZodTypeAny
>(
  client: GrpcClient,
  methodDefinition: MethodDefinition<TZodRequest, TZodResponse>
) {
  return async function* makeStreamingCall(
    request: z.infer<TZodRequest>,
    signal?: AbortSignal
  ): AsyncGenerator<z.infer<TZodResponse>, void, undefined> {
    const recorder = new ClientRequestStatRecorder(methodDefinition.path);
    const call = client.makeServerStreamRequest(
      methodDefinition.path,
      methodDefinition.requestSerialize,
      methodDefinition.responseDeserialize,
      zrpcSerialize(request),
      createMetadata()
    );
    let aborted = false;
    const onAbort = () => {
      aborted = true;
      call.cancel();
    };

    signal?.addEventListener("abort", onAbort);
    try {
      for await (const value of call) {
        recorder.gotResponse();
        yield zrpcDeserialize(value, methodDefinition.responseType);
      }
    } catch (error) {
      const status = wrapClientError(error, methodDefinition.path);
      recorder.error(status.code);
      if (!aborted) {
        logGrpcError(methodDefinition.path, status);
        throw status;
      }
    } finally {
      signal?.removeEventListener("abort", onAbort);
      onAbort();
      recorder.end();
    }
  };
}

function createUnaryCaller<
  TZodRequest extends ZodTypeAny,
  TZodResponse extends ZodTypeAny
>(
  client: GrpcClient,
  methodDefinition: MethodDefinition<TZodRequest, TZodResponse>
) {
  return async function (
    request: z.infer<TZodRequest>,
    signal?: AbortSignal
  ): Promise<z.infer<TZodResponse>> {
    const recorder = new ClientRequestStatRecorder(methodDefinition.path);
    const [error, value] = await new Promise<[any, Buffer | undefined]>(
      function makeUnaryCall(resolve) {
        const onAbort = () => call?.cancel();
        signal?.addEventListener("abort", onAbort);
        const call = client.makeUnaryRequest(
          methodDefinition.path,
          methodDefinition.requestSerialize,
          methodDefinition.responseDeserialize,
          zrpcSerialize(request),
          createMetadata(),
          (error, value) => {
            signal?.removeEventListener("abort", onAbort);
            onAbort();
            recorder.end();
            resolve([error, value]);
          }
        );
      }
    );

    if (error) {
      const status = wrapClientError(error, methodDefinition.path);
      logGrpcError(methodDefinition.path, status);
      recorder.error(status.code);
      throw status;
    } else {
      recorder.gotResponse();
    }
    return zrpcDeserialize(value!, methodDefinition.responseType);
  };
}

function logGrpcError(path: string, error: RpcClientError) {
  if (
    process.env.NODE_ENV !== "production" &&
    error.code === grpc.status.UNAVAILABLE
  ) {
    return; // Ignore unavailable errors in dev.
  }
  log.warn(
    `${path} ${grpc.status[error.code]}: ${error.details ?? error.message}`
  );
}

const DEFAULT_OPTIONS: Partial<grpc.ChannelOptions> =
  process.env.NODE_ENV === "production"
    ? {
        // Setup some default keepalive checks so that we can fail fast in the case
        // that a connection goes bad (e.g. during a re-deploy) and potentially avoid
        // more difficult-to-decipher errors.
        //   Reference discussions:
        //     - https://github.com/grpc/grpc-node/issues/1769#issuecomment-902053418
        //     - https://github.com/grpc/grpc-node/issues/1747
        "grpc.keepalive_time_ms": 5000,
        "grpc.keepalive_timeout_ms": 10000,
      }
    : {
        "grpc.max_receive_message_length": -1,
        "grpc.max_send_message_length": -1,
      };

export function makeClient<
  TMethods extends UntypedMethods,
  TStreamingMethods extends UntypedStreamingMethods
>(
  service: ServiceDescription<TMethods, TStreamingMethods>,
  address: string,
  credentials?: ChannelCredentials,
  options: Partial<grpc.ChannelOptions> = DEFAULT_OPTIONS
): Client<TMethods, TStreamingMethods> {
  // Note, we default to insecure credentials as in production we use linkerd service
  // mesh which is providing mTLS between nodes - so encryption isn't inherently needed
  // That said, we do nothing to validate identity of the remote end and so for now
  // are assuming network (in-cluster) access is sufficient authority.
  const grpcClient = new GrpcClient(
    address,
    credentials ?? gRpcCredentials.createInsecure(),
    options
  );
  return {
    address,
    ...mapValues(service.definition, (methodDefinition) => {
      if (methodDefinition.responseStream) {
        return createStreamingCaller(
          grpcClient,
          methodDefinition as MethodDefinition<
            RequestType<TStreamingMethods[string]>,
            ResponseType<TStreamingMethods[string]>
          >
        );
      } else {
        return createUnaryCaller(
          grpcClient,
          methodDefinition as MethodDefinition<
            RequestType<TMethods[string]>,
            ResponseType<TMethods[string]>
          >
        );
      }
    }),
    close: () => grpcClient.close(),
    waitForReady: (timeoutMs: number, signal?: AbortSignal) =>
      new Promise<boolean>((resolve) => {
        let ready = false;
        const done = () => {
          resolve(ready);
          signal?.removeEventListener("abort", done);
        };
        grpcClient.waitForReady(timeoutMs, (error) => {
          ready = error === undefined;
          done();
        });
        signal?.addEventListener("abort", done);
      }),
  } as Client<TMethods, TStreamingMethods>;
}
