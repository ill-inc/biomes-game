import { secondsSinceEpoch } from "@/shared/ecs/config";
import { Npc } from "@/shared/ecs/gen/entities";
import { PlayerSelector } from "@/shared/ecs/gen/selectors";
import { isDayTime, sunInclination } from "@/shared/game/sun_moon_position";
import type { BiomesId } from "@/shared/ids";
import { dist } from "@/shared/math/linear";
import {
  createCounter,
  createHistogram,
  exponentialBuckets,
  linearBuckets,
} from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import { idToSpawnEvent, isSpawnEventId } from "@/shared/npc/bikkie";
import type {
  Environment,
  NpcTickResourcePaths,
  NpcTickerTable,
} from "@/shared/npc/environment";
import { npcTickLogic } from "@/shared/npc/logic";
import { SimulatedNpc } from "@/shared/npc/simulated";
import { TickUpdates } from "@/shared/npc/updates";
import type { TypedResources } from "@/shared/resources/types";
import { asyncYieldForEach } from "@/shared/util/async";
import { compactMap } from "@/shared/util/collections";
import { FixedRateTicker } from "@/shared/util/fixed_rate_ticker";
import { getNowMs } from "@/shared/util/helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import { remove } from "lodash";

const npcFixedTicks = createCounter({
  name: "anima_npc_fixed_ticks",
  help: "Number of fixed rate NPC ticks.",
  labelNames: ["type"],
});

const npcTicks = createCounter({
  name: "anima_npc_ticks",
  help: "Number of NPC ticks, which may include one or more fixed ticks.",
  labelNames: ["type"],
});

const npcActiveTicks = createCounter({
  name: "anima_npc_active_ticks",
  help: "Number of NPC ticks where the NPC data was actually modified by the tick.",
  labelNames: ["type"],
});

const potentialTicks = createCounter({
  name: "anima_npc_potential_ticks",
  help: "Number of potential NPC ticks before filtering them to e.g. NPCs with nearby players only.",
  labelNames: ["type"],
});

const deadTicks = createCounter({
  name: "anima_npc_dead_ticks",
  help: "Ticks from dead entities. Almost zero processing is done for these.",
  labelNames: ["type"],
});

const npcTickNpcMs = createHistogram({
  name: "anima_tick_npc_ms",
  help: "How long it takes to process each NPC tick, in milliseconds.",
  labelNames: ["type"],
  buckets: exponentialBuckets(0.005, 2, 9),
});

const npcPlayerDistance = createHistogram({
  name: "anima_player_distance",
  help: "Distance from the nearest player ot a simulated NPC",
  labelNames: ["type"],
  buckets: linearBuckets(1, 32, 10),
});

