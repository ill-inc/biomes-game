import type { IdGenerator } from "@/server/shared/ids/generator";
import type { ChangeToApply } from "@/shared/api/transaction";
import { getTerrainID, isTerrainName } from "@/shared/asset_defs/terrain";
import { type ProposedChange } from "@/shared/ecs/change";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import type { Entity } from "@/shared/ecs/gen/entities";
import { TerrainShardSelector } from "@/shared/ecs/gen/selectors";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { FirehoseEvent } from "@/shared/firehose/events";
import { anItem } from "@/shared/game/item";
import type { ShardId } from "@/shared/game/shard";
import { voxelShard, worldPos } from "@/shared/game/shard";
import { Terrain } from "@/shared/game/terrain/terrain";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { sub } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import type { GaiaReplica } from "@/server/gaia_v2/table";
import { compact } from "lodash";
import { farmLog } from "@/server/gaia_v2/simulations/farming/util";

export class Plant {
  constructor(
    public readonly version: number,
    public readonly entity: PatchableEntity,
    public readonly events: FirehoseEvent[] = [],
    public readonly modifiedShards: Set<ShardId> = new Set(),
    public destroy: boolean = false,
    public readonly entitiesToCreate: Entity[] = []
  ) {}

  get id() {
    return this.entity.id;
  }
}

