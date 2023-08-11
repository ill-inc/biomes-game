import { createElection } from "@/server/shared/election/election";
import type { ShardManagerDomain } from "@/server/shared/shard_manager/api";
import {
  RemoteShardManager,
  ShardManagerServiceImpl,
  zShardManagerService,
} from "@/server/shared/shard_manager/remote";
import {
  ServiceShardManager,
  connectToBalancer,
} from "@/server/shared/shard_manager/service";
import { defineBiomesServiceWorker } from "@/server/shared/worker/worker";
import { log } from "@/shared/logging";
import { ok } from "assert";

const createWorker = defineBiomesServiceWorker(
  __filename,
  zShardManagerService,
  async (start, name?: ShardManagerDomain) => {
    ok(name, "You must provide a name for the shard manager!");
    log.info("Starting shard manager worker", { name });
    start(
      new ShardManagerServiceImpl(
        new ServiceShardManager(
          (key) => connectToBalancer(key),
          name,
          await createElection("balancer")
        )
      )
    );
  }
);

export async function connectToWorkerShardManager(
  name: ShardManagerDomain,
  signal?: AbortSignal
) {
  return RemoteShardManager.connect((await createWorker)(name), name, signal);
}
