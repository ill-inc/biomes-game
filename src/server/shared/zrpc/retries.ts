import type { BackoffConfig } from "@/shared/util/retry_helpers";
import { asyncBackoffOnRecoverableError } from "@/shared/util/retry_helpers";
import type {
  Client,
  ServiceDescription,
  UntypedMethods,
  UntypedStreamingMethods,
} from "@/shared/zrpc/core";
import { RpcClientError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import { ok } from "assert";
import { mapValues } from "lodash";

// More aggressive than the usual stuff as we're talking about inter-server.
function defaultZrpcBackoffConfig(): BackoffConfig {
  return {
    baseMs: 25,
    maxMs: 500,
    timeoutMs: 10000,
  };
}

// Make a variant of a client that retries unary requests.
export function addRetries<
  TMethods extends UntypedMethods,
  TStreamingMethods extends UntypedStreamingMethods
>(
  service: ServiceDescription<TMethods, TStreamingMethods>,
  client: Client<TMethods, TStreamingMethods>,
  exceptionOkay: (errorOkay: any) => boolean,
  config?: BackoffConfig
): Client<TMethods, TStreamingMethods> {
  config ??= defaultZrpcBackoffConfig();
  return {
    ...mapValues(service.definition, (methodDefinition, methodName) => {
      const clientCall = client[methodName].bind(client);
      ok(!methodDefinition.requestStream);
      if (methodDefinition.responseStream) {
        return clientCall;
      } else {
        return ((request: any, signal?: AbortSignal) =>
          asyncBackoffOnRecoverableError(
            async () => clientCall(request, signal),
            exceptionOkay,
            config
          )) as typeof clientCall;
      }
    }),
    close: () => client.close(),
    waitForReady: (timeoutMs: number, signal?: AbortSignal) =>
      client.waitForReady(timeoutMs, signal),
  } as Client<TMethods, TStreamingMethods>;
}

export function addRetriesForUnavailable<
  TMethods extends UntypedMethods,
  TStreamingMethods extends UntypedStreamingMethods
>(
  service: ServiceDescription<TMethods, TStreamingMethods>,
  client: Client<TMethods, TStreamingMethods>,
  config?: BackoffConfig
): Client<TMethods, TStreamingMethods> {
  return addRetries(
    service,
    client,
    (error) =>
      error instanceof RpcClientError && error.code === grpc.status.UNAVAILABLE,
    config
  );
}
