import type {
  EventBatch,
  Firehose,
  IdempotentFirehoseEvent,
} from "@/server/shared/firehose/api";
import type { WorldApi } from "@/server/shared/world/api";
import { leaderboardUpdatesForEvents } from "@/server/shared/world/leaderboard";
import type { FirehoseEvent } from "@/shared/firehose/events";
import { ConditionVariable } from "@/shared/util/async";
import { autoId } from "@/shared/util/auto_id";
import { DefaultMap } from "@/shared/util/collections";

export class InMemoryFirehose implements Firehose {
  private readonly log: IdempotentFirehoseEvent[] = [];
  private readonly subscriptions = new DefaultMap<
    string,
    { cv: ConditionVariable; index: number }
  >(() => ({ cv: new ConditionVariable(), index: 0 }));

  constructor(private readonly worldApiProvider?: () => WorldApi) {}

  async stop(): Promise<void> {}

  async publish(...events: FirehoseEvent[]) {
    if (events.length === 0) {
      return;
    }
    for (const { cv, index } of this.subscriptions.values()) {
      if (index === this.log.length) {
        // Signal that there is more available for this subscriber.
        cv.signal();
      }
    }
    this.log.push(
      ...events.map((e) => ({
        ...e,
        timestamp: Date.now(),
        uniqueId: autoId(),
      }))
    );
    const worldApi = this.worldApiProvider?.();
    if (worldApi) {
      for (const [category, amount, op, id] of leaderboardUpdatesForEvents(
        events
      )) {
        await worldApi.leaderboard().record(category, op, id, amount);
      }
    }
  }

  async *events(
    group: string,
    _ackTtlMs: number,
    signal?: AbortSignal
  ): AsyncIterable<EventBatch> {
    while (!signal?.aborted) {
      const sub = this.subscriptions.get(group)!;
      if (sub.index === this.log.length) {
        // Wait for more.
        await sub.cv.wait();
      }
      const batch = this.log.slice(sub.index);
      sub.index = this.log.length;
      if (batch.length > 0) {
        yield [batch, async () => {}];
      }
    }
  }
}