// Applies the core NPC tick logic, without doing any IO. All event publishing
// is the responsibility of NpcTicker's client, with the goal being to enable
// NpcTicker to be used in multiple different contexts (e.g. client side
// prediction).
export class NpcTicker {
  private readonly fixedRateTicker = new FixedRateTicker(getNowMs());
  private readonly npcs: SimulatedNpc[];
  private tickCount = 0;
  lastTickTime: number | undefined;
  lastTickDuration: number | undefined;

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly table: NpcTickerTable,
    private readonly resources: TypedResources<NpcTickResourcePaths>,
    private readonly npcsForShard: () => ReadonlySet<BiomesId>
  ) {
    this.npcs = compactMap(npcsForShard(), (id) => {
      const entity = Npc.from(table.get(id));
      if (entity) {
        return new SimulatedNpc(entity);
      }
    });
  }

  get env(): Environment {
    return {
      voxeloo: this.voxeloo,
      table: this.table,
      resources: this.resources,
      ecsMetaIndex: this.table.metaIndex,
      worldMetadata: this.resources.get("/ecs/metadata"),
    };
  }

  private updateManagedNpcs() {
    const managed = this.npcsForShard();

    const seen = new Set<BiomesId>();

    // Get any external changes to our health to update, also delete unknown NPCs
    // TODO: Generalize/handle other forms of change?
    remove(this.npcs, (npc) => {
      const external = this.env.table.get(npc.id);
      if (external) {
        npc.updateFromExternal(external);
      }
      seen.add(npc.id);
      return !external || !managed.has(npc.id);
    });

    for (const id of managed) {
      if (seen.has(id)) {
        continue;
      }
      const entity = Npc.from(this.table.get(id));
      if (entity) {
        this.npcs.push(new SimulatedNpc(entity));
      }
    }
  }

  private async generateUpdates(): Promise<TickUpdates> {
    // Figure out how many ticks to run, according to a fixed interval so that
    // we can have constant time deltas for deterministic state updates.
    const outstandingTicks = this.fixedRateTicker.advanceClock(
      this.lastTickTime!,
      CONFIG.animaNpcTickTimeMs,
      CONFIG.animaNpcMaxFixedTicksPerTick
    );
    let updates = new TickUpdates();
    for await (const npc of asyncYieldForEach(this.npcs, 15)) {
      updates = updates.merge(this.tickNpc(npc, outstandingTicks));
    }
    return updates;
  }

  async tick(): Promise<TickUpdates> {
    this.lastTickTime = getNowMs();
    ++this.tickCount;

    this.updateManagedNpcs();
    const updates = this.generateUpdates();

    this.lastTickDuration = getNowMs() - this.lastTickTime;
    return updates;
  }

  private determineTickRate(npc: SimulatedNpc) {
    const position = npc.position;
    // Work out the nearest player that can affect tick rate.
    const minDistanceThatMatters = CONFIG.animaTickByDistance[0][0];
    const maxDistanceToScan =
      CONFIG.animaTickByDistance[CONFIG.animaTickByDistance.length - 1][0];
    let nearest = Infinity;
    for (const player of this.env.table.scan(
      PlayerSelector.query.spatial.inSphere(
        {
          center: position,
          radius: maxDistanceToScan,
        },
        { approx: true }
      )
    )) {
      const playerPosition = player?.position?.v;
      if (!playerPosition) {
        continue;
      }
      const distance = dist(position, playerPosition);
      if (distance > maxDistanceToScan) {
        continue;
      }
      nearest = Math.min(nearest, distance);
      if (nearest < minDistanceThatMatters) {
        break; // No point doing better, early exit.
      }
    }
    if (isFinite(nearest)) {
      npcPlayerDistance.observe({ type: npc.type.name }, nearest);
    }
    // Choose the effective tick rate.
    for (const [distance, rate] of CONFIG.animaTickByDistance) {
      if (distance > nearest) {
        return rate;
      }
    }
    return CONFIG.animaFarFromPlayerTickRatio;
  }

  private tickNpc(
    npc: SimulatedNpc,
    outstandingTicks: number
  ): TickUpdates | undefined {
    if (npc.hp <= 0) {
      deadTicks.inc({ type: npc.type.name }, 1);
      return;
    }

    potentialTicks.inc({ type: npc.type.name }, 1);
    const tickRate = this.determineTickRate(npc);

    // Use entity ID to spread out ticks so anima don't align.
    if (!tickRate || (npc.id + this.tickCount) % tickRate !== 0) {
      // Not our time to tick.
      return;
    }
    const updates = this.tickNpcMultipleTimes(npc, outstandingTicks);
    npcFixedTicks.inc({ type: npc.type.name }, outstandingTicks);
    npcTicks.inc({ type: npc.type.name });
    if (updates) {
      npcActiveTicks.inc({ type: npc.type.name });
    }
    return updates;
  }

  tickNpcMultipleTimes(npc: SimulatedNpc, tickCount: number) {
    if (serverSideNpcTick(npc)) {
      for (let i = 0; i < tickCount; ++i) {
        const timer = new Timer();
        npcTickLogic(this.env, npc, CONFIG.animaNpcTickTimeMs / 1000);
        npcTickNpcMs.observe({ type: npc.type.name }, timer.elapsed);
      }
    }
    return npc.finish();
  }
}

function serverSideNpcTick(npc: SimulatedNpc): boolean {
  const spawnEventTypeId = npc.metadata.spawn_event_type_id;
  if (!isSpawnEventId(spawnEventTypeId)) {
    return true;
  }
  const now = secondsSinceEpoch();
  const spawnEvent = idToSpawnEvent(spawnEventTypeId);
  const timeOfDayConstraint = spawnEvent.spawnConstraints.timeOfDay;
  // If day/night time changes and this is a NPC that only exists during
  // either, check if they should die.
  if (
    timeOfDayConstraint &&
    npc.hp > 0 &&
    isDayTime(sunInclination(now)) !== (timeOfDayConstraint === "day")
  ) {
    npc.kill({
      kind: "npc",
      type: { kind: "dayNight" },
    });
    return false;
  }
  return true;
}
