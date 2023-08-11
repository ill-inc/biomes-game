import type { ClientContext } from "@/client/game/context";
import type { ClientIoEvents } from "@/client/game/context_managers/client_io";
import { type ClientIo } from "@/client/game/context_managers/client_io";
import type { Events } from "@/client/game/context_managers/events";
import type { ClientInput } from "@/client/game/context_managers/input";
import type { ClientTable } from "@/client/game/game";
import type { RendererController } from "@/client/game/renderers/renderer_controller";
import type { ClientResources } from "@/client/game/resources/types";
import type { ScriptController } from "@/client/game/scripts/script_controller";
import { refreshBikkie } from "@/client/game/util/bikkie";
import { cleanEmitterCallback } from "@/client/util/helpers";
import type { Change, ChangeBuffer } from "@/shared/ecs/change";
import { changedBiomesId } from "@/shared/ecs/change";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { WriteableTable } from "@/shared/ecs/table";
import type { IndexedResources } from "@/shared/game/ecs_indexed_resources";
import { registerResourceInvalidationForTable } from "@/shared/game/ecs_resources";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { timeCode } from "@/shared/metrics/performance_timing";
import type { RegistryLoader } from "@/shared/registry";
import { fireAndForget } from "@/shared/util/async";
import { makeCvalHook } from "@/shared/util/cvals";
import { FixedRateTicker } from "@/shared/util/fixed_rate_ticker";
import { getNowMs } from "@/shared/util/helpers";
import { fail } from "assert";
import { render } from "prettyjson";

declare global {
  /* eslint-disable no-var */
  var recent: Change[] | undefined;
  var recentTerrain: Change[] | undefined;
  /* eslint-enable no-var */
}

export class Loop {
  private readonly simTicker = new FixedRateTicker(getNowMs());
  private cleanUps: Array<() => unknown> = [];
  private lastBikkieTrayId?: BiomesId;
  private requestedAnimationFrame = 0;

  constructor(
    private readonly self: BiomesId,
    private readonly events: Events,
    private readonly buffer: ChangeBuffer,
    private readonly table: ClientTable,
    private readonly serverTable: WriteableTable,
    private readonly input: ClientInput,
    private readonly resources: ClientResources,
    private readonly scripts: ScriptController,
    private readonly indexedResources: IndexedResources,
    private readonly io: ClientIo,
    private readonly rendererController: RendererController
  ) {
    if (global.recent === undefined) {
      global.recent = [];
    }
    if (global.recentTerrain === undefined) {
      global.recentTerrain = [];
    }

    makeCvalHook({
      path: ["verbose", "terrainDeletes"],
      help: "Recent terrain deletes",
      collect: () =>
        global
          .recentTerrain!.filter((c) => c.kind === "delete")
          .map((v) => render(v)),
      toHumanReadable: (value) => value[value.length - 1] ?? "",
    });

    this.cleanUps.push(
      cleanEmitterCallback<ClientIoEvents>(io, {
        consumedForSyncTargetChange: () => {
          this.flush();
        },
      })
    );
  }

