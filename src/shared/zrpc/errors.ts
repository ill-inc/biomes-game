import * as grpc from "@/shared/zrpc/grpc";
import { isAbortError } from "abort-controller-x";

export class RpcError extends Error {
  constructor(
    public readonly code: grpc.status,
    public readonly details?: string
  ) {
    super(`${grpc.status[code]}: ${details}`);
  }
}

export function okOrRpcError(
  condition: any,
  code: grpc.status,
  details?: string
): asserts condition {
  if (!condition) {
    throw new RpcError(code, details);
  }
}

export class RpcClientError extends Error {
  constructor(
    public readonly path: string,
    public readonly code: grpc.status,
    public readonly details: string
  ) {
    super(`${path} ${grpc.status[code]}: ${details}`);
  }
}

export function wrapClientError(error: unknown, path: string): RpcClientError {
  if (error instanceof RpcClientError) {
    return error;
  } else if (grpc.isStatusObject(error)) {
    return new RpcClientError(
      path,
      error.code,
      error.details ?? error.message ?? ""
    );
  } else if (isAbortError(error)) {
    return new RpcClientError(
      path,
      grpc.status.CANCELLED,
      "The operation was cancelled"
    );
  }
  return new RpcClientError(path, grpc.status.UNKNOWN, String(error));
}
