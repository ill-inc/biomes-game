import { type DyeID } from "@/shared/asset_defs/blocks";
import type { ShapeID } from "@/shared/asset_defs/shapes";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import type { ReadonlyBox } from "@/shared/ecs/gen/components";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import type { Entity, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { TerrainRestorationDiffWriter } from "@/shared/game/restoration";
import { voxelShard, type ShardId } from "@/shared/game/shard";
import type { OnDemandBufferedTerrain } from "@/shared/game/terrain/on_demand_buffers";
import {
  ON_DEMAND_TERRAIN_SPECS,
  makeOnDemandTerrainBuffers,
} from "@/shared/game/terrain/on_demand_buffers";
import { INVALID_BIOMES_ID, type BiomesId } from "@/shared/ids";
import { centerAABB } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { getLazyObjectMaterializedValues, lazy } from "@/shared/util/lazy";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import { capitalize } from "lodash";

interface TerrainBufferProxyLike {
  readonly buffers: OnDemandBufferedTerrain;
}

// To avoid repetitive code of: seed, unsafeSeed, mutableSeed, etc. we use a dynamic
// property descriptor to define all the appropriate properties expected of the terrain
// object dynamically.
const propertyDescriptors = lazy(() => {
  const descriptors: PropertyDescriptorMap = {};
  for (const key in ON_DEMAND_TERRAIN_SPECS) {
    descriptors[key] = {
      get(this: TerrainBufferProxyLike) {
        return this.buffers[key as keyof typeof this.buffers].getReadOnly();
      },
    };
    descriptors[`unsafe${capitalize(key)}`] = {
      get(this: TerrainBufferProxyLike) {
        return this.buffers[key as keyof typeof this.buffers].getUnsafeTensor();
      },
    };
    descriptors[`mutable${capitalize(key)}`] = {
      get(this: TerrainBufferProxyLike) {
        return this.buffers[key as keyof typeof this.buffers].getNoCommit();
      },
    };
  }
  return descriptors;
});

export class TerrainBufferProxy {
  protected readonly entity: PatchableEntity;
  private readonly originalEntity: ReadonlyEntity | undefined;
  protected readonly buffers: OnDemandBufferedTerrain;

  constructor(
    voxeloo: VoxelooModule,
    entity: ReadonlyEntity | PatchableEntity
  ) {
    if (entity instanceof PatchableEntity) {
      this.entity = entity;
    } else {
      this.originalEntity = entity;
      this.entity = new PatchableEntity(entity);
    }
    this.buffers = makeOnDemandTerrainBuffers(voxeloo, this.entity);
    Object.defineProperties(this, propertyDescriptors());
  }

  get box(): ReadonlyBox {
    // Terrain boxes doesn't change, so safe to just read the original.
    return this.originalEntity ? this.originalEntity.box! : this.entity.box()!;
  }
}

type ReadonlyTypedTerrainBufferProxy = {
  entity: PatchableEntity;
  buffers: OnDemandBufferedTerrain;
  box: ReadonlyBox;
} & {
  [K in keyof OnDemandBufferedTerrain]: OnDemandBufferedTerrain[K] extends {
    getReadOnly(): infer T;
  }
    ? T
    : never;
} & {
  [K in keyof OnDemandBufferedTerrain as `unsafe${Capitalize<K>}`]: OnDemandBufferedTerrain[K] extends {
    getUnsafeTensor(): infer T;
  }
    ? T
    : never;
};

export class ReadonlyTerrain extends (TerrainBufferProxy as unknown as {
  new (
    voxeloo: VoxelooModule,
    entity: PatchableEntity | ReadonlyEntity
  ): ReadonlyTypedTerrainBufferProxy;
}) {
  #shardId: ShardId | undefined;
  #restoration?: TerrainRestorationDiffWriter;

  has<C extends keyof Entity>(...components: C[]): boolean {
    return this.entity.has(...components);
  }

  get id() {
    return this.entity.id;
  }

  get shardId() {
    if (this.#shardId === undefined) {
      this.#shardId = voxelShard(...centerAABB([this.box.v0, this.box.v1]));
    }
    return this.#shardId;
  }

  protected get restoration() {
    if (!this.#restoration) {
      this.#restoration = new TerrainRestorationDiffWriter(
        this.entity.terrainRestorationDiff()
      );
    }
    return this.#restoration;
  }

  terrainAt(pos: ReadonlyVec3): number {
    return this.diff.get(...pos) ?? this.seed.get(...pos) ?? 0;
  }

  terrainAtAfterRestoration(pos: ReadonlyVec3): number {
    const restoreDiff = this.restoration.getRestoreDataAt(pos)?.terrain;
    if (restoreDiff === undefined) {
      return this.terrainAt(pos);
    } else {
      return restoreDiff;
    }
  }

  isRestoring(pos: ReadonlyVec3): boolean {
    // Specifically look for whether the "terrain" tensor is restoring, as
    // opposed to say, the dye color.
    return this.restoration.getRestoreDataAt(pos)?.terrain !== undefined;
  }

  // All involved fields, to simplify the below.
  protected get involved() {
    return getLazyObjectMaterializedValues(this.buffers);
  }

  delete() {
    for (const buffered of this.involved) {
      buffered.delete();
    }
    this.restoration.clear();
  }
}

type MutableTerrainBufferProxy = {
  [K in keyof OnDemandBufferedTerrain as `mutable${Capitalize<K>}`]: OnDemandBufferedTerrain[K] extends {
    getNoCommit(): infer T;
  }
    ? T
    : never;
};

