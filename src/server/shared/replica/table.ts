import { materializeLazyChange } from "@/server/shared/ecs/lazy";
import type { SubscriptionConfig, WorldApi } from "@/server/shared/world/api";
import { BackgroundTaskController } from "@/shared/abort";
import type { Change } from "@/shared/ecs/change";
import type { Index, MetaIndex } from "@/shared/ecs/selectors/selector";
import type { Table, WriteableTable } from "@/shared/ecs/table";
import { createTable } from "@/shared/ecs/table";
import { AsyncSubscriptionManager } from "@/shared/events";
import { log } from "@/shared/logging";
import type { Gauge } from "@/shared/metrics/metrics";
import { createCounter, createGauge } from "@/shared/metrics/metrics";
import { Latch } from "@/shared/util/async";

export type ReplicaEvents = {
  tick: (changes: Change[]) => void;
};

export const replicaChangesReceived = createCounter({
  name: "replica_changes_received",
  help: "Changes applied to the replica",
  labelNames: ["name"],
});

export abstract class BaseReplica extends AsyncSubscriptionManager<ReplicaEvents> {
  private readonly controller = new BackgroundTaskController();

  constructor(
    public readonly name: string,
    public readonly worldApi: WorldApi,
    protected readonly replicaConfig: SubscriptionConfig
  ) {
    super();
  }

  abstract apply(changes: Change[]): void;

  async start() {
    const { filter } = this.replicaConfig;

    let changeCount = 0;
    const bootstrapped = new Latch();

    this.controller.runInBackground("replicate", async (signal) => {
      try {
        for await (const {
          changes,
          bootstrapped: isBootstrapped,
        } of this.worldApi.subscribe(
          {
            filter,
          },
          signal
        )) {
          if (changes) {
            const materialized = changes.map((c) => materializeLazyChange(c));
            changeCount += changes.length;
            replicaChangesReceived.inc({ name: this.name }, changes.length);
            this.apply(materialized);
            this.emit("tick", materialized);
          }
          if (isBootstrapped) {
            bootstrapped.signal();
            if (!bootstrapped.signalled) {
              log.info(`${this.name}: Bootstrapped ${changeCount} changes`);
            }
          }
        }
      } catch (error: any) {
        // This should never occur, so give up entirely.
        log.fatal("Replicated table failure", { error });
      }
    });
    await bootstrapped.wait();
  }

  async stop() {
    await this.controller.abortAndWait();
    await super.stop();
  }
}

export type ReplicaConfig<C extends MetaIndex<C>> = SubscriptionConfig & {
  // Meta-index
  metaIndex?: C;
};

export class Replica<C extends MetaIndex<C> = {}> extends BaseReplica {
  public readonly table: WriteableTable & Table<C>;

  constructor(name: string, world: WorldApi, replicaConfig: ReplicaConfig<C>) {
    super(name, world, replicaConfig);
    this.table = createTable<C>(replicaConfig.metaIndex ?? ({} as C));
  }

  async start() {
    await super.start();
    // Only report index size after bootstrapped.
    createGauge({
      name: "replica_index_size",
      help: "Size of the given replica index",
      labelNames: ["index"],
      collect: (gauge: Gauge) => {
        for (const [key, index] of Object.entries(this.table.metaIndex)) {
          gauge.set({ index: key }, (index as Index).size);
        }
      },
    });
  }

  apply(changes: Change[]) {
    this.table.apply(changes);
  }

  // Use with caution! Permits the local replica to get out of sync.
  localOnlyUpdate(changes: Change[]) {
    if (this.table.apply(changes)) {
      this.emit("tick", changes);
    }
  }
}

export async function materializeEcs<C extends MetaIndex<C>>(
  name: string,
  world: WorldApi,
  replicaConfig: ReplicaConfig<C>
): Promise<Table<C>> {
  const replica = new Replica(name, world, replicaConfig);
  await replica.start();
  await replica.stop();
  return replica.table;
}
