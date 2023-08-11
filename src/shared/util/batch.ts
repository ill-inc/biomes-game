import type { BiomesId } from "@/shared/ids";
import { MultiMap } from "@/shared/util/collections";
import { ok } from "assert";
import { zip } from "lodash";

interface TimedRequestBatchItem<RT, KT = BiomesId> {
  waiters: MultiMap<
    KT,
    [resolve: (result: RT) => unknown, reject: (e: any) => unknown]
  >;
}

export class TimedRequestBatcher<RT, KT = BiomesId> {
  private openItem?: TimedRequestBatchItem<RT, KT>;

  constructor(
    private fetcher: (ids: KT[]) => Promise<RT[]>,
    private waitMs = 15
  ) {}

  private async executeBatch(batch: TimedRequestBatchItem<RT, KT>) {
    const ids = [...batch.waiters.keys()];
    try {
      const result = await this.fetcher(ids);
      ok(result.length === ids.length);
      for (const [id, maybeItem] of zip(ids, result)) {
        for (const [resolve, _] of batch.waiters.get(id!)) {
          resolve(maybeItem!);
        }
      }
    } catch (error: any) {
      for (const id of ids) {
        for (const [_, reject] of batch.waiters.get(id)) {
          reject(error);
        }
      }
    }
  }

  fetch(id: KT): Promise<RT> {
    return new Promise<RT>((resolve, reject) => {
      if (!this.openItem) {
        this.openItem = {
          waiters: new MultiMap(),
        };
        setTimeout(() => {
          const t = this.openItem;
          this.openItem = undefined;
          if (t) {
            void this.executeBatch(t);
          }
        }, this.waitMs);
      }

      this.openItem.waiters.add(id, [resolve, reject]);
    });
  }
}