  start() {
    this.cleanUps.push(
      registerResourceInvalidationForTable(
        this.self,
        this.table,
        this.resources,
        this.indexedResources,
        () => fail("Should never delete local player!")
      )
    );
    this.flush();
    const loop = () => {
      this.tick();
      this.requestedAnimationFrame = requestAnimationFrame(loop);
    };
    this.requestedAnimationFrame = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.requestedAnimationFrame);
    for (const c of this.cleanUps) {
      c();
    }
    this.cleanUps = [];
  }

  hotHandoff(old: Loop) {
    old.flush();
    old.stop();
    this.start();
  }

  private advanceSimulation() {
    const now = getNowMs();
    const tweaks = this.resources.get("/tweaks");
    const simulationFrameInterval = 1 / tweaks.sim.frameRate;
    const ticks = this.simTicker.advanceClock(
      now,
      simulationFrameInterval * 1000,
      1 + tweaks.sim.maxCatchupTicks
    );
    for (let i = 0; i < ticks; ++i) {
      // Run client scripts and finalize input accumulation.
      // NOTE: Order matters here because the input tick clears accumulation.
      timeCode(this.scripts.name, () => {
        this.scripts.tick(simulationFrameInterval);
        this.input.tick("script");
      });
    }
    if (ticks > 0) {
      this.resources.update("/sim/clock", (clock) => {
        clock.lastUpdateRenderTime = this.resources.get("/scene/clock").time;
      });
    }
  }

  private recordChangesForDebugging(changes: Iterable<Change>) {
    // Record changes to the self and terrain for debugging.
    const recent = global.recent!;
    const recentTerrain = global.recentTerrain!;
    for (const change of changes) {
      const id = changedBiomesId(change);
      if (id === this.self) {
        recent.push(change);
      } else if (
        (change.kind !== "delete" && change.entity.shard_seed) ||
        this.table.get(id)?.shard_seed
      ) {
        // It's a terrain change.
        recentTerrain.push(change);
      }
    }
    if (recent.length > 600) {
      recent.splice(0, recent.length - 600);
    }
    if (recentTerrain.length > 50) {
      recentTerrain.splice(0, recentTerrain.length - 50);
    }
  }

  private maybeRefreshBikkie(changes: Iterable<Change>) {
    for (const change of changes) {
      if (
        change.kind !== "delete" &&
        change.entity.id === WorldMetadataId &&
        change.entity.active_tray
      ) {
        // Determine if the active tray token has changed, if so refresh Bikkie.
        const newTrayId = change.entity.active_tray?.id;
        if (this.lastBikkieTrayId !== newTrayId) {
          fireAndForget(refreshBikkie(newTrayId));
          this.lastBikkieTrayId = newTrayId;
        }
      }
    }
  }

  private flush() {
    // Handle ECS updates.
    const changes = this.buffer.pop();

    this.recordChangesForDebugging(changes);
    this.maybeRefreshBikkie(changes);

    this.serverTable.apply(changes);

    this.table.layers.compactLayers();
  }

  private updateClock() {
    const tweaks = this.resources.get("/tweaks");
    if (tweaks.synchronizeServerTime) {
      this.resources.invalidate("/server/time");
    }
    const serverTime = this.resources.get("/server/time");
    this.resources.set("/clock", {
      time:
        // Time since we last knew the server's time.
        (performance.now() - serverTime.receivedAt) / 1000 +
        // Add the time since epoch the server was at.
        serverTime.secondsSinceEpoch -
        // Remove half the RTT.
        serverTime.estimatedRtt / 2000,
    });

    this.resources.set("/scene/clock", { time: getNowMs() / 1000 });
  }

  private updateIoTweaks() {
    const tweaks = this.resources.get("/tweaks");
    if (tweaks.overrideSyncRadius) {
      this.io.syncRadius = tweaks.syncRadius;
      return;
    }
    this.io.syncRadius = this.resources.get(
      "/settings/graphics/dynamic"
    ).drawDistance;
  }

  tick() {
    try {
      this.flush();

      this.updateClock();
      this.updateIoTweaks();

      this.advanceSimulation();

      // Publish events to server, do not block on this.
      fireAndForget(this.events.flush());

      this.rendererController.renderFrame();

      // Give the resource system some time for garbage collection.
      // TODO: Consider running this on the async queue so that it substracts from
      // the budeget of other async tasks.
      timeCode("resources:collect", () => {
        this.resources.collect();
      });
    } catch (error: any) {
      log.fatal(`Exception in main loop: ${error}`, error);
      cancelAnimationFrame(this.requestedAnimationFrame);
      throw error;
    }
  }
}

export async function loadLoop(loader: RegistryLoader<ClientContext>) {
  const [
    userId,
    events,
    changeBuffer,
    table,
    serverTable,
    input,
    resources,
    scripts,
    indexedReosurces,
    io,
    rendererController,
  ] = await Promise.all([
    loader.get("userId"),
    loader.get("events"),
    loader.get("changeBuffer"),
    loader.get("table"),
    loader.get("serverTable"),
    loader.get("input"),
    loader.get("resources"),
    loader.get("scripts"),
    loader.get("indexedResources"),
    loader.get("io"),
    loader.get("rendererController"),
  ]);
  return new Loop(
    userId,
    events,
    changeBuffer,
    table,
    serverTable,
    input,
    resources,
    scripts,
    indexedReosurces,
    io,
    rendererController
  );
}
