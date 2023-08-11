import { startConfigWatchers } from "@/server/shared/config_watchers";
import { EventLoopUtilizationPoller } from "@/server/shared/event_loop_utilization_poller";
import { waitForAuthReady } from "@/server/shared/gce";
import {
  shutdownLinkerd,
  startLinkerdWatchman,
  waitForLinkerdReady,
} from "@/server/shared/linkerd";
import { exposeMetrics } from "@/server/shared/metrics";
import { handleProcessIssues } from "@/server/shared/process";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import type { ServerHooks } from "@/server/shared/server_hooks";
import { log } from "@/shared/logging";
import { EventLoopLagPoller } from "@/shared/metrics/event_loop_lag_poller";
import { createCounter, createGauge } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import { disableExperimentalWarnings } from "@/shared/node_warnings";
import type { WithStop } from "@/shared/registry";
import type { VoxelooModule } from "@/shared/wasm/types";
import { AbortError } from "abort-controller-x";
import dotenv from "dotenv";
import { hostname } from "os";

declare global {
  // To make debugging in production easier, we expose the context globally.
  /* eslint-disable no-var */
  var ctx: any;
  /* eslint-enable no-var */
}

export type ServerState =
  | "running"
  | "creatingContext"
  | "starting"
  | "ready"
  | "shutting_down";

const stateEnteredCount = createCounter({
  name: "biomes_init_state_entered_count",
  help: "Number of times the server has entered a given state",
  labelNames: ["state"],
});

const stateTimeMs = createCounter({
  name: "biomes_init_state_time_ms",
  help: "Time spent in each server state, recorded only exiting it",
  labelNames: ["state"],
});

class StateRecorder {
  #state: ServerState = "running";
  #timer = new Timer();

  constructor() {
    stateEnteredCount.inc({ state: this.#state });
  }

  get value() {
    return this.#state;
  }

  set value(newState: ServerState) {
    if (this.#state === newState) {
      return;
    }
    stateEnteredCount.inc({ state: newState });
    stateTimeMs.inc({ state: this.#state }, this.#timer.elapsedAndReset());
    this.#state = newState;
  }

  toString() {
    return this.#state;
  }
}

export async function runServer<
  Context extends WithStop<{ voxeloo?: VoxelooModule }>
>(
  service: string,
  makeContext: (
    signal: AbortSignal,
    gracefulShutdown: () => void
  ) => Promise<Context>,
  initializer: (
    context: Context,
    signal: AbortSignal,
    gracefulShutdown: () => void
  ) => Promise<void> | Promise<ServerHooks | undefined>
) {
  const state = new StateRecorder();
  handleProcessIssues();

  // Parse .env file for server configuration.
  dotenv.config();
  if (process.env.NODE_ENV !== "production") {
    dotenv.config({ path: ".env.local" });
  }

  disableExperimentalWarnings();

  log.info(`${service} starting, PID: ${process.pid} / ${hostname()}`, {
    lifecycle: true,
  });
  log.info(`Server Commit Hash: ${process.env.BUILD_ID}`);

  await waitForLinkerdReady();
  await waitForAuthReady();

  // Gracefully kill linkerd when we exit.
  startLinkerdWatchman();

  // Refresh the server config every 30 seconds.
  const configWatchers = await startConfigWatchers();
  if (!configWatchers) {
    log.fatal("Failed to load initial biomes configs!", { lifecycle: true });
    return;
  }

  const eventLoopStatsPoller = new EventLoopLagPoller(100);
  const eventLoopUtilizationPoller = new EventLoopUtilizationPoller(100);

  let hooks: ServerHooks | undefined;
  let context: Context | undefined;

  // Start the metrics export as early as possible.
  exposeMetrics(
    () => context?.voxeloo,
    async () => state.value === "ready",
    async () => {
      if (state.value !== "ready") {
        return false;
      }
      if (hooks?.readyHook) {
        return hooks.readyHook();
      }
      return true;
    },
    async () => {
      if (hooks?.dumpHook) {
        return hooks.dumpHook();
      }
      return {};
    }
  );

  await bootstrapGlobalSecrets();

  const controller = new AbortController();

  const gracefulShutdown = async (reason: string) => {
    if (state.value === "shutting_down") {
      return;
    }
    log.warn(
      `${service}: Gracefully shutting down from state ${state} due to ${reason}`,
      {
        lifecycle: true,
        gracefulBegin: true,
      }
    );
    state.value = "shutting_down";
    controller.abort();
    if (hooks?.shutdownHook) {
      log.warn(`${service}: Running shutdown hooks`, { lifecycle: true });
      await hooks?.shutdownHook();
    }
    await context?.stop();
    eventLoopStatsPoller.stop();
    eventLoopUtilizationPoller.stop();
    await configWatchers.close();
    log.warn(`${service}: Shutdown complete.`, {
      lifecycle: true,
      gracefulEnd: true,
    });
    await shutdownLinkerd();
    process.exit(0);
  };

  const shutdownSignals = ["SIGTERM"];

  if (process.env.DISABLE_SIGINT) {
    process.on("SIGINT", () => {});
  } else {
    shutdownSignals.push("SIGINT");
  }

  for (const graceSignal of shutdownSignals) {
    process.on(graceSignal, () => {
      void gracefulShutdown(graceSignal);
    });
  }

  log.info(`${service} initializing`, { lifecycle: true });
  state.value = "creatingContext";

  try {
    context = await makeContext(controller.signal, () => {
      void gracefulShutdown("local");
    });
    if (controller.signal.aborted) {
      return;
    }
    state.value = "starting";
    globalThis.ctx = context;

    // Initialize the server and then register a SIGINT handler to shut it down.
    hooks =
      (await initializer(context, controller.signal, () => {
        void gracefulShutdown("local");
      })) || {};
    if (state.value === "starting") {
      state.value = "ready";
      log.info(`${service} now running`, { lifecycle: true });
      const sinceReady = new Timer();
      createGauge({
        name: "biomes_uptime_seconds",
        help: "Time since the server finished running its initializer.",
        collect: (g) => g.set(sinceReady.elapsed / 1000),
      });
    }
  } catch (error) {
    if (error instanceof AbortError) {
      log.warn(`${service} shutdown requested during start-up.`, {
        lifecycle: true,
      });
    } else {
      log.error(`Error initializing ${service}`, {
        error,
        lifecycle: true,
      });
      process.exit(1);
    }
  }
}
