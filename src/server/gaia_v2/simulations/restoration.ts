import {
  requeueAfter,
  Simulation,
  type UpdateResult,
  type UpdateStatus,
} from "@/server/gaia_v2/simulations/api";
import type { GaiaReplica, TerrainShard } from "@/server/gaia_v2/table";
import { TerrainMutator } from "@/server/gaia_v2/terrain/mutator";
import type { ChangeToApply } from "@/shared/api/transaction";
import { using } from "@/shared/deletable";
import type { Change } from "@/shared/ecs/change";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { Entity } from "@/shared/ecs/gen/entities";
import { TerrainRestorationDiffWriter } from "@/shared/game/restoration";
import type { ShardId } from "@/shared/game/shard";
import { voxelShard } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { TimeWindow } from "@/shared/util/throttling";
import type { VoxelooModule } from "@/shared/wasm/types";
import { compact } from "lodash";

export class RestorationSimulation extends Simulation {
  private readonly throttle = new TimeWindow(1_000);

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica
  ) {
    super("restoration");
  }

  invalidate(change: Change): ShardId[] {
    if (change.kind === "delete") {
      return [];
    } else if (!change.entity.terrain_restoration_diff) {
      return [];
    }

    const entity = this.replica.table.get(change.entity.id);
    if (!Entity.has(entity, "box")) {
      log.warn(`Entity ${change.entity.id} unexpectedly has no box component.`);
      return [];
    }

    return [voxelShard(...entity.box.v0)];
  }

  async update(
    shard: TerrainShard,
    version: number
  ): Promise<UpdateResult | undefined> {
    if (shard?.terrain_restoration_diff === undefined) {
      // No restoration diff, so nothing to restore.
      return;
    }

    const shardId = voxelShard(...shard.box.v0);
    if (this.throttle.throttleOrUse(shardId)) {
      return requeueAfter(this.throttle.waitTime(shardId));
    }

    const now = secondsSinceEpoch();

    const restore = new TerrainRestorationDiffWriter(
      shard.terrain_restoration_diff
    );

    let nextUpdateTime = Infinity;
    const terrainDelta = using(
      new TerrainMutator(this.voxeloo, shard),
      (terrain) => {
        for (const entry of restore.restorationEntries()) {
          if (entry.restore_time > now) {
            nextUpdateTime = Math.min(nextUpdateTime, entry.restore_time);
            continue;
          }

          restore.applyRestoration(entry.pos, {
            getOccupancy: (pos) => terrain.occupancy.get(pos) as BiomesId,
            set: (pos, { terrain: restTerrain, placer, shape, dye }) => {
              if (placer !== undefined) {
                terrain.placer.set(pos, placer);
              }
              if (restTerrain !== undefined) {
                const placerValue = terrain.placer.get(pos);
                const seedValue = terrain.seed.get(...pos);
                if (
                  restTerrain === seedValue &&
                  (seedValue === 0 || placerValue === 0)
                ) {
                  terrain.diff.del(...pos);
                } else {
                  terrain.diff.set(...pos, restTerrain);
                }
              }
              if (shape !== undefined) {
                if (!shape) {
                  terrain.shapes.del(...pos);
                } else {
                  terrain.shapes.set(...pos, shape);
                }
              }
              if (dye !== undefined) {
                terrain.dye.set(pos, dye);
              }
            },
          });
        }

        const [updated, delta] = terrain.apply();
        return updated ? delta : undefined;
      }
    );

    const restoreDelta = restore.finish();

    const change: ChangeToApply | undefined =
      restoreDelta !== undefined || terrainDelta !== undefined
        ? {
            iffs: [[shard.id, version]],
            changes: [
              {
                kind: "update",
                entity: { ...restoreDelta, ...terrainDelta, id: shard.id },
              },
            ],
          }
        : undefined;

    // If the terrain_restoration_diff component is not getting removed,
    // then keep this shard in our high priority queue to watch.
    const updateStatus: UpdateStatus =
      restoreDelta?.terrain_restoration_diff !== null &&
      nextUpdateTime !== Infinity
        ? { kind: "requeue", afterDelayMs: (nextUpdateTime - now) * 1000 }
        : undefined;

    return { update: updateStatus, changes: compact([change]) };
  }
}
