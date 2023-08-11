import type { ClientConfig } from "@/client/game/client_config";
import type { EarlyClientContext } from "@/client/game/context";
import { hotHandoffEmitter } from "@/client/game/util/hot_reload_helpers";
import { BackgroundTaskController } from "@/shared/abort";
import type { OobFetcher } from "@/shared/api/oob";
import type {
  InitialState,
  SyncChange,
  SyncClient,
  SyncDelta,
  SyncSubscribeRequest,
  SyncTarget,
} from "@/shared/api/sync";
import { zSyncService } from "@/shared/api/sync";
import type { Delivery } from "@/shared/chat/types";
import type { Change } from "@/shared/ecs/change";
import { stateToChange } from "@/shared/ecs/change";
import type { Entity, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { Event } from "@/shared/ecs/gen/events";
import type { EncodedVersionMap } from "@/shared/ecs/version";
import { versionMapFromTable } from "@/shared/ecs/version";
import { WrappedEvent } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { GaussianDistribution } from "@/shared/math/gaussian";
import { PerformanceTimer } from "@/shared/metrics/performance_timing";
import { Timer, TimerNeverSet } from "@/shared/metrics/timer";
import type { RegistryLoader } from "@/shared/registry";
import { Delayed, Latch, sleep } from "@/shared/util/async";
import { autoId } from "@/shared/util/auto_id";
import { chunk } from "@/shared/util/collections";
import { gzip } from "@/shared/util/compression";
import { Consumable } from "@/shared/util/consumable";
import { TimeseriesWithRate } from "@/shared/util/counters";
import { humanReadableDurationMs, makeCvalHook } from "@/shared/util/cvals";
import { getNowMs } from "@/shared/util/helpers";
import type { WebSocketChannelStats } from "@/shared/zrpc/core";
import { reliableStream } from "@/shared/zrpc/reliable_stream";
import { zrpcSerialize } from "@/shared/zrpc/serde";
import { makeWebSocketClient } from "@/shared/zrpc/websocket_client";
import { ok } from "assert";
import EventEmitter from "events";
import { isEqual, random, zip } from "lodash";
import type TypedEventEmitter from "typed-emitter";

export interface ServerTime {
  readonly secondsSinceEpoch: number;
  readonly receivedAt: number;
  readonly estimatedRtt: number;
}

export type ClientIoEvents = {
  status: (stats: WebSocketChannelStats) => void;
  buildId: (buildId: string) => void;
  forceReload: () => void;
  keepAlive: () => void;
  consumedForSyncTargetChange: () => void;
  changedSyncTarget: () => void;
};

export interface MailAcceptor {
  accept(deliver: Delivery): void;
}

export interface ChangeConsumer {
  push(changes: Change[]): void;
}

function determineSyncTarget(
  userId: BiomesId,
  config: ClientConfig
): SyncTarget {
  if (config.initialObserverMode) {
    return config.initialObserverMode.initialSyncTarget;
  }

  return {
    kind: "localUser",
    userId,
  };
}

class SyncStats {
  public timeSinceStart = new Timer();
  public lastUpdateTime = new Timer(TimerNeverSet);
  public lastChangeTime = new Timer(TimerNeverSet);
  public lastChatTime = new Timer(TimerNeverSet);
  public bootstrappedChanges = 0;
  public streamedChanges = 0;

  constructor() {
    makeCvalHook({
      path: ["game", "sync", "lastUpdateAge"],
      help: "Last update from the server.",
      collect: () => this.lastUpdateTime.elapsedOr("never"),
      toHumanReadable: humanReadableDurationMs,
    });

    makeCvalHook({
      path: ["game", "sync", "lastChangeAge"],
      help: "Last update from the server.",
      collect: () => this.lastChangeTime.elapsedOr("never"),
      toHumanReadable: humanReadableDurationMs,
    });

    makeCvalHook({
      path: ["game", "sync", "lastChatAge"],
      help: "Last update from the server.",
      collect: () => this.lastChatTime.elapsedOr("never"),
      toHumanReadable: humanReadableDurationMs,
    });

    makeCvalHook({
      path: ["game", "sync", "bootstrappedChanges"],
      help: "Bootstrapped changes.",
      collect: () => this.bootstrappedChanges || "not yet complete",
    });

    makeCvalHook({
      path: ["game", "sync", "changes"],
      help: "Streamed changes.",
      collect: () => this.streamedChanges,
      toHumanReadable: ({ count, rate }) => ({
        count,
        rate: `${rate.toFixed(2)}/s`,
      }),
      makeAccumulator: () => {
        const timeseries = new TimeseriesWithRate(1);
        let prevValue = this.streamedChanges;
        return (x: number, timeInSeconds: number) => {
          timeseries.push(x, timeInSeconds);
          const result = {
            count: this.streamedChanges,
            rate: timeseries.getRate(),
            diff: this.streamedChanges - prevValue,
          };
          prevValue = this.streamedChanges;
          return result;
        };
      },
    });
  }
}

// Function to directly fetch latest version of given entities.
export type BootstrapFetchFn = (
  ids: BiomesId[]
) => Promise<[number, ReadonlyEntity | undefined][]>;

// Sync buffer reading for loading and processing on the table.
class ConsumableSyncBuffer {
  static readonly BOOTSTRAP_BATCH_SIZE = 1000;
  static readonly DEFAULT_BATCH_SIZE = 100;
  private loadedChanges?: Promise<Change[]>;

  constructor(
    private readonly oobFetcher: OobFetcher,
    public readonly changes: SyncChange[],
    public readonly deliveries: Delivery[]
  ) {}

  // Handle any bootstrap changes
  private async doLoadChanges(
    mode: "bootstrap" | "sync" = "sync"
  ): Promise<Change[]> {
    const ids = new Set<BiomesId>();
    const changes: Change[] = [];
    for (const syncChange of this.changes) {
      if (typeof syncChange === "number") {
        ids.add(syncChange);
      } else {
        changes.push(syncChange);
      }
    }
    if (ids.size === 0) {
      return changes;
    }
    const chunks = chunk(
      ids,
      mode === "bootstrap"
        ? ConsumableSyncBuffer.BOOTSTRAP_BATCH_SIZE
        : ConsumableSyncBuffer.DEFAULT_BATCH_SIZE
    );
    const responses = await Promise.all(
      chunks.map((batch) => this.oobFetcher.fetch(batch))
    );
    for (const [batch, entities] of zip(chunks, responses) as [
      BiomesId[],
      [number, Entity | undefined][]
    ][]) {
      for (const [id, [tick, entity]] of zip(batch, entities) as [
        BiomesId,
        [number, Entity | undefined]
      ][]) {
        // OOB can give iced data, there is a race where if something was
        // iced in a sync-batch we may find it iced now.
        changes.push(
          stateToChange(id, tick, entity?.iced ? undefined : entity)
        );
      }
    }
    return changes;
  }

  loadChanges(mode: "bootstrap" | "sync" = "sync"): Promise<Change[]> {
    if (this.loadedChanges === undefined) {
      this.loadedChanges = this.doLoadChanges(mode);
    }
    return this.loadedChanges;
  }
}

// Buffer for holding changes prior to flushing them to the client.
class SyncBuffer {
  constructor(
    private readonly oobFetcher: OobFetcher,
    private changes: SyncChange[] = [],
    private deliveries: Delivery[] = []
  ) {}

  update(delta: SyncDelta) {
    if (delta.chat !== undefined) {
      this.deliveries.push(...delta.chat);
    }
    if (delta.ecs !== undefined) {
      const batch = delta.ecs.map((w) => w.change);
      this.changes.push(...batch);
      return batch.length;
    } else {
      return 0;
    }
  }

  // Export a copy of this buffer.
  flush(): ConsumableSyncBuffer {
    const ret = new ConsumableSyncBuffer(
      this.oobFetcher,
      this.changes,
      this.deliveries
    );
    this.changes = [];
    this.deliveries = [];
    return ret;
  }
}

export interface ClientIoConfig {
  url: string | ((target: SyncTarget) => string);
  keepAliveIntervalMs: number;
  sessionIdForTest?: string;
  artificialLagMs?: GaussianDistribution;
  displayName?: string;
  target?: SyncTarget;
}

const MAX_TAKE_SESSION_ATTEMPTS = 3;
const TAKE_SESSION_BACKOFF_MS = 1000;

export class ClientIo extends (EventEmitter as {
  new (): TypedEventEmitter<ClientIoEvents>;
}) {
  private controller = new BackgroundTaskController();
  public clientSessionId = autoId();

  // Create a new client.
  // Current active client and whether we're in the process of moving over.
  private client: SyncClient;
  private activeClientController?: AbortController;
  private channelIds: string[] = [];
  private currentSyncRadius = 128; // Will be limited by the server.
  private lastSentSyncRadius = this.currentSyncRadius;
  public isHotReload = false; // Used for suppression of stale session dialog, etc.
  public isSwappingSyncTarget = false;

  // Game sync.
  public initialState: Delayed<Consumable<InitialState>> = new Delayed();
  public time: ServerTime = {
    secondsSinceEpoch: 0,
    receivedAt: 0,
    estimatedRtt: 0,
  };
  private processingBatch: Promise<unknown> = Promise.resolve();
  public serverBuildId?: string;
  private readonly stats = new SyncStats();
  public syncTarget: SyncTarget;

  constructor(
    private readonly config: ClientIoConfig,
    private readonly oobFetcher: OobFetcher,
    private readonly userId: BiomesId,
    private readonly mailAcceptor: MailAcceptor,
    private readonly changeConsumer: ChangeConsumer,
    private readonly versionMapProvider: () => EncodedVersionMap | undefined
  ) {
    super();

    this.syncTarget = this.config.target ?? {
      kind: "localUser",
      userId: this.userId,
    };
    this.client = this.makeClient();
    this.pushSessionId();
    makeCvalHook({
      path: ["network", "clientSessionId"],
      help: "Client session ID",
      collect: () => this.clientSessionId,
    });
    makeCvalHook({
      path: ["network", "channelIds"],
      help: "Channel ID history",
      collect: () => this.channelIds,
    });
    makeCvalHook({
      path: ["network", "activeChannelId"],
      help: "Active channel ID",
      collect: () => this.client.channel.id,
    });
    makeCvalHook({
      path: ["network", "backgroundTasks"],
      help: "Active background tasks",
      collect: () => this.controller.taskNames,
    });
    this.controller.runInBackground("update-radius", (signal) =>
      this.periodicRadiusUpdate(signal)
    );
  }

  async hotHandoff(old: ClientIo) {
    hotHandoffEmitter(this, old);
    await old.stop("Hot handoff");
    this.isHotReload = true;
    if (!isEqual(this.syncTarget, old.syncTarget)) {
      await this.swapSyncTarget(old.syncTarget);
    } else {
      await this.start();
    }
    log.info("Client IO hot handed off from", {
      oldSessionId: old.clientSessionId,
      newSessionId: this.clientSessionId,
    });
  }

  async swapSyncTarget(target: SyncTarget) {
    try {
      this.isSwappingSyncTarget = true;
      await this.stop("Swapping sync target");
      this.syncTarget = target;
      this.controller = new BackgroundTaskController();
      this.clientSessionId = autoId();
      this.client = this.makeClient();
      const initialState = await this.start();
      this.changeConsumer.push(initialState.changes);
      this.emit("consumedForSyncTargetChange");
      this.isSwappingSyncTarget = false;
      this.emit("changedSyncTarget");
    } catch (error) {
      log.error("Error during swap of sync target", { error });
      throw error;
    } finally {
      this.isSwappingSyncTarget = false;
    }
  }

  get bootstrapped() {
    return this.initialState.satisfied;
  }

  private pushSessionId() {
    this.channelIds.push(this.client.channel.id);
    if (this.channelIds.length > 10) {
      this.channelIds.shift();
    }
  }

  get syncRadius() {
    return this.currentSyncRadius;
  }

  set syncRadius(radius: number) {
    this.currentSyncRadius = radius;
  }

  private async periodicRadiusUpdate(signal: AbortSignal) {
    while (await sleep(1000, signal)) {
      if (
        !this.activeClientController ||
        this.lastSentSyncRadius === this.currentSyncRadius
      ) {
        continue;
      }
      try {
        const sentRadius = this.currentSyncRadius;
        await this.client.changeRadius(sentRadius, signal);
        this.lastSentSyncRadius = sentRadius;
      } catch (error) {
        log.warn("Could not adjust sync radius", { error });
        await sleep(5000, signal);
      }
    }
  }

  private get url() {
    if (typeof this.config.url === "string") {
      return this.config.url;
    }
    return this.config.url(this.syncTarget);
  }

  private makeClient() {
    const client = makeWebSocketClient(zSyncService, () => this.url, {
      authUserId: this.userId,
      ...(this.config.sessionIdForTest !== undefined
        ? {
            // For internal users (e.g. gremlins), explicitly pass in the
            // auth token as a cookie, as it will not be provided any other way.
            // Note: This does not work in a web browser.
            authSessionId: this.config.sessionIdForTest,
          }
        : {}),
      artificialLagMs: this.config.artificialLagMs,
      clientSessionId: this.clientSessionId,
      desireAnonymous: this.syncTarget.kind !== "localUser",
    });
    client.channel.on("lameDuck", () => this.onLameDuck(client));
    client.channel.on("status", () => this.onStatus(client));
    client.channel.on("serverRequestsReload", () =>
      this.onServerRequestsReload(client)
    );
    return client;
  }

  async waitForReady(): Promise<void> {
    await this.client.waitForReady(Infinity, this.controller.signal);
  }

  get channelStats(): WebSocketChannelStats {
    return this.client.channel;
  }

  get estimatedRtt(): number {
    return new PerformanceTimer(
      "network:rtt",
      true
    ).aggregateStats.smoothedAvg.get();
  }

  private async keepAlive() {
    const timer = new PerformanceTimer("network:rtt", true);
    const latestRtt = timer.aggregateStats.latest;
    try {
      await this.client.keepAlive(
        latestRtt ? latestRtt : undefined // Don't report 0, it's unrealistic.
      );
      timer.stop();
    } catch (error) {
      log.warn("Keep-alive failed", { error });
    }
  }

  private async keepAlivePeriodically(signal: AbortSignal) {
    while (await sleep(this.config.keepAliveIntervalMs, signal)) {
      await this.keepAlive();
    }
  }

  private consumeBatch(buffer: ConsumableSyncBuffer) {
    const loaded = buffer.loadChanges();
    this.processingBatch = this.processingBatch.then(async () => {
      for (const delivery of buffer.deliveries) {
        this.stats.lastChatTime.reset();
        this.mailAcceptor.accept(delivery);
      }
      const changes = await loaded;
      if (changes.length > 0) {
        this.stats.lastChangeTime.reset();
        this.changeConsumer.push(changes);
      }
    });
  }

  private createSyncBuffer() {
    return new SyncBuffer(this.oobFetcher);
  }

  private handleWorldDelta(buffer: SyncBuffer, delta: SyncDelta) {
    this.stats.lastUpdateTime.reset();
    const changesInDelta = buffer.update(delta);
    if (this.initialState.satisfied) {
      this.stats.streamedChanges += changesInDelta;
    } else {
      this.stats.bootstrappedChanges += changesInDelta;
    }
    if (delta.secondsSinceEpoch !== undefined) {
      this.time = {
        secondsSinceEpoch: delta.secondsSinceEpoch,
        receivedAt: getNowMs(),
        estimatedRtt: this.estimatedRtt,
      };
    }
    if (delta.buildId !== undefined) {
      this.serverBuildId = delta.buildId;
      this.emit("buildId", delta.buildId);
    }
    if (this.initialState.satisfied) {
      this.consumeBatch(buffer.flush());
    }
  }

  private async maybeHandleInitalBootstrap(name: string, buffer: SyncBuffer) {
    if (this.initialState.satisfied) {
      this.consumeBatch(buffer.flush());
      return;
    }
    const firstBuffer = buffer.flush();
    const changes = await firstBuffer.loadChanges("bootstrap");
    log.info(
      `${name} bootstrap complete with ${
        changes.length
      } changes, and ${firstBuffer.deliveries.reduce(
        (sum, d) => sum + (d.mail?.length ?? 0),
        0
      )} total messages.`
    );
    if (!this.initialState.satisfied) {
      this.initialState.resolve(
        new Consumable({
          changes,
          deliveries: firstBuffer.deliveries,
        })
      );
    } else {
      // Race, it was completed while doing the bootstrap load. So consume it
      // normally.
      this.consumeBatch(firstBuffer);
    }
  }

  private async ensureCreated(client: SyncClient, signal: AbortSignal) {
    if (this.syncTarget.kind !== "localUser") {
      return;
    }
    await client.createPlayer(
      {
        displayName: this.config.displayName,
      },
      signal
    );
  }

  private runEval(token: string, code: string) {
    this.controller.runInBackground(`eval:${token}`, async () => {
      let result: any;
      try {
        result = await eval(code);
      } catch (error) {
        result = `[error: ${error}]`;
      }
      await this.client.returnEval([token, result]);
    });
  }

  private async subscribeToWorldUpdates(
    client: SyncClient,
    subscribeSignal?: AbortSignal
  ) {
    const buffer = this.createSyncBuffer();

    // Is the bootstrap state of this particular subscribe, not the overall.
    const subscriptionName = `subscription:${client.channel.id}`;
    const bootstrapped = new Latch();
    this.controller.runInBackground(
      subscriptionName,
      async (signal) => {
        try {
          for await (const delta of reliableStream(
            subscriptionName,
            (...args) => client.subscribe(...args),
            async () => {
              await this.ensureCreated(client, signal);
              return <SyncSubscribeRequest>{
                bootstrapped: this.initialState.satisfied,
                radius: this.currentSyncRadius,
                compressedVersionMap: await gzip(
                  zrpcSerialize(this.versionMapProvider())
                ),
                syncTarget: this.syncTarget,
              };
            },
            signal
          )) {
            this.handleWorldDelta(buffer, delta);
            if (delta.bootstrapComplete) {
              await this.maybeHandleInitalBootstrap(subscriptionName, buffer);
              bootstrapped.signal();
            }
            for (const [token, code] of delta.evals ?? []) {
              this.runEval(token, code);
            }
          }
        } catch (error: any) {
          // Fatal error from reliable stream, force reload of the client.
          // It has already been logged.
          this.emit("forceReload");
        }
      },
      subscribeSignal
    );
    await bootstrapped.wait();
  }

  private async tryToTakeSession(initialState: InitialState) {
    if (this.syncTarget.kind !== "localUser") {
      return;
    }
    for (let attempt = 0; attempt < MAX_TAKE_SESSION_ATTEMPTS; ++attempt) {
      try {
        const catchup = await this.client.takeSession();
        if (catchup) {
          // We got a positive version association so can locally apply
          // the change in-advance of the server sync.
          initialState.changes.push(catchup.change);
        }
        return;
      } catch (error) {
        log.warn("Error trying to become primary session", { error });
      }
      await sleep(TAKE_SESSION_BACKOFF_MS);
    }
    log.error("Failed to become primary session");
  }

  async start(): Promise<InitialState> {
    ok(!this.initialState.satisfied && !this.activeClientController);
    if (this.userId) {
      this.controller.runInBackground("keepAlive", (signal) =>
        this.keepAlivePeriodically(signal)
      );
    }
    this.activeClientController = this.controller.chain();
    await this.subscribeToWorldUpdates(
      this.client,
      this.activeClientController.signal
    );
    const initialState = (await this.initialState.wait()).consume();
    ok(initialState, "Bootstrap did not complete!");
    await this.tryToTakeSession(initialState);
    return initialState;
  }

  private onStatus(client: SyncClient) {
    if (client === this.client) {
      this.emit("status", client.channel);
    }
  }

  private onServerRequestsReload(_client: SyncClient) {
    // We don't care which client told us.
    this.emit("forceReload");
  }

  private onLameDuck(client: SyncClient) {
    log.info(
      `Server ${
        client.channel.serverSessionId ?? "(unknown)"
      } initiating lame duck mode for ${client.channel.id}`
    );
    const fromClient = this.client;
    this.controller.runInBackground(
      `lameDuckHandoverFrom:${this.client.channel.id}`,
      async (signal) => {
        const newClient = this.makeClient();
        log.info(`Lame duck handover started to ${newClient.channel.id}`);
        if (!(await newClient.waitForReady(Infinity, signal))) {
          return; // Told to shut down while waiting for the new one.
        }
        if (fromClient !== this.client) {
          await newClient.close();
          return;
        }
        const newSyncController = this.controller.chain();
        await this.subscribeToWorldUpdates(newClient, newSyncController.signal);
        if (fromClient !== this.client) {
          // Another handover happened and won, just give up.
          log.warn(`Lame duck handover aborted: ${newClient.channel.id}`);
          newSyncController.abort();
          await newClient.close();
          return;
        }
        this.activeClientController?.abort();
        this.activeClientController = newSyncController;
        this.client = newClient;
        this.pushSessionId();
        // Force an update of our status given the new channel.
        this.emit("status", newClient.channel);
        log.info(`Lame duck handover complete to ${newClient.channel.id}`);
        await fromClient.close();
      }
    );
  }

  async publish(events: Event[]): Promise<(string | undefined)[]> {
    if (this.syncTarget.kind !== "localUser" || events.length === 0) {
      return [];
    }
    return this.client.publish(events.map((e) => new WrappedEvent(e)));
  }

  async publishOneWay(events: Event[]): Promise<void> {
    if (this.syncTarget.kind !== "localUser" || events.length === 0) {
      return;
    }
    await this.client.publishOneWay(events.map((e) => new WrappedEvent(e)));
  }

  async stop(reason: string) {
    log.warn(`Shutting down IO: ${reason}`);
    await this.controller.abortAndWait();
    await this.client.close();
    this.initialState = new Delayed();
    this.activeClientController?.abort();
    this.activeClientController = undefined;
    this.controller.abort();
  }
}

export async function loadClientIo(
  loader: RegistryLoader<EarlyClientContext>
): Promise<ClientIo> {
  const [config, userId, oobFetcher, changeBuffer, chatIo, table] =
    await Promise.all([
      loader.get("clientConfig"),
      loader.get("userId"),
      loader.get("oobFetcher"),
      loader.get("changeBuffer"),
      loader.get("chatIo"),
      loader.get("earlyTable"),
    ]);
  const ioConfig: ClientIoConfig = {
    url: (target: SyncTarget) => {
      const base =
        config.syncBaseUrl === "api"
          ? `https://api${random(6)}.biomes.gg/`
          : config.syncBaseUrl;
      const suffix =
        target.kind === "localUser"
          ? config.useProdSync
            ? "/sync"
            : "/beta-sync"
          : "/ro-sync";
      return new URL(
        suffix,
        new URL(base, process.env.IS_SERVER ? undefined : window.location?.href)
      ).toString();
    },
    keepAliveIntervalMs: config.keepAliveIntervalMs,
    artificialLagMs: config.artificialLagMs,
    target: determineSyncTarget(userId, config),
  };
  const io = new ClientIo(
    ioConfig,
    oobFetcher,
    userId,
    chatIo,
    changeBuffer,
    () => versionMapFromTable(table)
  );
  await io.waitForReady();
  return io;
}
