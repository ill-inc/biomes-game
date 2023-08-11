import { createServiceDiscovery } from "@/server/shared/discovery/discovery";
import { createElection } from "@/server/shared/election/election";
import type {
  ShardManager,
  ShardManagerDomain,
} from "@/server/shared/shard_manager/api";
import { DistributedShardManager } from "@/server/shared/shard_manager/distributed";
import { FakeShardManager } from "@/server/shared/shard_manager/fake";
import {
  ServiceShardManager,
  connectToBalancer,
} from "@/server/shared/shard_manager/service";
import { connectToWorkerShardManager } from "@/server/shared/shard_manager/thread";

type ShardManagerKind = "fake" | "thread" | "balancer" | "distributed";

function determineShardManagerKind(): ShardManagerKind {
  if (process.env.SHARD_MANAGER_KIND) {
    return process.env.SHARD_MANAGER_KIND as ShardManagerKind;
  }
  if (process.env.NODE_ENV === "production") {
    return "balancer";
  }
  return "fake";
}

export async function makeShardManager(
  name: ShardManagerDomain
): Promise<ShardManager> {
  const kind = determineShardManagerKind();
  switch (determineShardManagerKind()) {
    case "fake":
      return new FakeShardManager(name);
    case "balancer":
      return new ServiceShardManager(
        (key) => connectToBalancer(key),
        name,
        await createElection("balancer")
      );
    case "distributed":
      return new DistributedShardManager(
        await createServiceDiscovery(`shard-manager:${name}`),
        name
      );
    case "thread":
      return connectToWorkerShardManager(name);
    default:
      throw new Error(`Unknown shard manager kind: ${kind}`);
  }
}
