import { ClientIo } from "@/client/game/context_managers/client_io";
import type { SendMessageRequest } from "@/pages/api/chat/message";
import {
  getStateChangeEvents,
  initializeState,
  tickGremlinState,
} from "@/server/gizmo/actions";
import type { GizmoEcs } from "@/server/gizmo/ecs";
import { RESERVED_GREMLIN_IDS } from "@/server/gizmo/reserved_ids";
import type { GremlinState } from "@/server/gizmo/state";
import { getBounds } from "@/server/gizmo/util";
import { serializeAuthCookies } from "@/server/shared/auth/cookies";
import { HostPort } from "@/server/shared/ports";
import { SessionStore } from "@/server/web/db/sessions";
import { DisconnectPlayerEvent } from "@/shared/ecs/gen/events";
import { encodeVersionMap } from "@/shared/ecs/version";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { createCounter } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import { FixedRateTicker } from "@/shared/util/fixed_rate_ticker";
import { getNowMs, randomString } from "@/shared/util/helpers";
import { ok } from "assert";

function generateGremlinName(id: BiomesId) {
  const idx = RESERVED_GREMLIN_IDS.indexOf(id);
  if (idx === -1) {
    return `Gremlin${randomString(4).toUpperCase()}`;
  }
  return `Gremlin${idx.toString(16).toUpperCase()}`;
}

function randomTimeWithinRange(rangeMs: [number, number]) {
  const rangeSize = rangeMs[1] - rangeMs[0];
  return getNowMs() + (Math.random() * rangeSize + rangeMs[0]);
}

const gremlinActionStart = createCounter({
  name: "gremlin_action_start",
  help: "How often a gremlin starts an action",
  labelNames: ["action"],
});

export class Gremlin {
  private readonly displayName: string;
  private readonly entityVersions = new Map<BiomesId, number>();
  private readonly fixedRateAiTicker = new FixedRateTicker(performance.now());
  private io: ClientIo | undefined;
  private timeInState = 0;
  private state: GremlinState | undefined = undefined;
  private lastConnect: Timer | undefined;
  private nextReconnectTime: number | undefined;

  constructor(public readonly id: BiomesId, private readonly ecs: GizmoEcs) {
    this.displayName = generateGremlinName(id);
    this.nextReconnectTime = randomTimeWithinRange(
      CONFIG.gremlinsWaitBeforeInitialConnectRangeMs
    );
    const secondsToConnect = (this.nextReconnectTime - getNowMs()) / 1000.0;
    log.info(
      `Created Gremlin: "${
        this.displayName
      }" ("${id}") connecting in ${secondsToConnect.toFixed(2)} seconds.`
    );
  }

  async tick() {
    if (!this.ecs.table.get(this.id)) {
      // We don't exist, stop.
      return this.disconnect();
    }

    if (!(await this.tickConnectivity())) {
      return;
    }
    // Make sure that AI runs at deterministic fixed ticks.
    const numTicks = this.fixedRateAiTicker.advanceClock(
      getNowMs(),
      CONFIG.gremlinsTickIntervalMs,
      2
    );
    for (let i = 0; i < numTicks; ++i) {
      this.tickAi();
    }
    // Chat not on the physics ticks as that'd be too spammy.
    await this.maybeChatNow();
  }

  private async maybeChatNow() {
    const message = this.state?.messages.shift();
    if (!message) {
      return;
    }
    try {
      const request: SendMessageRequest = {
        localTime: Date.now(),
        volume: "chat",
        message,
      };
      await fetch(HostPort.forWeb().url + "/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: serializeAuthCookies({
            userId: this.id,
            id: this.createSessionId(),
          }),
        },
        body: JSON.stringify(request),
      });
    } catch (error) {
      log.error("Gremlin could not send chat message!", {
        id: this.id,
        error,
      });
    }
  }

  private advanceState() {
    if (this.state === undefined) {
      log.debug("Gremlin state initializing");
      return initializeState(getBounds(this.ecs.resources));
    }
    const dt = CONFIG.gremlinsTickIntervalMs / 1000;
    this.timeInState += dt;
    const newState = tickGremlinState({
      id: this.id,
      timeInState: this.timeInState,
      dt,
      prevState: this.state,
      resources: this.ecs.resources,
    });
    if (newState.action !== this.state.action) {
      this.timeInState = 0;
    }
    return newState;
  }

  private tickAi() {
    ok(this.io);
    const io = this.io;
    const newState = this.advanceState();

    const events = getStateChangeEvents(
      this.ecs.table,
      this.state,
      newState,
      this.id
    );
    const oldAction = this.state?.action?.constructor.name;
    const newAction = newState.action?.constructor.name;
    if (oldAction !== newAction) {
      log.debug(
        `${this.id} gremlin ${oldAction} -> ${newAction} (${events.length} events)`
      );
      gremlinActionStart.inc({ action: newAction });
    }
    this.state = newState;
    if (events.length === 0) {
      return;
    }
    void io.publish(events).catch((error) => {
      // Silence gremlin emit errors, it's okay if events don't go through,
      // that's normal if the connection is disconnected for any reason and
      // there are pending messages. We'll handle errors at the socket
      // level.
      log.debug("Gremlin failed to publish events", { error });
    });
  }

  private createSessionId() {
    return SessionStore.createGremlinSession(this.id).id;
  }

  // Connect the Gremlin
  private async connect() {
    this.nextReconnectTime = undefined;

    const url = new URL(
      "/beta-sync",
      new URL(HostPort.forGremlinsSync().url, undefined)
    ).toString();

    ok(!this.io);
    this.io = new ClientIo(
      {
        url,
        keepAliveIntervalMs: CONFIG.gremlinsKeepAliveMs,
        sessionIdForTest: SessionStore.createGremlinSession(this.id).id,
        displayName: this.displayName,
      },
      {
        fetch: async (ids) => ids.map((_) => [1, undefined]),
      },
      this.id,
      { accept: () => {} },
      {
        push: (changes) => {
          for (const change of changes) {
            if (change.kind === "delete") {
              this.entityVersions.delete(change.id);
            } else {
              this.entityVersions.set(change.entity.id, change.tick);
            }
          }
        },
      },
      () => encodeVersionMap(this.entityVersions)
    );

    await this.io.start();
    this.lastConnect = new Timer();
  }

  // Returns true if our connection is in a healthy state and ready to go.
  private async tickConnectivity() {
    if (this.io === undefined) {
      if (
        this.nextReconnectTime !== undefined &&
        getNowMs() > this.nextReconnectTime
      ) {
        await this.connect();
        return true;
      } else {
        return false;
      }
    }
    if (
      this.lastConnect !== undefined &&
      this.lastConnect.elapsed > CONFIG.gremlinsDisconnectAfterMs
    ) {
      await this.disconnect();
      return false;
    }
    if (
      !this.io ||
      this.io.channelStats.status !== "ready" ||
      !this.io.bootstrapped
    ) {
      return false;
    }

    return true;
  }

  async stop() {
    if (!this.io) {
      return;
    }
    try {
      await this.io.publish([new DisconnectPlayerEvent({ id: this.id })]);
    } catch (error) {
      // ignore all errors in disconnect.
    }
    const stopPromise = this.io.stop("gremlin disconnecting");
    this.io = undefined;
    return stopPromise;
  }

  async disconnect() {
    this.nextReconnectTime = randomTimeWithinRange(
      CONFIG.gremlinsWaitBeforeReconnectRangeMs
    );
    this.lastConnect = undefined;
    await this.stop();
  }
}
