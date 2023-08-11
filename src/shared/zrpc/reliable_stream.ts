import { ChainableAbortController } from "@/shared/abort";
import { log } from "@/shared/logging";
import { createCounter } from "@/shared/metrics/metrics";
import { sleep } from "@/shared/util/async";
import { RpcClientError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";

// Backoff is initially immediate, and then will use exponential backoff
// with a jitter up to the below maximum.
interface ReliableStreamConfig {
  readonly baseMs: number;
  readonly exponent: number;
  readonly maxMs: number;
  readonly jitterMs: number;
}

const BACKOFF_CONFIG: ReliableStreamConfig = {
  baseMs: 100,
  exponent: 2,
  maxMs: 2500,
  jitterMs: 100,
};

// Codes that indicate temporary issues, and so requests returning these can
// be retried.
const TEMPORARY_ERROR_CODES = [
  // Server likely cancelled as part of shutdown, just backoff and
  // reconect, it's fine to do so.
  grpc.status.CANCELLED,
  // Our servers have a concept of connected but not yet available,
  // just backoff and reconnect.
  grpc.status.UNAVAILABLE,
];

// Error codes that even a reliable stream wont retry.
const FATAL_ERROR_CODES = [
  // We're likely stale, so shouldn't bother retrying.
  grpc.status.INVALID_ARGUMENT,
  // We're trying too much, so don't retry.
  grpc.status.RESOURCE_EXHAUSTED,
  // We're not authorized, so don't retry.
  grpc.status.PERMISSION_DENIED,
];

const errors = createCounter({
  name: "reliable_stream_disconnect",
  help: "Reasons reliable streams were forced to reconnect",
  labelNames: ["name", "code"],
});

async function handleError(
  name: string,
  error: any,
  stack: any,
  backoffMs: number,
  signal: AbortSignal
): Promise<number> {
  if (error instanceof RpcClientError) {
    errors.inc({ name, code: grpc.status[error.code] });
    if (FATAL_ERROR_CODES.includes(error.code)) {
      throw error;
    } else if (!TEMPORARY_ERROR_CODES.includes(error.code)) {
      log.error(`${name} unexpected status ${grpc.status[error.code]}`, {
        error,
        stack,
      });
    }
  } else {
    log.error(`${name} unexpected error`, {
      error,
      stack,
    });
  }
  if (backoffMs === 0) {
    return BACKOFF_CONFIG.baseMs;
  } else {
    await sleep(backoffMs, signal);
    return Math.min(
      backoffMs * BACKOFF_CONFIG.exponent +
        Math.random() * BACKOFF_CONFIG.jitterMs,
      BACKOFF_CONFIG.maxMs
    );
  }
}

export async function* reliableStream<TRequest, TResponse>(
  name: string,
  method: (request: TRequest, signal: AbortSignal) => AsyncIterable<TResponse>,
  makeRequest: () => Promise<TRequest | undefined>,
  streamSignal?: AbortSignal
): AsyncIterable<TResponse> {
  log.info(`${name} reliable stream starting...`);
  const stack = new Error().stack;
  let backoffMs = 0;
  let hadResultAfterRestart = true;
  const controller = new ChainableAbortController().chain(streamSignal);
  try {
    while (!controller.aborted) {
      try {
        const request = await makeRequest();
        if (controller.aborted || request === undefined) {
          return;
        }
        for await (const result of method(request, controller.signal)) {
          backoffMs = 0;
          if (!hadResultAfterRestart) {
            log.info(`${name} reconnected...`);
            hadResultAfterRestart = true;
          }
          yield result;
        }
      } catch (error: any) {
        if (controller.signal.aborted) {
          break;
        }
        backoffMs = await handleError(
          name,
          error,
          stack,
          backoffMs,
          controller.signal
        );
        hadResultAfterRestart = false;
      }
    }
    log.info(
      `${name} reliable stream ended${controller.aborted ? " (aborted)" : ""}`
    );
  } catch (error: any) {
    log.error(`${name} reliable stream failed with fatal error`, { error });
    throw error;
  } finally {
    controller.abort();
  }
}
