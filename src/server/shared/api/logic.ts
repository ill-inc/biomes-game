import type { GameEvent } from "@/server/shared/api/game_event";
import { zGameEvent } from "@/server/shared/api/game_event";
import { HostPort } from "@/server/shared/ports";
import { makeClient } from "@/server/shared/zrpc/client";
import type { ZService } from "@/server/shared/zrpc/server_types";
import { log } from "@/shared/logging";
import type { ZClient } from "@/shared/zrpc/core";
import { RpcError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import { zservice } from "@/shared/zrpc/service";
import { z } from "zod";

export const zPublishRequest = z.object({
  events: z.array(zGameEvent),
});

export type PublishRequest = z.infer<typeof zPublishRequest>;

export const zPublishResponse = z.object({
  outcomes: z.boolean().array(),
});

export type PublishResponse = z.infer<typeof zPublishResponse>;

export const zLogicService = zservice("logic")
  .addRpc("ping", z.void(), z.void())
  .addRpc("publish", zPublishRequest, zPublishResponse);

export type LogicService = ZService<typeof zLogicService>;
export type LogicClient = ZClient<typeof zLogicService>;

export class LogicContentionError extends RpcError {
  constructor(public readonly events: GameEvent[]) {
    super(grpc.status.ABORTED, "Too much contention");
  }
}

export interface LogicApi {
  ping(): Promise<void>;
  publish(...events: GameEvent[]): Promise<void>;
}

export class LogicApiImpl implements LogicApi {
  constructor(private readonly client: LogicClient) {}

  async ping() {
    await this.client.ping();
  }

  async publish(...events: GameEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }
    const response = await this.client.publish({ events });
    const failed = events.filter((_, i) => !response.outcomes[i]);
    if (failed.length > 0) {
      throw new LogicContentionError(failed);
    }
  }
}

export async function registerLogicApi(): Promise<LogicApi> {
  const client = makeClient(zLogicService, HostPort.forLogic().rpc);
  try {
    await client.ping();
  } catch (error: any) {
    log.warn("Could not ping Logic on start", { error });
  }
  return new LogicApiImpl(client);
}
