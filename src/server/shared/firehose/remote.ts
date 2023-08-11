import type {
  EventAckFn,
  EventBatch,
  Firehose,
} from "@/server/shared/firehose/api";
import type { ZService } from "@/server/shared/zrpc/server_types";
import type { FirehoseEvent } from "@/shared/firehose/events";
import { zFirehoseEvent } from "@/shared/firehose/events";
import type { RpcContext, ZClient } from "@/shared/zrpc/core";
import { zservice } from "@/shared/zrpc/service";
import { z } from "zod";

export const zFetchRequest = z.object({
  group: z.string(),
  ackTtlMs: z.number(),
});

export type FetchRequest = z.infer<typeof zFetchRequest>;

export const zRemoteFirehoseService = zservice("remote-firehose")
  .addRpc("publish", zFirehoseEvent.array(), z.void())
  .addRpc("ack", z.number(), z.void())
  .addStreamingRpc(
    "fetch",
    zFetchRequest,
    z.tuple([
      z.tuple([zFirehoseEvent, z.number(), z.string()]).array(),
      z.number(),
    ])
  );

export type RemoteFirehoseClient = ZClient<typeof zRemoteFirehoseService>;

export class RemoteFirehose implements Firehose {
  constructor(private readonly client: RemoteFirehoseClient) {}

  async stop(): Promise<void> {}

  async publish(...events: FirehoseEvent[]): Promise<void> {
    await this.client.publish(events);
  }

  async *events(
    group: string,
    ackTtlMs: number,
    signal?: AbortSignal
  ): AsyncIterable<EventBatch> {
    for await (const [events, ackNum] of this.client.fetch(
      { group, ackTtlMs },
      signal
    )) {
      yield [
        events.map(([event, timestamp, uniqueId]) => ({
          ...event,
          timestamp,
          uniqueId,
        })),
        () => this.client.ack(ackNum),
      ];
    }
  }
}

export type RemoteFirehoseService = ZService<typeof zRemoteFirehoseService>;

export class ExposeFirehoseService implements RemoteFirehoseService {
  private ackNum = 1;
  private readonly acks = new Map<number, EventAckFn>();

  constructor(private readonly backing: Firehose) {}

  async publish(_context: RpcContext, events: FirehoseEvent[]) {
    await this.backing.publish(...events);
  }

  async ack(_context: RpcContext, ackNum: number) {
    const ack = this.acks.get(ackNum);
    if (ack) {
      await ack();
      this.acks.delete(ackNum);
    }
  }

  async *fetch(
    { signal }: RpcContext,
    { group, ackTtlMs }: FetchRequest
  ): AsyncIterable<[[FirehoseEvent, number, string][], number]> {
    for await (const [events, ack] of this.backing.events(
      group,
      ackTtlMs,
      signal
    )) {
      const ackNum = this.ackNum++;
      this.acks.set(ackNum, ack);
      yield [
        events.map(
          (e) => [e, e.timestamp, e.uniqueId] as [FirehoseEvent, number, string]
        ),
        ackNum,
      ];
    }
  }
}
