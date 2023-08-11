import type { IdGenerator } from "@/server/shared/ids/generator";
import type { BiomesId } from "@/shared/ids";
import { createCounter } from "@/shared/metrics/metrics";
import { ok } from "assert";
import { isInteger } from "lodash";

const idPoolStalls = createCounter({
  name: "id_pool_stalls",
  help: "Count of whenever the ID pool was exhausted",
});

const allocatedIdsCounter = createCounter({
  name: "game_id_allocated",
  help: "Total IDs allocated",
});
export class IdPoolGenerator implements IdGenerator {
  private readonly buffer: BiomesId[] = [];

  constructor(
    private readonly backing: IdGenerator,
    private readonly batchSize: () => number
  ) {}

  private async supply() {
    idPoolStalls.inc();
    const batchSize = Math.floor(Math.max(1, this.batchSize()));
    allocatedIdsCounter.inc(batchSize);
    this.buffer.push(...(await this.backing.batch(batchSize)));
  }

  async next(): Promise<BiomesId> {
    if (this.buffer.length > 0) {
      return this.buffer.pop()!;
    }
    await this.supply();
    return this.buffer.pop()!;
  }

  async batch(count: number): Promise<BiomesId[]> {
    ok(isInteger(count), "count must be an integer");
    ok(count >= 0, "count must be >= 0");

    if (this.buffer.length >= count) {
      return this.buffer.splice(0, count);
    }
    const ids: BiomesId[] = [];
    while (true) {
      const batch = this.buffer.splice(0, count);
      ids.push(...batch);
      count -= batch.length;
      if (count === 0) {
        break;
      }
      await this.supply();
    }
    return ids;
  }

  return(...ids: BiomesId[]) {
    this.buffer.push(...ids);
  }
}

const requestedIdsCounter = createCounter({
  name: "game_id_requested",
  help: "Number of IDs requested",
});

const usedIdsCounter = createCounter({
  name: "game_id_used",
  help: "Actual number of IDs used",
});

export class IdPoolLoan {
  private readonly allocated: BiomesId[] = [];

  constructor(private readonly backing: IdPoolGenerator) {}

  get size() {
    return this.allocated.length;
  }

  async borrow(count: number): Promise<BiomesId[]> {
    if (count === 0) {
      return [];
    }
    const ids = await this.backing.batch(count);
    requestedIdsCounter.inc(count);
    this.allocated.push(...ids);
    return ids;
  }

  commit(used: Iterable<BiomesId>) {
    ok(this.allocated.length > 0, "No IDs were allocated");
    let usedCount = 0;
    const ids = new Set(used);
    this.backing.return(
      ...this.allocated.filter((id) => {
        if (ids.has(id)) {
          usedCount++;
          return false;
        }
        return true;
      })
    );
    usedIdsCounter.inc(usedCount);
    this.allocated.length = 0;
  }
}
