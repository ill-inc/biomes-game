import {
  ensurePlayerExists,
  keepAlivePlayer,
} from "@/server/logic/utils/players";
import type { LazyChange } from "@/server/shared/ecs/lazy";
import type { SingleEvalResponse } from "@/server/sync/api";
import type { SyncServerContext } from "@/server/sync/context";
import { ClientEventBatcher } from "@/server/sync/events/event_batcher";
import { ChatObserver } from "@/server/sync/subscription/chat_observer";
import { Observer } from "@/server/sync/subscription/game_observer";
import { Scanner } from "@/server/sync/subscription/scanner";
import { BackgroundTaskController } from "@/shared/abort";
import type {
  SyncDelta,
  SyncTarget,
  WrappedSyncChange,
} from "@/shared/api/sync";
import type { Delivery } from "@/shared/chat/types";
import { PlayerSession } from "@/shared/ecs/gen/components";
import type { Event } from "@/shared/ecs/gen/events";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { VersionMap } from "@/shared/ecs/version";
import { INVALID_BIOMES_ID, type BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { Timer, TimerNeverSet } from "@/shared/metrics/timer";
import { Delayed, sleep, yieldToOthers } from "@/shared/util/async";
import { removeValue } from "@/shared/util/collections";
import { RpcError, okOrRpcError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import { ok } from "assert";
import { EventEmitter } from "events";
import { compact } from "lodash";
import type TypedEventEmitter from "typed-emitter";

export type AnonClientId = string & { readonly "": unique symbol };

export type ClientId = BiomesId | AnonClientId;

export function isRealUser(id: ClientId): id is BiomesId {
  return typeof id === "number";
}
export interface ClientEventHandler {
  readonly size: number;
  push(event: Event | undefined): Promise<void>;
  flush(): boolean;
}

export type ActiveClientSyncEvents = {
  closed: () => void;
};

export class ActiveClientSync extends (EventEmitter as {
  new (): TypedEventEmitter<ActiveClientSyncEvents>;
}) {
  private readonly controller = new BackgroundTaskController();
  private readonly chatObserver?: ChatObserver;
  private readonly observer: Observer;
  private readonly evals = new Map<string, Delayed<any>>();
  private readonly pendingEvals: [string, string][] = [];

  constructor(
    context: SyncServerContext,
    private readonly clientId: ClientId,
    private readonly serverSessionId: string,
    scanner: Scanner,
    versionMap: VersionMap,
    syncTarget: SyncTarget
  ) {
    super();
    this.observer = new Observer(context, syncTarget, versionMap, scanner);

    switch (syncTarget.kind) {
      case "localUser":
        ok(isRealUser(clientId), "Only real users can subscribe to themselves");
        this.chatObserver = new ChatObserver(context, syncTarget.userId);
        break;
    }
  }

  acceptEvalResponse(token: string, response: any) {
    this.evals.get(token)?.resolve(response);
  }

  eval(token: string, code: string): Promise<SingleEvalResponse> {
    const delayed = new Delayed<any>();
    this.evals.set(token, delayed);
    this.pendingEvals.push([token, code]);
    return delayed.wait().then((value) => ({
      clientId: String(this.clientId),
      sessionId: this.serverSessionId,
      result: value,
    }));
  }

  get pendingChanges() {
    return this.observer.pendingChanges;
  }

  get residentSetSize() {
    return this.observer.residentSetSize;
  }

  async stop() {
    for (const delayed of this.evals.values()) {
      delayed.resolve("[disconnected]");
    }
    this.evals.clear();
    try {
      this.observer.stop();
      await this.chatObserver?.stop();
      await this.controller.abortAndWait();
    } catch (error) {
      log.error("Error stopping client sync", { error });
    } finally {
      this.emit("closed");
    }
  }

  private makeDelta(
    changes?: WrappedSyncChange[],
    chat?: Delivery[]
  ): SyncDelta | undefined {
    if (!changes?.length && !chat?.length) {
      return undefined;
    }
    const delta: SyncDelta = {};
    if (changes?.length) {
      delta.ecs = changes;
    }
    if (chat?.length) {
      delta.chat = chat;
    }
    if (this.pendingEvals.length) {
      delta.evals = [...this.pendingEvals];
      this.pendingEvals.length = 0;
    }
    return delta;
  }

  async bootstrap(): Promise<SyncDelta | undefined> {
    const [changes, chat] = await Promise.all([
      this.observer.start(),
      this.chatObserver?.start(),
    ]);
    return this.makeDelta(changes, chat);
  }

  pull(count: number): SyncDelta | undefined {
    return this.makeDelta(this.observer.pull(count), this.chatObserver?.pull());
  }
}
export class Client {
  private readonly controller = new BackgroundTaskController();
  public lastUsed = new Timer();
  public scanner?: Scanner;
  private readonly events?: ClientEventHandler;
  private activeSyncs: ActiveClientSync[] = [];
  private lastKeepalive = new Timer(TimerNeverSet);
  private inflightRoleGrant?: Promise<void>;

  constructor(
    private readonly context: SyncServerContext,
    public readonly clientId: ClientId,
    public readonly gremlin: boolean
  ) {
    if (isRealUser(clientId)) {
      this.events = new ClientEventBatcher(
        context.eventHandlerMap,
        context.crossClientEventBatcher,
        clientId,
        context.syncIndex.getLastApproximateLocation(clientId)
      );
      this.controller.runInBackground("initialKeepAlive", async (signal) => {
        if (!signal.aborted) {
          await this.keepAlivePlayer();
        }
      });
    }
  }

  get userId() {
    return isRealUser(this.clientId) ? this.clientId : INVALID_BIOMES_ID;
  }

  get pendingChanges() {
    return this.activeSyncs.reduce((acc, sync) => acc + sync.pendingChanges, 0);
  }

  get residentSetSize() {
    return this.activeSyncs.reduce(
      (acc, sync) => acc + sync.residentSetSize,
      0
    );
  }

  get shouldGc() {
    return (
      this.activeSyncs.length === 0 &&
      this.lastUsed.elapsed > CONFIG.syncClientGcIntervalMs
    );
  }

  private async maybeStopScanner(signal: AbortSignal) {
    await sleep(CONFIG.wsZrpcTtlMs, signal);
    if (this.activeSyncs.length > 0) {
      return;
    }
    if (this.scanner) {
      const oldScanner = this.scanner;
      this.scanner = undefined;
      await oldScanner.stop();
    }
  }

  createSync(
    serverSessionId: string,
    radius: number,
    versionMap: VersionMap,
    syncTarget: SyncTarget
  ): ActiveClientSync {
    if (this.activeSyncs.length > CONFIG.syncMaxConcurrentSubscribes) {
      throw new RpcError(
        grpc.status.RESOURCE_EXHAUSTED,
        "Too many concurrent subscriptions"
      );
    }

    if (syncTarget.kind === "localUser") {
      okOrRpcError(
        isRealUser(this.clientId),
        grpc.status.INVALID_ARGUMENT,
        `Only real users can subscribe to their own player, got clientId ${this.clientId}`
      );
      okOrRpcError(
        this.clientId === syncTarget.userId,
        grpc.status.INVALID_ARGUMENT,
        `Only the user can subscribe to their own player, got userId ${syncTarget.userId}`
      );
    } else {
      okOrRpcError(
        !isRealUser(this.clientId),
        grpc.status.INVALID_ARGUMENT,
        `Only anon clients can observe, got client id ${this.clientId}`
      );
    }

    if (!this.scanner) {
      this.scanner = new Scanner(
        this.context.db,
        this.context.syncIndex,
        syncTarget.kind === "entity" ? syncTarget.entityId : this.userId,
        radius
      );
    }
    if (syncTarget.kind === "position") {
      this.scanner.updatePosition(syncTarget.position);
    }
    this.scanner.flush();
    const sync = new ActiveClientSync(
      this.context,
      this.clientId,
      serverSessionId,
      this.scanner,
      versionMap,
      syncTarget
    );
    this.activeSyncs.push(sync);
    sync.once("closed", () => {
      removeValue(this.activeSyncs, sync);
      this.controller.runInBackground("maybeStopScanner", (signal) =>
        this.maybeStopScanner(signal)
      );
      this.controller.runInBackground("stopPlayerMovement", () =>
        this.stopPlayer()
      );
    });
    return sync;
  }

  private async stopPlayer() {
    if (!isRealUser(this.clientId)) {
      return;
    }
    try {
      const editor = this.context.worldApi.edit();
      const player = await editor.get(this.clientId);
      if (player) {
        player.setRigidBody({ velocity: [0, 0, 0] });
        await editor.commit();
      }
    } catch (error) {
      log.warn("Failed to stop player movement", { error });
    }
  }

  private needsKeepAlive() {
    const ttl = this.gremlin
      ? CONFIG.gremlinsExpirationSecs
      : CONFIG.gamePlayerExpirationSecs;
    if (ttl === undefined) {
      return false;
    }
    return this.lastKeepalive.elapsed > (ttl * 1000) / 2;
  }

  async markActiveSession(id: string): Promise<LazyChange> {
    okOrRpcError(isRealUser(this.clientId), grpc.status.PERMISSION_DENIED);
    const { outcome, changes: eagerChanges } =
      await this.context.worldApi.apply({
        changes: [
          {
            kind: "update",
            entity: {
              id: this.clientId,
              player_session: PlayerSession.create({
                id,
              }),
            },
          },
        ],
        catchups: [[this.clientId, 0]],
      });
    ok(outcome === "success", "Failed to take session");
    ok(eagerChanges.length === 1);
    return eagerChanges[0];
  }

  grantPlaytesterRole() {
    if (!isRealUser(this.clientId) || this.inflightRoleGrant) {
      return;
    }
    this.inflightRoleGrant = this.context.discord
      .grantPlaytesterRole(this.clientId)
      .catch((error) => {
        log.error("Failed to grant player role", { error });
        // Clear it out so if they restart with another session we
        // try again (note internally there is a backoff in granting too)
        this.inflightRoleGrant = undefined;
      });
  }

  async eval(token: string, code: string) {
    const work: Promise<undefined | SingleEvalResponse>[] = [];
    for (const sync of this.activeSyncs) {
      work.push(sync.eval(token, code));
    }
    return compact(await Promise.all(work));
  }

  returnEval(token: string, result: any) {
    for (const sync of this.activeSyncs) {
      sync.acceptEvalResponse(token, result);
    }
  }

  async initPlayer(name: string): Promise<void> {
    if (!isRealUser(this.clientId)) {
      return;
    }

    const editor = this.context.worldApi.edit();
    await ensurePlayerExists(editor, this.clientId, name, this.gremlin);
    await editor.commit();
  }

  private async forceKeepAlive(): Promise<void> {
    if (!isRealUser(this.clientId)) {
      return;
    }
    this.lastKeepalive.reset();
    try {
      const editor = this.context.worldApi.edit();
      const [player, world] = await editor.get([
        this.clientId,
        WorldMetadataId,
      ]);
      ok(player);
      keepAlivePlayer({ player, world, isGremlin: this.gremlin });
      await editor.commit();
    } catch (error) {
      // Got an error, is more urgent.
      this.lastKeepalive.reset(TimerNeverSet);
    }
  }

  async keepAlivePlayer(): Promise<void> {
    if (this.needsKeepAlive()) {
      return this.forceKeepAlive();
    }
  }

  flush(): boolean {
    return this.events?.flush() ?? false;
  }

  async author(event: Event): Promise<void> {
    await this.events?.push(event);
  }

  dump(): any {
    return {
      clientId: this.clientId,
      last_used: this.lastUsed.elapsed,
      last_keepalive: this.lastKeepalive.elapsed,
      active_syncs: this.activeSyncs.length,
      scanner: this.scanner?.dump(),
      sync_resident_set: this.residentSetSize,
      pending_events: this.events?.size ?? 0,
      pending_changes: this.pendingChanges,
    };
  }

  async stop() {
    while (this.flush()) {
      await yieldToOthers();
    }
    await this.controller.abortAndWait();
  }
}
