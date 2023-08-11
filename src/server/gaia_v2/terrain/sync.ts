import type { GaiaServerContext } from "@/server/gaia_v2/context";
import type { GaiaReplica } from "@/server/gaia_v2/table";
import { using, usingAsync } from "@/shared/deletable";
import {
  ChangeBuffer,
  type Change,
  type ReadonlyChanges,
} from "@/shared/ecs/change";
import { Entity } from "@/shared/ecs/gen/entities";
import { TerrainShardSelector } from "@/shared/ecs/gen/selectors";
import type { ListenerKey } from "@/shared/events";
import { ReadonlyTerrain } from "@/shared/game/terrain/terrain";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { asyncYieldForEach } from "@/shared/util/async";
import type { VoxelooModule } from "@/shared/wasm/types";
import type {
  GaiaTerrainMapBuilderV2,
  GaiaTerrainMapV2,
} from "@/shared/wasm/types/gaia";
import { ok } from "assert";

export class TerrainSync {
  private changeSubscription?: ListenerKey;

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica,
    private readonly map: GaiaTerrainMapV2
  ) {}

  private handleChange(change: Change) {
    if (change.kind === "delete") {
      return;
    }

    const shard = this.replica.table.get(change.entity.id);
    if (!Entity.has(shard, "shard_seed", "box")) {
      return;
    }

    using(new ReadonlyTerrain(this.voxeloo, shard), (terrain) => {
      if (change.entity.shard_diff && terrain.unsafeDiff) {
        this.map.updateDiff(shard.box.v0, terrain.unsafeDiff);
      }
      if (change.entity.shard_water && terrain.unsafeWater) {
        this.map.updateWater(shard.box.v0, terrain.unsafeWater.cpp);
      }
      if (change.entity.shard_irradiance && terrain.unsafeIrradiance) {
        this.map.updateIrradiance(shard.box.v0, terrain.unsafeIrradiance.cpp);
      }
      if (change.entity.shard_sky_occlusion && terrain.unsafeSkyOcclusion) {
        this.map.updateOcclusion(shard.box.v0, terrain.unsafeSkyOcclusion.cpp);
      }
      if (change.entity.shard_dye && terrain.unsafeDye) {
        this.map.updateDye(shard.box.v0, terrain.unsafeDye.cpp);
      }
      if (change.entity.shard_growth && terrain.unsafeGrowth) {
        this.map.updateGrowth(shard.box.v0, terrain.unsafeGrowth.cpp);
      }
    });
  }

  private handleChanges(changes: ReadonlyChanges) {
    for (const change of changes) {
      this.handleChange(change);
    }
  }

  private async buildTerrainMap(builder: GaiaTerrainMapBuilderV2) {
    const shardIds: BiomesId[] = [
      ...this.replica.table.scanIds(TerrainShardSelector.query.all()),
    ];
    let seedsPopulated = 0;
    for await (const shardId of asyncYieldForEach(shardIds, 100)) {
      const entity = this.replica.table.get(shardId);
      if (!entity?.box) {
        continue;
      }
      try {
        using(new ReadonlyTerrain(this.voxeloo, entity), (terrain) => {
          ok(entity.box);
          ok(terrain.unsafeSeed, "Terrain shard is missing seed");
          seedsPopulated += 1;
          builder.assignSeed(entity.box.v0, terrain.unsafeSeed);
          ok(terrain.unsafeDiff, "Terrain shard is missing diff");
          builder.assignDiff(entity.box.v0, terrain.unsafeDiff);
          if (terrain.unsafeWater) {
            builder.assignWater(entity.box.v0, terrain.unsafeWater.cpp);
          }
          if (terrain.unsafeIrradiance) {
            builder.assignIrradiance(
              entity.box.v0,
              terrain.unsafeIrradiance.cpp
            );
          }
          if (terrain.unsafeSkyOcclusion) {
            builder.assignOcclusion(
              entity.box.v0,
              terrain.unsafeSkyOcclusion.cpp
            );
          }
          if (terrain.unsafeDye) {
            builder.assignDye(entity.box.v0, terrain.unsafeDye.cpp);
          }
          if (terrain.unsafeGrowth) {
            builder.assignGrowth(entity.box.v0, terrain.unsafeGrowth.cpp);
          }
        });
      } catch (error) {
        log.error("Failed to load terrain shard: ", { error, entity });
        throw error;
      }
    }

    log.info(`Populated ${seedsPopulated} seed tensors`);
    log.info(`Builder computed aabb: ${builder.aabb()}`);
    log.info(`Builder expected shard count: ${builder.shardCount()}`);

    const holes = builder.holeCount();
    ok(holes <= CONFIG.gaiaV2MissingShardsThreshold);
    log.info(
      `Finished loading terrain with ${shardIds.length} shards and ${holes} holes.`
    );
    builder.build(this.map);

    const { v0, v1 } = this.map.aabb();
    log.info(
      `Gaia terrain map initialized. Shape: [${v0}, ${v1}], Bytes: ${this.map.storageSize()}`
    );
  }

  async start() {
    log.info(`Gaia loading initial terrain data...`);

    // Start listening to changes, but buffer application until after we're
    // initialized.
    ok(!this.changeSubscription, `TerrainSync already started`);
    let bootstrapped = false;
    const buffer = new ChangeBuffer();
    this.changeSubscription = this.replica.on("tick", (changes) => {
      if (bootstrapped) {
        this.handleChanges(changes);
      } else {
        buffer.push(changes);
      }
    });

    // Initialize the map.
    await usingAsync(new this.voxeloo.GaiaTerrainMapBuilderV2(), (builder) =>
      this.buildTerrainMap(builder)
    );

    // Catchup on any changes that occurred during our initialization.
    while (!buffer.empty) {
      for await (const change of asyncYieldForEach(buffer.pop(), 100)) {
        this.handleChange(change);
      }
    }

    // We're good, directly process from now on.
    bootstrapped = true;
  }

  async stop() {
    if (this.changeSubscription) {
      this.replica.off("tick", this.changeSubscription);
      this.changeSubscription = undefined;
    }
  }
}

export async function registerTerrainSync<C extends GaiaServerContext>(
  loader: RegistryLoader<C>
) {
  const [voxeloo, replica, map] = await Promise.all([
    loader.get("voxeloo"),
    loader.get("replica"),
    loader.get("terrainMap"),
  ]);
  const sync = new TerrainSync(voxeloo, replica, map);
  await sync.start();
  return sync;
}
