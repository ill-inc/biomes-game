import type { ShardManagerDomain } from "@/server/shared/shard_manager/api";
import { ShardManager } from "@/server/shared/shard_manager/api";
import { ShardDomainConfigWatcher } from "@/server/shared/shard_manager/config";

export class FakeShardManager extends ShardManager {
  private readonly config: ShardDomainConfigWatcher;
  #held = new Set<number>();
  started = false;

  constructor(name: ShardManagerDomain) {
    super(name);
    this.config = new ShardDomainConfigWatcher(name, () => {
      this.processAcquisitions();
    });
  }

  get total() {
    return this.config.shards;
  }

  get held(): ReadonlySet<number> {
    return this.#held;
  }

  reportWeight(_shard: number, _weight: number): void {
    // No-op for fake manager.
  }

  async start() {
    this.started = true;
    this.processAcquisitions();
  }

  async stop() {
    this.#held.clear();
    for (const index of this.#held) {
      this.emit("released", index);
    }
    this.config.stop();
  }

  private processAcquisitions() {
    if (!this.started) {
      return;
    }
    const newHeld = new Set(Array(this.total).keys());
    if (this.#held.size === newHeld.size) {
      return;
    }

    if (this.#held.size > newHeld.size) {
      for (const index of this.#held) {
        if (!newHeld.has(index)) {
          this.#held.delete(index);
          this.emit("released", index);
        }
      }
    } else if (this.#held.size < newHeld.size) {
      for (const index of newHeld) {
        if (!this.#held.has(index)) {
          this.#held.add(index);
          this.emit("acquired", index);
        }
      }
    }
    this.#held = newHeld;
  }
}
