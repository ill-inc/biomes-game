import { APIError } from "@/shared/api/errors";
import { log } from "@/shared/logging";
import { RpcError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import { isStatusObject } from "@/shared/zrpc/grpc";
import { isAbortError } from "abort-controller-x";
import type { ZodTypeAny, z } from "zod";

export const errorCodeToGrpcStatus = {
  not_found: grpc.status.NOT_FOUND,
  invalid_request: grpc.status.INVALID_ARGUMENT,
  unauthorized: grpc.status.PERMISSION_DENIED,
  bad_param: grpc.status.INVALID_ARGUMENT,
  bad_method: grpc.status.INVALID_ARGUMENT,
  gone: grpc.status.DATA_LOSS,
  internal_error: grpc.status.INTERNAL,
  ecs_error: grpc.status.INTERNAL,
  blockchain_error: grpc.status.INTERNAL,
  killswitched: grpc.status.RESOURCE_EXHAUSTED,
  overloaded: grpc.status.RESOURCE_EXHAUSTED,
  lameduck: grpc.status.RESOURCE_EXHAUSTED,
} as const;

export function exceptionToStatus(path: string, error: any): grpc.StatusObject {
  if (error instanceof RpcError) {
    return {
      name: grpc.status[error.code],
      message: error.message,
      code: error.code,
      details: error.details ?? error.message ?? undefined,
    };
  } else if (error instanceof APIError) {
    const code = errorCodeToGrpcStatus[error.code];
    return {
      name: grpc.status[code],
      message: error.message ?? error.code,
      code,
      details: error.message ?? error.code,
    };
  } else if (isAbortError(error)) {
    return {
      name: "CANCELLED",
      message: "The operation was cancelled",
      code: grpc.status.CANCELLED,
      details: error.message ?? error.name ?? undefined,
    };
  } else if (isStatusObject(error)) {
    return error;
  }
  log.warn(`${path}: Uncaught error in server implementation method.`, {
    error,
  });

  return {
    name: "UNKNOWN",
    message: error.details ?? error.message ?? "Unknown server error occurred",
    code: grpc.status.UNKNOWN,
    details: error.details ?? error.message ?? undefined,
  };
}

export function parseOrRpcError<TZodSchema extends ZodTypeAny>(
  schema: TZodSchema,
  data: any
): z.infer<TZodSchema> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RpcError(
      grpc.status.INVALID_ARGUMENT,
      `Could not deserialize: ${JSON.stringify(
        {
          error: result.error,
        },
        null,
        4
      )}`
    );
  }
  return result.data;
}