export class Terrain extends (ReadonlyTerrain as {
  new (
    voxeloo: VoxelooModule,
    entity: PatchableEntity | ReadonlyEntity
  ): ReadonlyTerrain & MutableTerrainBufferProxy;
}) {
  private setTerrainValueAt(pos: ReadonlyVec3, value: number) {
    if (value === 0 && !this.seed.get(...pos)) {
      this.buffers.diff.get().del(...pos);
    } else {
      this.buffers.diff.get().set(...pos, value);
    }
  }

  applyRestoration(pos: ReadonlyVec3) {
    this.restoration.applyRestoration(pos, {
      getOccupancy: (pos) => this.occupancy.get(...pos) as BiomesId,
      set: (pos, { terrain, placer, shape, dye }) => {
        this.setTerrainAt(
          pos,
          {
            value: terrain,
            placerId: placer as BiomesId,
            shapeId: shape,
            dyeId: dye,
          },
          undefined
        );
      },
    });
  }

  setTerrainAt(
    shardPos: ReadonlyVec3,
    {
      value,
      placerId,
      occupancyId,
      shapeId,
      dyeId,
      moistureId,
    }: {
      value?: TerrainID;
      placerId?: BiomesId;
      occupancyId?: BiomesId;
      shapeId?: ShapeID;
      dyeId?: DyeID;
      moistureId?: number;
    },
    restoreTimeSecs: number | undefined
  ) {
    if (restoreTimeSecs !== undefined) {
      const occupancy = occupancyId ?? this.occupancy.get(...shardPos);
      ok(
        occupancy === INVALID_BIOMES_ID,
        "Restoration should never be applied to voxels occupied by an entity, in those cases the entity should manage the restoration."
      );

      // This change is to be restored.
      const prevRes = this.restoration.getRestoreDataAt(shardPos);
      const restoreValue = (
        newVal: number | undefined,
        restoreVal: number | undefined,
        getPrevVal: () => number
      ) => {
        if (newVal === undefined) {
          return undefined;
        }
        const prevVal = getPrevVal();
        if (newVal === prevVal) {
          return undefined;
        }
        // If the new entry is equal to what we were restoring to, then just
        // clear the restoration.
        if (restoreVal === newVal) {
          return null;
        }
        return prevVal;
      };

      this.restoration.setRestoration(restoreTimeSecs, shardPos, {
        terrain: restoreValue(value, prevRes?.terrain, () =>
          this.terrainAt(shardPos)
        ),
        placer: restoreValue(placerId, prevRes?.placer, () =>
          this.placer.get(...shardPos)
        ),
        shape: restoreValue(
          shapeId,
          prevRes?.shape,
          () => this.shapes.get(...shardPos) ?? 0
        ),
        dye: restoreValue(dyeId, prevRes?.dye, () => this.dye.get(...shardPos)),
      });
    } else {
      // If any change is made to the terrain that is not to be restored, then
      // erase all pending restorations on it. In this way a player with
      // ownershipt can "bless" a change by tweaking it.
      this.restoration.clearRestoration(shardPos);
    }

    if (value !== undefined) {
      this.setTerrainValueAt(shardPos, value);
    }
    if (placerId !== undefined) {
      this.mutablePlacer.set(...shardPos, placerId);
    }
    if (occupancyId !== undefined) {
      this.mutableOccupancy.set(...shardPos, occupancyId);
    }
    if (shapeId !== undefined) {
      if (shapeId === 0) {
        this.mutableShapes.del(...shardPos);
      } else {
        this.mutableShapes.set(...shardPos, shapeId);
      }
    }
    if (dyeId !== undefined) {
      this.mutableDye.set(...shardPos, dyeId);
    }
    if (moistureId !== undefined) {
      this.mutableMoisture.set(...shardPos, moistureId);
    }
  }

  clearTerrainAt(shardPos: ReadonlyVec3, restoreTime: number | undefined) {
    this.setTerrainAt(
      shardPos,
      {
        value: 0,
        placerId: INVALID_BIOMES_ID,
        occupancyId: INVALID_BIOMES_ID,
        shapeId: 0,
        moistureId: 0,
        dyeId: 0,
      },
      restoreTime
    );
  }

  restoreTerrainToSeedAt(shardPos: ReadonlyVec3) {
    this.buffers.diff.get().del(...shardPos);
    this.mutableShapes.del(...shardPos);
    this.mutablePlacer.set(...shardPos, INVALID_BIOMES_ID);
    this.mutableMoisture.set(...shardPos, 0);
    this.mutableDye.set(...shardPos, 0);
    this.restoration.clearRestoration(shardPos);
  }

  abandon() {
    for (const buffered of this.involved) {
      buffered.abandon();
    }
    this.restoration.clear();
  }

  commit() {
    for (const buffered of this.involved) {
      buffered.commit();
    }
    const restorationChange = this.restoration.finish();
    if (restorationChange) {
      if (restorationChange.terrain_restoration_diff === null) {
        this.entity.clearTerrainRestorationDiff();
      } else {
        this.entity.setTerrainRestorationDiff(
          restorationChange.terrain_restoration_diff
        );
      }
    }
  }

  finish() {
    ok(
      !this.restoration.dirty && this.involved.every((b) => !b.hasUncommitted),
      "You should commit or abandon changes before finishing."
    );
    for (const buffered of this.involved) {
      buffered.finish();
    }
    return this.entity.finish();
  }
}
