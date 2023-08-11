import type { ServiceDiscoveryApi } from "@/server/shared/discovery/api";
import { MemoryServiceDiscovery } from "@/server/shared/discovery/memory";
import { RedisServiceDiscovery } from "@/server/shared/discovery/redis";
import type { ServiceDiscoveryService } from "@/server/shared/discovery/remote";
import {
  RemoteServiceDiscovery,
  ServiceDiscoveryServiceImpl,
  zServiceDiscoveryService,
} from "@/server/shared/discovery/remote";
import { HostPort } from "@/server/shared/ports";
import { makeClient } from "@/server/shared/zrpc/client";

type DiscoveryKind = "redis" | "shim";

function determineDiscoveryKind(): DiscoveryKind {
  if (process.env.DISCOVERY_KIND) {
    return process.env.DISCOVERY_KIND as DiscoveryKind;
  }
  if (process.env.NODE_ENV === "production") {
    return "redis";
  }
  return "shim";
}

export async function createServiceDiscovery(
  service: string
): Promise<ServiceDiscoveryApi> {
  const kind = determineDiscoveryKind();
  switch (kind) {
    case "redis":
      return RedisServiceDiscovery.create(service);
    case "shim":
      return new RemoteServiceDiscovery(
        makeClient(zServiceDiscoveryService, HostPort.forShim().rpc),
        service
      );
    default:
      throw new Error(`Unknown service discovery kind: ${kind}`);
  }
}

export function createShimServiceDiscovery(): ServiceDiscoveryService {
  const store = new MemoryServiceDiscovery();
  return new ServiceDiscoveryServiceImpl((service) =>
    store.for(service)
  ) as ServiceDiscoveryService;
}
