import type { IMutex } from "@/server/logic/lock_map";
import { LockMap } from "@/server/logic/lock_map";
import type { BiomesId } from "@/shared/ids";
import { DefaultMap } from "@/shared/util/collections";
import assert from "assert";

// Create a fake lock map that logs all acquire releases.
function createLockMapAndLog() {
  const log: string[] = [];
  const fakeMutexes = new DefaultMap<BiomesId, IMutex>((id) => ({
    acquire: async () => {
      log.push(`acquire ${id}`);
    },
    release: () => {
      log.push(`release ${id}`);
    },
  }));
  const lockMap = new LockMap();
  Object.assign(lockMap, { mutexes: fakeMutexes });
  return { lockMap, log };
}

describe("LockMap tests", () => {
  it("locks and unlocks in correct order", async () => {
    const { lockMap, log } = createLockMapAndLog();

    await lockMap.useLocks(async (scope) => {
      await scope.acquireAll([] as BiomesId[]);
      await scope.acquireAll([2, 4] as BiomesId[]);
      await scope.acquireAll([1, 3] as BiomesId[]);
      await scope.acquireAll([1, 2, 3] as BiomesId[]);
      await scope.acquireAll([0] as BiomesId[]);
    });
    assert.deepEqual(log, [
      "acquire 2",
      "acquire 4",
      "release 2",
      "release 4",
      "acquire 1",
      "acquire 3",
      "release 3",
      "acquire 2",
      "acquire 3",
      "release 1",
      "release 2",
      "release 3",
      "acquire 0",
      "release 0",
    ]);
  });
});
