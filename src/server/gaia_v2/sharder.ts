import type { GaiaServerContext } from "@/server/gaia_v2/context";
import type { GaiaReplica } from "@/server/gaia_v2/table";
import { positionHash } from "@/server/gaia_v2/util/hashing";
import {
  DEFAULT_TOTAL_SHARDS,
  type ShardManager,
  type ShardManagerDomain,
  type ShardManagerEvents,
} from "@/server/shared/shard_manager/api";
import { makeShardManager } from "@/server/shared/shard_manager/register";
import type { ValueSharderEvents } from "@/server/shared/shard_manager/value_sharder";
import {
  ValueSharder,
  subscribeSharderToShardManager,
} from "@/server/shared/shard_manager/value_sharder";
import type { EmitterSubscription } from "@/shared/events";
import type { ShardId } from "@/shared/game/shard";
import { shardDecode } from "@/shared/game/shard";
import { createGauge } from "@/shared/metrics/metrics";
import type { RegistryLoader } from "@/shared/registry";

export type GaiaSharderEvents = ValueSharderEvents<ShardId>;

export class Sharder extends ValueSharder<ShardId, ShardId> {
  private shardManager: ShardManager | undefined;
  private shardManagerSubscription:
    | EmitterSubscription<ShardManagerEvents>
    | undefined;

  constructor(private readonly replica: GaiaReplica) {
    super((id: ShardId) => {
      // Columns always get assigned to the same shard
      const [x, _, z] = shardDecode(id);
      const shardId =
        Math.abs(positionHash([x, 0, z])) %
        (this.shardManager?.total ?? DEFAULT_TOTAL_SHARDS);
      return [id, shardId];
    });

    createGauge({
      name: "gaia_shards_acquired",
      help: "Number of shards currently acquired by this server.",
      collect: (g) => {
        g.set(this.heldShards.size);
      },
    });
    createGauge({
      name: "gaia_world_shards_acquired",
      help: "Number of world shards currently acquired by this server.",
      collect: (g) => {
        g.set(this.heldValues.size);
      },
    });
  }

  async start() {
    this.shardManager = await makeShardManager(
      (process.env.GAIA_SHARD_DOMAIN as ShardManagerDomain) || "gaia-v2"
    );
    this.shardManagerSubscription = subscribeSharderToShardManager(
      this.shardManager,
      this
    );
    // Initialize sharder with all world shards
    this.update(
      this.replica.table.metaIndex.terrain_shard_selector.getAllKeys()
    );
    await this.shardManager.start();
  }

  async stop() {
    await this.shardManager?.stop();
    this.shardManagerSubscription?.off();
  }
}

export async function registerGaiaSharder<C extends GaiaServerContext>(
  loader: RegistryLoader<C>
) {
  const replica = await loader.get("replica");
  return new Sharder(replica);
}
