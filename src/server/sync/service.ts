import type { AskApi } from "@/server/ask/api";
import { RESERVED_GREMLIN_IDS } from "@/server/gizmo/reserved_ids";
import type { ChatApi } from "@/server/shared/chat/api";
import { lazyChangeToSerialized } from "@/server/shared/ecs/lazy";
import { validateSignedApplyRequest } from "@/server/shared/ecs/untrusted";
import type { Firehose } from "@/server/shared/firehose/api";
import type { BDB } from "@/server/shared/storage";
import type { WorldApi } from "@/server/shared/world/api";
import type {
  WebSocketRpcContext,
  ZService,
  ZWebSocketService,
} from "@/server/shared/zrpc/server_types";
import type {
  EvalRequest,
  EvalResponse,
  SingleEvalResponse,
  zInternalSyncService,
} from "@/server/sync/api";
import type { ClientId } from "@/server/sync/client";
import type { ClientTable } from "@/server/sync/client_table";
import type { SyncIndex } from "@/server/sync/subscription/sync_index";
import { findByUID } from "@/server/web/db/users_fetch";
import { okOrAPIError } from "@/server/web/errors";
import { BackgroundTaskController } from "@/shared/abort";
import type { SpecialRoles } from "@/shared/acl_types";
import {
  WrappedSyncChange,
  type CreatePlayerRequest,
  type ExportDelta,
  type ExportRequest,
  type SyncDelta,
  type SyncSubscribeRequest,
  type UntrustedApply,
  type zSyncService,
} from "@/shared/api/sync";
import type { ChangeToApply, zApplyResult } from "@/shared/api/transaction";
import type { Delivery } from "@/shared/chat/types";
import { stateToChange } from "@/shared/ecs/change";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { SyntheticStats } from "@/shared/ecs/gen/components";
import type { Entity } from "@/shared/ecs/gen/entities";
import { SerializeForServer } from "@/shared/ecs/gen/json_serde";
import type { Vec3f } from "@/shared/ecs/gen/types";
import { WorldMetadataId } from "@/shared/ecs/ids";
import { decodeVersionMap, zEncodedVersionMap } from "@/shared/ecs/version";
import type { WrappedEvent } from "@/shared/ecs/zod";
import { WrappedChange } from "@/shared/ecs/zod";
import { reportFunnelStage } from "@/shared/funnel";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { growAABB } from "@/shared/math/linear";
import { createHistogram, exponentialBuckets } from "@/shared/metrics/metrics";
import { Timer, TimerNeverSet } from "@/shared/metrics/timer";
import { evaluateRole } from "@/shared/roles";
import { sleep } from "@/shared/util/async";
import { autoId } from "@/shared/util/auto_id";
import { gunzip } from "@/shared/util/compression";
import type { RpcContext } from "@/shared/zrpc/core";
import { RpcError, okOrRpcError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import { zrpcDeserialize } from "@/shared/zrpc/serde";
import { ok } from "assert";
import { compact } from "lodash";
import type { z } from "zod";

const clientRtt = createHistogram({
  name: "sync_rtt",
  help: "Round trip time for sync messages",
  buckets: exponentialBuckets(10, 2, 8),
});

const clientRttGremlins = createHistogram({
  name: "sync_rtt_gremlins",
  help: "Round trip time for sync messages, filtered on gremlins.",
  buckets: exponentialBuckets(10, 2, 8),
});

export class SyncService
  implements
    ZWebSocketService<typeof zSyncService>,
    ZService<typeof zInternalSyncService>
{
  private readonly controller = new BackgroundTaskController();

  constructor(
    private readonly db: BDB,
    private readonly clients: ClientTable,
    private readonly index: SyncIndex,
    private readonly worldApi: WorldApi,
    private readonly askApi: AskApi,
    private readonly chatApi: ChatApi,
    private readonly firehose: Firehose
  ) {}

  private contextClient(context: WebSocketRpcContext) {
    if (!context.userId) {
      if (process.env.NODE_ENV !== "production" || process.env.RO_SYNC) {
        return this.clients.getOrCreate(
          context.clientSessionId as ClientId,
          false
        );
      }
      throw new RpcError(grpc.status.PERMISSION_DENIED, "Not authenticated");
    }
    return this.clients.getOrCreate(
      context.userId,
      context.authType === "gremlin"
    );
  }

  async takeSession(context: WebSocketRpcContext): Promise<WrappedChange> {
    const client = this.contextClient(context);
    ok(client.userId, "Not supported");
    return lazyChangeToSerialized(
      {
        whoFor: "client",
        id: client.userId,
      },
      await client.markActiveSession(context.clientSessionId)
    );
  }

  async createPlayer(
    context: WebSocketRpcContext,
    { displayName }: CreatePlayerRequest
  ): Promise<void> {
    const client = this.contextClient(context);
    ok(client.userId, "Not supported");

    displayName ??= await (async () => {
      const user = await findByUID(this.db, client.userId);
      okOrAPIError(user, "not_found", "User not found");
      return user.username ?? String(user.id);
    })();

    await client.initPlayer(displayName);
  }

  async keepAlive(
    context: WebSocketRpcContext,
    rttMs: number | undefined
  ): Promise<void> {
    const client = this.contextClient(context);
    await client.keepAlivePlayer();
    if (rttMs !== undefined) {
      clientRtt.observe(rttMs);
      if (client.gremlin) {
        clientRttGremlins.observe(rttMs);
      }
    }
  }

  private async checkRole(context: WebSocketRpcContext, role: SpecialRoles) {
    const userEntity = await this.worldApi.get(context.userId);
    if (!evaluateRole(userEntity?.userRoles()?.roles, role)) {
      log.warn(`Unauthorized attempt at ${role} endpoint`, {
        userId: context.userId,
      });
      throw new RpcError(
        grpc.status.PERMISSION_DENIED,
        "Missing required role"
      );
    }
  }

  async eval(
    ctx: RpcContext,
    { code, user, timeoutMs }: EvalRequest
  ): Promise<EvalResponse> {
    const token = autoId();
    const clientsUsed = Array.from(this.clients);
    const results: SingleEvalResponse[] = [];
    const evals = Promise.all(
      clientsUsed.map(async (client) => {
        if (!user || client.userId === user) {
          results.push(...(await client.eval(token, code)));
        }
      })
    );
    if (!(await sleep(timeoutMs, ctx.signal))) {
      for (const client of clientsUsed) {
        client.returnEval(token, "[timeout]");
      }
    }
    await evals;
    return { results };
  }

  async returnEval(
    context: WebSocketRpcContext,
    [token, result]: [string, any]
  ) {
    const client = this.contextClient(context);
    client.returnEval(token, result);
  }

  async apply(
    context: WebSocketRpcContext,
    request: UntrustedApply
  ): Promise<z.infer<typeof zApplyResult>> {
    okOrRpcError(
      !CONFIG.syncDisableDevEndpoints,
      grpc.status.RESOURCE_EXHAUSTED,
      "Killswitched"
    );
    await this.checkRole(context, "apply");
    if (!validateSignedApplyRequest(context.userId, request)) {
      throw new RpcError(grpc.status.PERMISSION_DENIED, "Invalid signature");
    }
    log.info("Applying external authorized transactions", {
      userId: context.userId,
      transactions: request.transactions.length,
    });
    const { outcomes, changes: eagerChanges } = await this.worldApi.apply(
      request.transactions.map(
        (t) =>
          <ChangeToApply>{
            ...t,
            changes: t.changes?.map(({ change }) => change),
          }
      )
    );
    return [
      outcomes,
      eagerChanges.map((c) => lazyChangeToSerialized(SerializeForServer, c)),
    ];
  }

  async publish(
    context: WebSocketRpcContext,
    wrapped: WrappedEvent[]
  ): Promise<(string | undefined)[]> {
    const client = this.contextClient(context);
    ok(client.userId, "Not supported");
    // Don't block on keep-alive
    void client.keepAlivePlayer();
    const work = wrapped.map((wrapped) => client.author(wrapped.event));
    const results = await Promise.allSettled(work);
    const outcomes = results.map((r) => {
      if (r.status === "fulfilled") {
        return undefined;
      }
      log.error("Failed to publish event", { error: r.reason });
      return String(r.reason);
    });
    return outcomes;
  }

  async publishOneWay(
    context: WebSocketRpcContext,
    wrapped: WrappedEvent[]
  ): Promise<void> {
    await this.publish(context, wrapped);
  }

  private async exportChat(ids: BiomesId[]): Promise<Delivery[] | undefined> {
    const results = await Promise.all(
      ids.map((id) =>
        Promise.race([
          this.chatApi.export(id).catch((error) => {
            log.error("Could not export chat for user", { error, id });
            return [];
          }),
          sleep(500).then(() => []),
        ])
      )
    );
    return results.flat();
  }

  async *export(
    context: WebSocketRpcContext,
    { versionMap, radius, overrideUserId, overridePosition }: ExportRequest
  ): AsyncIterable<ExportDelta> {
    okOrRpcError(
      !CONFIG.syncDisableDevEndpoints,
      grpc.status.RESOURCE_EXHAUSTED,
      "Killswitched"
    );
    await this.checkRole(context, "export");
    log.info("Exporting data for DEV", {
      userId: context.userId,
      radius,
      overrideUserId,
      overridePosition,
    });

    const id = overrideUserId ?? context.userId;
    const entity = await this.worldApi.get(overrideUserId ?? context.userId);
    const around = overridePosition ?? entity?.position()?.v;
    okOrAPIError(around, "not_found", "No location found for user");

    const aabb = growAABB(
      [around, around],
      radius ?? CONFIG.devBootstrapRadius
    );

    yield {
      secondsSinceEpoch: secondsSinceEpoch(),
      chat: await this.exportChat(
        compact([id, entity?.playerCurrentTeam()?.team_id])
      ),
    };
    const controller = this.controller.chain(context.signal);
    try {
      const batch: WrappedChange[] = [];
      for await (const [version, lazyEntity] of this.askApi.scanForExport(
        {
          versionMap,
          aabb,
        },
        controller.signal
      )) {
        const entity = lazyEntity.materialize() as Entity;
        if (entity.id === id && overridePosition) {
          entity.position = { v: overridePosition };
        }
        batch.push(
          new WrappedChange(stateToChange(entity.id, version, entity))
        );
        if (batch.length >= 100) {
          yield { ecs: batch };
          batch.length = 0;
        }
      }
      if (batch.length > 0) {
        yield { ecs: batch };
      }
      yield { complete: true };
    } finally {
      controller.abort();
    }
  }

  async changeRadius(context: WebSocketRpcContext, radius: number) {
    const scanner = this.contextClient(context).scanner;
    if (scanner) {
      scanner.updateRadius(radius);
      scanner.flush();
    }
  }

  private recordPlaytime(userId: BiomesId, timeMs: number) {
    if (!userId) {
      return;
    }
    this.controller.runInBackground("updatePlaytime", async () =>
      this.worldApi.leaderboard().record("playTime", "INCR", userId, timeMs)
    );
  }

  private notifyNewSession(
    uniqueId: string,
    userId: BiomesId,
    firstLoad: boolean
  ) {
    if (!userId) {
      return;
    }
    this.controller.runInBackground("notifyNewSession", async () => {
      await this.firehose.publish({
        kind: "newSession",
        entityId: userId,
      });
    });
    if (
      firstLoad &&
      (CONFIG.gremlinsChanceToChat > 0 ||
        !RESERVED_GREMLIN_IDS.includes(userId))
    ) {
      this.controller.runInBackground("notifyNewSession", async () => {
        const position = this.index.getLastApproximateLocation(userId);
        if (!position) {
          return;
        }
        await this.chatApi.sendMessage({
          id: `new_${userId}_${uniqueId}`,
          channel: "chat",
          spatial: {
            position: position as Vec3f,
            volume: CONFIG.chatEnterWorldVolume,
          },
          from: userId,
          message: {
            kind: "new_session",
          },
        });
      });
    }
  }

  private async *streamDeltas(
    context: WebSocketRpcContext,
    {
      radius,
      versionMap,
      compressedVersionMap,
      bootstrapped: notFirstLoad,
      syncTarget,
    }: SyncSubscribeRequest
  ): AsyncIterable<SyncDelta> {
    const client = this.contextClient(context);

    const { fullId, signal, clientSessionId } = context;
    const firstLoad = !notFirstLoad;

    log.info(`${fullId}: Starting sync.`, {
      userId: client.userId,
      syncTarget,
    });
    const sync = client.createSync(
      context.serverSessionId,
      radius ?? CONFIG.defaultSyncRadius,
      compressedVersionMap
        ? decodeVersionMap(
            zrpcDeserialize(
              await gunzip(compressedVersionMap),
              zEncodedVersionMap
            )
          )
        : decodeVersionMap(versionMap),
      syncTarget
    );

    try {
      yield {
        ...(await sync.bootstrap()),
        bootstrapComplete: true,
        secondsSinceEpoch: secondsSinceEpoch(),
        buildId: process.env.BUILD_ID,
      };
      this.notifyNewSession(clientSessionId, client.userId, firstLoad);
      log.info(`${fullId}: Bootstrap complete, starting updates.`);

      const lastUpdatedPlaytime = new Timer();
      const lastUpdatedClock = new Timer();
      const sessionLifetime = new Timer();
      let reportedPlaytimeFunnel = false;
      const lastUpdatedPlayerCount = new Timer(TimerNeverSet);
      let lastSentPlayers = 1;
      do {
        // Ensure they stay active in the world.
        await client.keepAlivePlayer();

        // Record increased playing time.
        if (lastUpdatedPlaytime.elapsed > CONFIG.syncUpdatePlaytimeIntervalMs) {
          this.recordPlaytime(client.userId, lastUpdatedPlaytime.elapsed);
          lastUpdatedPlaytime.reset();
        }

        // Potentially give a clock update.
        if (lastUpdatedClock.elapsed > CONFIG.syncTimeUpdateIntervalMs) {
          yield { secondsSinceEpoch: secondsSinceEpoch() };
          lastUpdatedClock.reset();
        }

        // Potentially give them a role.
        if (
          sessionLifetime.elapsed > CONFIG.discordPlaytesterRoleTimeThresholdMs
        ) {
          client.grantPlaytesterRole();
        }

        // Funnel logging.
        if (
          !reportedPlaytimeFunnel &&
          sessionLifetime.elapsed > 10 * 60 * 1000 // 10 minutes.
        ) {
          reportedPlaytimeFunnel = true;
          reportFunnelStage("playedTenMinutes", {
            userId: client.userId,
          });
        }

        // Potentially update the player count.
        if (
          lastSentPlayers !== this.index.playerCount &&
          lastUpdatedPlayerCount.elapsed >
            CONFIG.syncUpdatePlayerCountThrottleMs
        ) {
          const [tick] = await this.worldApi.getWithVersion(WorldMetadataId);
          lastUpdatedPlayerCount.reset();
          lastSentPlayers = this.index.playerCount;
          yield {
            ecs: [
              new WrappedSyncChange({
                kind: "update",
                tick,
                entity: {
                  id: WorldMetadataId,
                  synthetic_stats: SyntheticStats.create({
                    online_players: lastSentPlayers,
                  }),
                },
              }),
            ],
          };
        }

        // Yield any updates
        const maxSyncEvents =
          (CONFIG.syncMaxUpdatesPerSecond * CONFIG.syncMinIntervalMs) / 1000;
        const delta = sync.pull(maxSyncEvents);
        if (delta) {
          yield delta;
        }
      } while (await sleep(CONFIG.syncMinIntervalMs, signal));
    } catch (error: any) {
      log.error(`${fullId}: Sync error`, { error });
    } finally {
      await sync.stop();
      log.info(`${fullId}: Disconnected.`);
    }
  }

  subscribe(
    context: WebSocketRpcContext,
    request: SyncSubscribeRequest
  ): AsyncIterable<SyncDelta> {
    return this.controller.runGenerator(
      `sync:${context.fullId}`,
      async (signal) => {
        context.signal = signal;
        return this.streamDeltas(context, request);
      },
      undefined,
      context.signal
    );
  }

  async stop(): Promise<void> {
    await this.controller.abortAndWait();
  }
}
