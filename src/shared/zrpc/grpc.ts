import { isInteger } from "lodash";
export interface Serialize<T> {
  (value: T): Buffer;
}
export interface Deserialize<T> {
  (bytes: Buffer): T;
}
export interface ClientMethodDefinition<RequestType, ResponseType> {
  path: string;
  requestStream: boolean;
  responseStream: boolean;
  requestSerialize: Serialize<RequestType>;
  responseDeserialize: Deserialize<ResponseType>;
  originalName?: string;
}
export interface ServerMethodDefinition<RequestType, ResponseType> {
  path: string;
  requestStream: boolean;
  responseStream: boolean;
  responseSerialize: Serialize<ResponseType>;
  requestDeserialize: Deserialize<RequestType>;
  originalName?: string;
}
export interface MethodDefinition<RequestType, ResponseType>
  extends ClientMethodDefinition<RequestType, ResponseType>,
    ServerMethodDefinition<RequestType, ResponseType> {}

export enum status {
  OK = 0,
  CANCELLED = 1,
  UNKNOWN = 2,
  INVALID_ARGUMENT = 3,
  DEADLINE_EXCEEDED = 4,
  NOT_FOUND = 5,
  ALREADY_EXISTS = 6,
  PERMISSION_DENIED = 7,
  RESOURCE_EXHAUSTED = 8,
  FAILED_PRECONDITION = 9,
  ABORTED = 10,
  OUT_OF_RANGE = 11,
  UNIMPLEMENTED = 12,
  INTERNAL = 13,
  UNAVAILABLE = 14,
  DATA_LOSS = 15,
  UNAUTHENTICATED = 16,
}
export interface StatusObject extends Error {
  code: status;
  details?: string;
}

export function unknownToStatus(data: any) {
  if (typeof data !== "number") {
    return undefined;
  }
  if (data < 1 || data > 16 || !isInteger(data)) {
    return undefined;
  }
  return data as status;
}
export function isStatusObject(obj: any): obj is StatusObject {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.code === "number" &&
    (obj.details === undefined || typeof obj.details === "string")
  );
}
export interface ChannelOptions {
  "grpc.ssl_target_name_override"?: string;
  "grpc.primary_user_agent"?: string;
  "grpc.secondary_user_agent"?: string;
  "grpc.default_authority"?: string;
  "grpc.keepalive_time_ms"?: number;
  "grpc.keepalive_timeout_ms"?: number;
  "grpc.keepalive_permit_without_calls"?: number;
  "grpc.service_config"?: string;
  "grpc.max_concurrent_streams"?: number;
  "grpc.initial_reconnect_backoff_ms"?: number;
  "grpc.max_reconnect_backoff_ms"?: number;
  "grpc.use_local_subchannel_pool"?: number;
  "grpc.max_send_message_length"?: number;
  "grpc.max_receive_message_length"?: number;
  "grpc.enable_http_proxy"?: number;
  /* http_connect_target and http_connect_creds are used for passing data
   * around internally, and should not be documented as public-facing options
   */
  "grpc.http_connect_target"?: string;
  "grpc.http_connect_creds"?: string;
  "grpc.enable_channelz"?: number;
  "grpc.dns_min_time_between_resolutions_ms"?: number;
  "grpc-node.max_session_memory"?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
