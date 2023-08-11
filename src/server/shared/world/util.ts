import type { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import type { LazyCreate, LazyUpdate } from "@/server/shared/ecs/lazy";
import { LazyChangeBuffer } from "@/server/shared/ecs/lazy";
import type { WorldApi } from "@/server/shared/world/api";
import { BackgroundTaskController, chain } from "@/shared/abort";
import type { BiomesId } from "@/shared/ids";
import { Latch, yieldToOthers } from "@/shared/util/async";
import { chunk } from "lodash";

export async function readWorldChanges(
  worldApi: WorldApi,
  signal: AbortSignal
): Promise<(LazyCreate | LazyUpdate)[]> {
  const controller = new BackgroundTaskController();
  chain(controller, signal);

  const bootstrapped = new Latch();
  const changes = new LazyChangeBuffer();
  controller.runInBackground("getAllChanges", async (signal) => {
    for await (const update of worldApi.subscribe({}, signal)) {
      changes.push(update.changes);
      if (update.bootstrapped) {
        bootstrapped.signal();
      }
    }
    // In case we exited without bootstrapping, unblock caller.
    bootstrapped.signal();
  });
  await bootstrapped.wait();
  await controller.abortAndWait();
  if (signal.aborted) {
    return [];
  }
  return changes.pop().filter((c) => c.kind !== "delete") as (
    | LazyCreate
    | LazyUpdate
  )[];
}

export async function batchedGet(
  worldApi: WorldApi,
  ids: BiomesId[],
  signal: AbortSignal
): Promise<(LazyEntity | undefined)[]> {
  const output = [];
  for (const batch of chunk(ids, 1000)) {
    if (signal.aborted) {
      return [];
    }
    output.push(...(await worldApi.get(batch)));
    await yieldToOthers(); // For testing where world is synchronous.
  }
  return output;
}
