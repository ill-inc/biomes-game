import { log } from "@/shared/logging";
import { Consumable } from "@/shared/util/consumable";
import * as grpc from "@/shared/zrpc/grpc";
import { Packr, unpack } from "msgpackr";

// TODO: These are unreasonably large.
export const ZRPC_MAX_SERVER_PAYLOAD = 10 * 1024 * 1024;
export const ZRPC_MAX_BACKPRESSURE = ZRPC_MAX_SERVER_PAYLOAD * 3; // Default: 64 * 1024;

export const websocketPackr = new Packr({ useRecords: false });

export interface ValidatedMessage {
  reqId: number;
  status?: grpc.status;
  path?: string;
  request: Consumable<any>;
}

// Validate an incoming packet, make sure to trust nothing.
export function validateClientMessage(
  data: Buffer,
  unpackr: (data: Buffer) => any = unpack,
  logContext: object
): ValidatedMessage {
  const decoded = unpackr(data);
  if (
    !Array.isArray(decoded) ||
    (decoded.length !== 3 && decoded.length !== 2)
  ) {
    throw "Invalid framing";
  }
  const [reqId, statusOrPath, request] = decoded;
  if (typeof reqId !== "number") {
    throw "Invalid request-ID";
  }
  const status = grpc.unknownToStatus(statusOrPath);
  let path: string | undefined;
  if (status === undefined) {
    if (typeof statusOrPath !== "string") {
      throw `Invalid request type: ${typeof statusOrPath}`;
    }
    path = statusOrPath;
  }
  if (data.byteLength > CONFIG.wsZrpcMaxMessageSizeBytes) {
    log.warn("Received large message from client", {
      ...logContext,
      path,
      size: data.byteLength,
    });
  }
  return {
    reqId,
    status,
    path,
    request: new Consumable(request),
  };
}
