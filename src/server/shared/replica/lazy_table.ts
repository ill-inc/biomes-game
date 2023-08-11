import type { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import type { LazyChange } from "@/server/shared/ecs/lazy";
import { applyLazyChange } from "@/server/shared/ecs/lazy";
import type { SubscriptionConfig, WorldApi } from "@/server/shared/world/api";
import { BackgroundTaskController } from "@/shared/abort";
import { changedBiomesId } from "@/shared/ecs/change";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { Latch } from "@/shared/util/async";

export class LazyReplica {
  private readonly controller = new BackgroundTaskController();
  private readonly contents = new Map<BiomesId, LazyEntity | undefined>();

  constructor(
    public readonly worldApi: WorldApi,
    protected readonly replicaConfig: SubscriptionConfig
  ) {}

  private apply(changes: LazyChange[]) {
    for (const change of changes) {
      const id = changedBiomesId(change);
      const updated = applyLazyChange(this.contents.get(id), change);
      if (!updated) {
        this.contents.delete(id);
      } else {
        this.contents.set(id, updated);
      }
    }
  }

  get(id: BiomesId): LazyEntity | undefined {
    return this.contents.get(id);
  }

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
            this.apply(changes);
            changeCount += changes.length;
          }
          if (isBootstrapped) {
            bootstrapped.signal();
            if (!bootstrapped.signalled) {
              log.info(`Bootstrapped ${changeCount} changes`);
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
    return this.controller.abortAndWait();
  }
}
