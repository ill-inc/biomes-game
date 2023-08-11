import type { FirehoseEvent } from "@/shared/firehose/events";

export type IdempotentFirehoseEvent = FirehoseEvent & {
  timestamp: number;
  uniqueId: string;
};

export type EventAckFn = () => Promise<void>;
export type EventBatch = [events: IdempotentFirehoseEvent[], ack: EventAckFn];

export interface Firehose {
  stop(): Promise<void>;
  publish(...events: ReadonlyArray<FirehoseEvent>): Promise<void>;
  events(
    group: string,
    ackTtlMs: number,
    signal?: AbortSignal
  ): AsyncIterable<EventBatch>;
}
