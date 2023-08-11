import type { PositionProvider } from "@/server/shared/chat/util";
import type { LazyChange } from "@/server/shared/ecs/lazy";
import { LazySpatialIndex } from "@/server/shared/ecs/lazy_spatial_index";
import type { WorldApi } from "@/server/shared/world/api";
import { BackgroundTaskController } from "@/shared/abort";
import type { SpatialQueryOptions } from "@/shared/ecs/spatial/types";
import { isEntryDomainAabb } from "@/shared/ecs/spatial/types";
import { isPlayer } from "@/shared/game/players";
import type { BiomesId } from "@/shared/ids";
import { centerAABB } from "@/shared/math/linear";
import type { ReadonlySphere, Vec3 } from "@/shared/math/types";
import { createGauge } from "@/shared/metrics/metrics";
import { Timer, TimerNeverSet } from "@/shared/metrics/timer";
import type { RegistryLoader } from "@/shared/registry";
import { Latch } from "@/shared/util/async";
import { DefaultMap } from "@/shared/util/collections";

export class PlayerSpatialObserver implements PositionProvider {
  private readonly controller = new BackgroundTaskController();
  private readonly spatial = new LazySpatialIndex();
  private readonly potentialPlayerIds = new Set<BiomesId>();
  private readonly activePlayerIds = new Set<BiomesId>();
  private readonly lastUpdated = new DefaultMap<BiomesId, Timer>(
    () => new Timer(TimerNeverSet)
  );

  constructor(private readonly worldApi: WorldApi) {
    createGauge({
      name: "spatial_observer_all_players",
      help: "Number of players in the PlayerSpatialObserver",
      collect: (gauge) => gauge.set(this.activePlayerIds.size),
    });
  }

  getTimeSinceLastUpdate(id: BiomesId) {
    return this.lastUpdated.get(id).elapsed;
  }

  async start() {
    const ready = new Latch();
    this.controller.runInBackground("subscribe", async (signal) => {
      for await (const { changes, bootstrapped } of this.worldApi.subscribe(
        {},
        signal
      )) {
        if (changes) {
          this.apply(changes);
        }
        if (bootstrapped) {
          ready.signal();
        }
      }
    });
    await ready.wait();
  }

  async stop() {
    await this.controller.abortAndWait();
  }

  private apply(changes: LazyChange[]) {
    for (const change of changes) {
      if (change.kind === "delete") {
        if (this.potentialPlayerIds.delete(change.id)) {
          this.activePlayerIds.delete(change.id);
          this.spatial.apply(change);
        }
        continue;
      }
      const id = change.entity.id;
      if (!this.potentialPlayerIds.has(id)) {
        if (change.kind !== "create" || !isPlayer(change.entity)) {
          // Not a new player
          continue;
        }
        this.potentialPlayerIds.add(id);
      }
      if (!this.activePlayerIds.has(id)) {
        if (!change.entity.playerStatus()?.init) {
          // Not yet an active player.
          continue;
        }
        this.activePlayerIds.add(id);
      }
      this.lastUpdated.get(id).reset();
      this.spatial.apply(change);
    }
  }

  scanSphere(sphere: ReadonlySphere, options?: SpatialQueryOptions) {
    return this.spatial.scanSphere(sphere, options);
  }

  // Not actually async, just to conform to PositionProvider.
  async copyPosition(id: BiomesId): Promise<Vec3 | undefined> {
    const domain = this.spatial.get(id);
    if (!domain) {
      return undefined;
    }
    return isEntryDomainAabb(domain) ? centerAABB(domain) : [...domain];
  }
}

export async function registerPlayerSpatialObserver<
  C extends { worldApi: WorldApi }
>(loader: RegistryLoader<C>) {
  return new PlayerSpatialObserver(await loader.get("worldApi"));
}