export class FarmingChangeBatcher {
  private readonly plants: Map<BiomesId, Plant> = new Map();
  private readonly terrainMutators: Map<
    ShardId,
    { terrain: Terrain; version: number }
  > = new Map();

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly table: GaiaReplica["table"],
    private readonly idGenerator: IdGenerator
  ) {}

  getWorldMetadata() {
    return this.table.get(WorldMetadataId)?.world_metadata;
  }

  getPlant(id: BiomesId): Plant | undefined {
    const existing = this.plants.get(id);
    if (existing) {
      return existing;
    }
    const [version, replicaEntity] = this.table.getWithVersion(id);
    if (!replicaEntity) {
      return;
    }
    const plant = new Plant(version, new PatchableEntity(replicaEntity));
    this.plants.set(id, plant);
    return plant;
  }

  hasPlant(id: BiomesId) {
    return this.plants.has(id);
  }

  getOrCreateTerrainMutator(shardId: ShardId) {
    const existing = this.terrainMutators.get(shardId)?.terrain;
    if (existing) {
      return existing;
    }
    const entity = this.table.get(TerrainShardSelector.query.key(shardId));
    const version = entity && this.table.getWithVersion(entity.id)[0];
    if (!entity || version === undefined) {
      return;
    }
    const mutator = new Terrain(this.voxeloo, entity);
    this.terrainMutators.set(shardId, { terrain: mutator, version });
    return mutator;
  }

  getMutatorAndShardPos(pos: ReadonlyVec3) {
    const shardId = voxelShard(...pos);
    const mutator = this.getOrCreateTerrainMutator(shardId);
    const shardPos = sub(pos, worldPos(shardId));
    return { mutator, shardPos };
  }

  getTerrainBlock(pos: ReadonlyVec3) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    return mutator?.diff.get(...shardPos) ?? mutator?.seed.get(...shardPos);
  }

  getTerrainShape(pos: ReadonlyVec3) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    return mutator?.shapes.get(...shardPos);
  }

  getTerrainOccupancy(pos: ReadonlyVec3) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    return mutator?.occupancy.get(...shardPos);
  }

  getTerrainFarming(pos: ReadonlyVec3) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    return mutator?.farming.get(...shardPos);
  }

  getTerrainGrowth(pos: ReadonlyVec3) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    return mutator?.growth.get(...shardPos);
  }

  getTerrainMoisture(pos: ReadonlyVec3) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    return mutator?.moisture.get(...shardPos);
  }

  setTerrainBlock(pos: ReadonlyVec3, blockId: number) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    mutator?.mutableDiff.set(...shardPos, blockId);
  }

  setTerrainShape(pos: ReadonlyVec3, shape: number) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    mutator?.mutableShapes.set(...shardPos, shape);
  }

  setTerrainOccupancy(pos: ReadonlyVec3, occupancy: number) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    mutator?.mutableOccupancy.set(...shardPos, occupancy);
  }

  setTerrainFarming(pos: ReadonlyVec3, farming: number) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    mutator?.mutableFarming.set(...shardPos, farming);
    mutator?.mutablePlacer.set(...shardPos, farming);
  }

  setTerrainGrowth(pos: ReadonlyVec3, growth: number) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    mutator?.mutableGrowth.set(...shardPos, growth);
  }

  setTerrainMoisture(pos: ReadonlyVec3, moisture: number) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    mutator?.mutableMoisture.set(...shardPos, moisture);
  }

  setTerrain(
    pos: ReadonlyVec3,
    blockId: number,
    farming?: number,
    growth?: number,
    moisture?: number,
    shape?: number
  ) {
    const { mutator, shardPos } = this.getMutatorAndShardPos(pos);
    if (blockId === mutator?.seed.get(...shardPos)) {
      mutator?.mutableDiff.del(...shardPos);
    } else {
      mutator?.mutableDiff.set(...shardPos, blockId);
    }
    if (shape !== undefined) {
      mutator?.mutableShapes.set(...shardPos, shape);
    }
    if (farming !== undefined) {
      mutator?.mutableFarming.set(...shardPos, farming);
      mutator?.mutablePlacer.set(...shardPos, farming);
    }
    if (growth !== undefined) {
      mutator?.mutableGrowth.set(...shardPos, growth);
    }
    if (moisture !== undefined) {
      mutator?.mutableMoisture.set(...shardPos, moisture);
    }
  }

  setTerrainByBlockId(
    pos: ReadonlyVec3,
    blockId: BiomesId,
    farming?: number,
    growth?: number,
    moisture?: number,
    shape?: number
  ) {
    const terrainName = anItem(blockId).terrainName;
    if (isTerrainName(terrainName)) {
      const terrainId = getTerrainID(terrainName);
      this.setTerrain(pos, terrainId, farming, growth, moisture, shape);
    }
  }

  async flush(): Promise<ChangeToApply[]> {
    const changes = new Map<BiomesId, ChangeToApply>();
    const shardToEntity = new Map<ShardId, BiomesId>();

    // Merge together entity updates that must be applied together
    // merges: key: entity id, value: index of groupedEntities group of IDs
    // groupedEntities: key: index of group, value: set of entity IDs grouped together
    // merge() takes in two IDs and updates merges and groupedEntities
    const groupedEntities = new Map<number, Set<BiomesId>>();
    const merges = new Map<BiomesId, number>();
    let mergeIndex = 0;
    const merge = (a: BiomesId, b: BiomesId) => {
      if (a === b) return;
      if (merges.has(a) && merges.has(b)) {
        const aIndex = merges.get(a)!;
        const bIndex = merges.get(b)!;
        if (aIndex === bIndex) {
          return;
        }
        const aIds = groupedEntities.get(aIndex)!;
        const bIds = groupedEntities.get(bIndex)!;
        for (const bId of bIds) {
          merges.set(bId, aIndex);
          aIds.add(bId);
        }
        groupedEntities.delete(bIndex);
      } else if (merges.has(a)) {
        const aIndex = merges.get(a)!;
        merges.set(b, aIndex);
        groupedEntities.get(aIndex)!.add(b);
      } else if (merges.has(b)) {
        const bIndex = merges.get(b)!;
        merges.set(a, bIndex);
        groupedEntities.get(bIndex)!.add(a);
      } else {
        merges.set(a, mergeIndex);
        merges.set(b, mergeIndex);
        groupedEntities.set(mergeIndex, new Set([a, b]));
        mergeIndex++;
      }
    };

    // Terrain updates
    for (const { terrain, version } of this.terrainMutators.values()) {
      terrain.commit();
      const delta = terrain.finish();
      const shardId = voxelShard(...terrain.box.v0);
      shardToEntity.set(shardId, terrain.entity.id);
      try {
        if (delta) {
          changes.set(terrain.entity.id, {
            changes: [{ kind: "update", entity: delta }],
            iffs: [[terrain.entity.id, version]],
          });
        }
      } finally {
        terrain.delete();
      }
    }
    this.terrainMutators.clear();

    // Reserve IDs
    const idsToGenerate = [...this.plants.values()].reduce(
      (val, plant) =>
        val +
        (plant.entitiesToCreate?.filter(
          (entity) => entity.id === INVALID_BIOMES_ID
        ).length ?? 0),
      0
    );
    const ids = await this.idGenerator.batch(idsToGenerate);

    // Plant updates
    for (const plant of this.plants.values()) {
      // Creations
      const plantChanges: ProposedChange[] =
        plant.entitiesToCreate?.map((entity) => {
          let createdEntity = entity;
          if (createdEntity.id === INVALID_BIOMES_ID) {
            ok(ids.length > 0, "No more IDs available");
            createdEntity = { ...createdEntity, id: ids.pop()! };
          }
          return { kind: "create", entity: createdEntity };
        }) ?? [];

      // Destroys
      if (plant.destroy) {
        plantChanges.push({ kind: "delete", id: plant.entity.id });
      } else {
        // Updates
        const delta = plant.entity.finish();
        if (delta) {
          plantChanges.push({ kind: "update", entity: delta });
        }
      }

      changes.set(plant.entity.id, {
        iffs: [[plant.entity.id, plant.version]],
        events: plant.events,
        changes: plantChanges,
      });
      for (const shard of plant.modifiedShards) {
        const shardEntityId = shardToEntity.get(shard);
        if (shardEntityId) {
          merge(shardEntityId, plant.entity.id);
        }
      }
    }
    this.plants.clear();

    // Merge changes that are codependent
    const mergedChanges = [...groupedEntities.values()].map((entityIds) => {
      const mergeChanges = compact([...entityIds].map((id) => changes.get(id)));
      return mergeChanges.reduce(
        (merged, change) => ({
          changes: [...(merged.changes ?? []), ...(change.changes ?? [])],
          iffs: [...(merged.iffs ?? []), ...(change.iffs ?? [])],
          events: [...(merged.events ?? []), ...(change.events ?? [])],
        }),
        <ChangeToApply>{ changes: [], iffs: [], events: [] }
      );
    });
    // Combine with unmerged changes
    const unmergedChanges = [...changes.entries()]
      .filter(([id]) => !merges.has(id))
      .map(([, change]) => change);
    const outputChanges = [...mergedChanges, ...unmergedChanges];

    if (outputChanges.length > 0) {
      farmLog(
        `Merged ${changes.size} entity updates into ${outputChanges.length} ` +
          `(${mergedChanges.length} merged + ${unmergedChanges.length} unmerged) changes`,
        10
      );
    }

    return outputChanges;
  }
}
