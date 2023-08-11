import type { BiomesId } from "@/shared/ids";
import { DefaultMap } from "@/shared/util/collections";
import { Mutex } from "async-mutex";

export type LockMapScope = {
  acquireAll: (ids: BiomesId[]) => Promise<void>;
};

export interface IMutex {
  acquire: () => Promise<unknown>;
  release: () => void;
}

// Represents locks on a series of BiomesIds, with a method to lock multiple
// that will avoid deadlocks.
export class LockMap {
  private readonly mutexes = new DefaultMap<BiomesId, IMutex>(
    () => new Mutex()
  );

  async useLocks<R>(fn: (scope: LockMapScope) => Promise<R>): Promise<R> {
    const held: BiomesId[] = [];
    try {
      return await fn({
        acquireAll: async (ids) => {
          ids.sort((a, b) => a - b); // Lock in defined order.
          for (const id of ids) {
            // Find where this ID belongs.
            const splitIdx = held.findIndex((h) => h >= id);
            if (held[splitIdx] === id) {
              // Already held.
              continue;
            }
            // We do not hold a needed lock.
            if (splitIdx !== -1) {
              // Release everything after this ID, it ensures we avoid
              // deadlocks by always acquiring locks in order.
              for (let i = splitIdx; i < held.length; ++i) {
                this.mutexes.get(held[i]).release();
              }
              held.length = splitIdx;
            }
            await this.mutexes.get(id).acquire();
            held.push(id);
          }
        },
      });
    } finally {
      for (const id of held) {
        this.mutexes.get(id).release();
      }
    }
  }
}
