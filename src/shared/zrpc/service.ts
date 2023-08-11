import { ServiceDescription } from "@/shared/zrpc/core";

// Create a new Zod-gRPC [zRPC] service.
export function zservice(serviceName: string): ServiceDescription {
  return new ServiceDescription(serviceName, {});
}
