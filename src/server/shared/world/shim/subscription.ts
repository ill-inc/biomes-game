import type { EntityFilter } from "@/server/shared/ecs/filter";
import { passes } from "@/server/shared/ecs/filter";
import { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import type { SubscriptionConfig } from "@/server/shared/world/api";
import type { zWorldUpdate } from "@/server/shared/world/shim/api";
import type { InMemoryWorld } from "@/server/shared/world/shim/in_memory_world";
import { ChainableAbortController } from "@/shared/abort";
import type {
  Change,
  Create,
  Delete,
  ReadonlyChanges,
} from "@/shared/ecs/change";
import { ChangeBuffer } from "@/shared/ecs/change";
import type { EntityState } from "@/shared/ecs/table";
import { WrappedChange } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import { ConditionVariable } from "@/shared/util/async";
import type { z } from "zod";

// Logic to apply and track entity filter logic for a given subscription.
class FilterContext {
  filtered = new Set<BiomesId>();

  constructor(
    private readonly filter: EntityFilter,
    private readonly world: InMemoryWorld
  ) {
    // Catch up our set of filtered entities to what the client has.
    for (const [id, [, entity]] of this.world.deltaSince()) {
      if (entity && !passes(LazyEntity.forDecoded(entity), this.filter)) {
        this.filtered.add(id);
      }
    }
  }

  process(changes: Iterable<Change>) {
    const output: Change[] = [];
    for (const change of changes) {
      const processed = this.processChange(change);
      if (processed !== undefined) {
        output.push(processed);
      }
    }
    return output;
  }

  // Returns undefined if the change is to be filtered.
  private processChange(
    change: Readonly<Change>
  ): Readonly<Change> | undefined {
    if (change.kind === "delete") {
      this.filtered.delete(change.id);
      return change;
    }

    const [version, entity] = this.world.getWithVersion(change.entity.id)!;
    if (!entity) {
      return change;
    }

    if (passes(LazyEntity.forDecoded(entity), this.filter)) {
      if (!this.filtered.has(entity.id)) {
        // Nothing special to do, pass through the change.
        return change;
      }

      this.filtered.delete(entity.id);
      return { kind: "create", tick: version, entity };
    } else {
      if (this.filtered.has(entity.id)) {
        return undefined;
      }
      this.filtered.add(entity.id);
      return { kind: "delete", tick: version, id: entity.id };
    }
  }
}

function stateToBootstrapChange(
  id: BiomesId,
  state: Readonly<EntityState<number>>,
  filterContext: FilterContext | undefined
): Readonly<Delete | Create> {
  if (!state[1]) {
    return { kind: "delete", tick: state[0], id };
  }
  if (filterContext && filterContext.filtered.has(id)) {
    return { kind: "delete", tick: state[0], id };
  }
  return { kind: "create", tick: state[0], entity: state[1] };
}

export class ShimSubscriptionManager {
  public size: number = 0;
  private controller = new ChainableAbortController();

  constructor(private readonly world: InMemoryWorld) {}

  private async *bootstrap(
    filterContext: FilterContext | undefined,
    signal: AbortSignal
  ): AsyncIterable<z.infer<typeof zWorldUpdate>> {
    const changes: WrappedChange[] = [];
    for await (const [id, state] of this.world.deltaSince()) {
      if (signal.aborted) {
        return;
      }
      if (changes.length > CONFIG.redisMaxChangesPerUpdate) {
        yield {
          changes,
        };
        changes.length = 0;
      }

      changes.push(
        new WrappedChange(stateToBootstrapChange(id, state, filterContext))
      );
    }
    // Ensure bootstrap always yields at least once.
    yield { bootstrapped: true, changes };
  }

  async *subscribe(
    config?: SubscriptionConfig,
    subscribeSignal?: AbortSignal
  ): AsyncIterable<z.infer<typeof zWorldUpdate>> {
    const controller = this.controller.chain(subscribeSignal);
    if (controller.aborted) {
      return;
    }
    // Ensure we start the subscription prior to initiating bootstrap.
    // Also : This cannot throw (the iteration of stream can).
    const cv = new ConditionVariable();
    const buffer = new ChangeBuffer();
    const onTick = (changes: ReadonlyChanges) => {
      if (buffer.size === 0) {
        cv.signal();
      }
      buffer.push(changes);
    };

    controller.signal.addEventListener("abort", () => cv.signal(), {
      once: true,
    });

    this.world.on("tick", onTick);
    const filterContext = config?.filter
      ? new FilterContext(config?.filter, this.world)
      : undefined;

    this.size++;
    try {
      yield* this.bootstrap(filterContext, controller.signal);
      while (!controller.signal.aborted) {
        if (buffer.size === 0) {
          await cv.wait();
          if (controller.signal.aborted) {
            break;
          }
        }
        let batch = buffer.pop();
        if (filterContext) {
          batch = filterContext.process(batch);
        }
        // Partition our response to not overload downstream.
        const changes: WrappedChange[] = [];
        for (const change of batch) {
          if (changes.length > CONFIG.redisMaxChangesPerUpdate) {
            yield { changes };
            changes.length = 0;
          }
          changes.push(new WrappedChange(change));
        }
        yield { changes };
      }
    } finally {
      this.world.off("tick", onTick);
      controller.abort();
      this.size--;
    }
  }

  async stop() {
    this.controller.abort();
  }
}
