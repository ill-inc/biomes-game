import type { EventContext } from "@/server/logic/events/core";
import { RollbackError } from "@/server/logic/events/core";
import type { TerrainIterator } from "@/server/logic/events/occupancy";
import {
  AabbTerrainIterator,
  GroupTensorTerrainIterator,
  scanAabbTerrainOccupancy,
} from "@/server/logic/events/occupancy";
import { q } from "@/server/logic/events/query";
import {
  involvedShards,
  transformBoxOwnedBox,
  transformBoxOwnedPosition,
} from "@/server/logic/utils/groups";
import { terrainLifetime } from "@/shared/asset_defs/quirk_helpers";
import type { Reflect } from "@/shared/asset_defs/shapes";
import { using, usingAll } from "@/shared/deletable";
import {
  Box,
  OccupancyComponent,
  PlacerComponent,
} from "@/shared/ecs/gen/components";
import type { DeltaWith } from "@/shared/ecs/gen/delta";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import type { EntityWith, ReadonlyEntityWith } from "@/shared/ecs/gen/entities";
import type { ReadonlyBox2 } from "@/shared/ecs/gen/types";
import {
  aabbToBox,
  boxToAabb,
  rotateGroupTensor,
  rotateTensor,
  terrainIdForTensorEntry,
} from "@/shared/game/group";
import {
  isBlockId,
  isFloraId,
  isGlassId,
  toBlockId,
  toFloraId,
  toGlassId,
} from "@/shared/game/ids";
import { getVoxelOccupancyForPlaceable } from "@/shared/game/placeables";
import { blockPos, voxelShard } from "@/shared/game/shard";
import type { Terrain } from "@/shared/game/terrain/terrain";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import {
  aabbIsInteger,
  add,
  containsAABB,
  inclusiveAabbContainsAABB,
  sizeAABB,
  sub,
} from "@/shared/math/linear";
import type { Rotation } from "@/shared/math/rotation";
import type { ReadonlyAABB } from "@/shared/math/types";
import { Tensor, TensorUpdate } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import {
  isBlockGroupEntry,
  isFloraGroupEntry,
  isGlassGroupEntry,
} from "@/shared/wasm/types/galois";
import { ok } from "assert";
import { cloneDeep } from "lodash";

export type SpaceClipboardDelta = DeltaWith<
  "id" | "box" | "group_component" | "occupancy_component"
>;
export type SpaceClipboardEntity = EntityWith<
  "id" | "box" | "group_component" | "occupancy_component"
>;

interface InternalPasteReturn {
  clonedEntities?: DeltaWith<"id">[];
}

export interface PasteReturn {}
export interface PasteCopyReturn {
  clonedEntities: DeltaWith<"id">[];
}

export interface CutReturn {
  cutEntities: DeltaWith<"id">[];
}

export interface DeleteReturn {
  deletedEntities: DeltaWith<"id">[];
}

export function queryForTerrainInBox(box: ReadonlyBox2) {
  return q.byKeys("terrainByShardId", ...involvedShards(box)).terrain();
}

export function queryForSpaceClipboardEntity(entityId: BiomesId) {
  return q
    .id(entityId)
    .with("id", "box", "group_component", "occupancy_component")
    .includeIced();
}

// Get relevant entity IDs within the given readonly terrain volume.
export function queryForRelevantEntities(
  voxeloo: VoxelooModule,
  allTerrain: ReadonlyEntityWith<"id">[],
  aabb: ReadonlyAABB
) {
  const entityIds = new Set<BiomesId>();
  for (const { occupancyId } of scanAabbTerrainOccupancy(
    voxeloo,
    allTerrain,
    aabb
  )) {
    entityIds.add(occupancyId);
  }
  return Array.from(entityIds);
}

// Get entity IDs within the given terrain volume.
export function getSpaceEntityIds(terrainIterator: TerrainIterator) {
  const entityIds = new Set<BiomesId>();
  for (const { blockPos, terrain } of terrainIterator) {
    const occupancyId = terrain.occupancy.get(...blockPos) as BiomesId;
    // occupancyId could be:
    //    * User ID if user placed the voxel
    //    * Group ID if this voxel is part of a group
    //    * Placeable ID if a placeable is located here
    if (occupancyId) {
      entityIds.add(occupancyId);
    }
  }
  return entityIds;
}

export function deleteSpace(
  aabb: ReadonlyAABB,
  allTerrain: Terrain[],
  relevantEntities: DeltaWith<"id">[],
  context: EventContext<{}>
): DeleteReturn {
  const tempEntity = new PatchableEntity({
    id: INVALID_BIOMES_ID,
  }) as unknown as SpaceClipboardDelta;
  const cutReturn = cutSpace(
    context.voxeloo,
    tempEntity,
    aabb,
    allTerrain,
    relevantEntities
  );

  for (const entity of cutReturn.cutEntities) {
    context.delete(entity.id);
  }

  return {
    deletedEntities: cutReturn.cutEntities,
  };
}

function checkRegionContainsEntity(
  entity: DeltaWith<"id">,
  region: ReadonlyAABB
) {
  if (
    entity.box() &&
    !inclusiveAabbContainsAABB(region, boxToAabb(entity.box()!))
  ) {
    throw new RollbackError(
      `Entity ${entity.id} box is not contained in region ([${region[0]}]-[${region[1]}])`
    );
  }

  if (entity.placeableComponent()) {
    const occupancyAABB = getVoxelOccupancyForPlaceable(
      entity.asReadonlyEntity()
    );
    if (occupancyAABB) {
      if (!inclusiveAabbContainsAABB(region, occupancyAABB)) {
        throw new RollbackError(
          `Placeable ${entity.id} ([${occupancyAABB[0]}]-${occupancyAABB[1]}) is not contained in region ([${region[0]}]-[${region[1]}])`
        );
      }
      return;
    }
  }

  if (entity.position() && !containsAABB(region, entity.position()!.v)) {
    throw new RollbackError(
      `Entity ${entity.id} position (${
        entity.position()!.v
      }) is not contained in region [${region[0]}]-[${region[1]}]`
    );
  }
}

export function cutSpace(
  voxeloo: VoxelooModule,
  spaceClipboardEntity: DeltaWith<"id">,
  aabb: ReadonlyAABB,
  allTerrain: Terrain[],
  relevantEntities: DeltaWith<"id">[]
): CutReturn {
  ok(aabbIsInteger(aabb), "AABB must be integral");

  const ret: CutReturn = {
    cutEntities: [],
  };
  const terrainIterator = new AabbTerrainIterator(allTerrain, aabb);

  // Stow entities.
  const relevantEntitiesMap = new Map<BiomesId, DeltaWith<"id">>(
    relevantEntities.map((e) => [e.id, e])
  );
  const groupedEntityIds: BiomesId[] = [];
  for (const entityId of getSpaceEntityIds(terrainIterator)) {
    if (entityId === spaceClipboardEntity.id) {
      continue;
    }
    const entity = relevantEntitiesMap.get(entityId);
    if (!entity) {
      throw new RollbackError(`Relevant entity ${entityId} is missing`);
    }
    if (
      entity.placeableComponent() ||
      entity.groupComponent() ||
      entity.blueprintComponent()
    ) {
      checkRegionContainsEntity(entity, aabb);
      groupedEntityIds.push(entity.id);
      entity.setIced();
      ret.cutEntities.push(entity);
    }
  }

  // Stow voxels.
  const size = sizeAABB(aabb);
  usingAll(
    [
      new voxeloo.GroupTensorBuilder(),
      Tensor.make(voxeloo, size, "F64"),
      Tensor.make(voxeloo, size, "F64"),
    ],
    (builder, occupancyTensor, placerTensor) => {
      const occupancyWriter = new TensorUpdate(occupancyTensor);
      const placerWriter = new TensorUpdate(placerTensor);
      for (const { worldPos, blockPos, terrain } of terrainIterator) {
        const tensorPos = sub(worldPos, aabb[0]);
        const terrainId =
          terrain.diff.get(...blockPos) ?? terrain.seed.get(...blockPos);
        const isTempEdit = terrainLifetime(terrainId) !== undefined;

        if (terrainId && !isTempEdit) {
          // Stow voxels to the group tensor.
          if (isFloraId(terrainId)) {
            builder.setFlora(
              tensorPos,
              toFloraId(terrainId),
              terrain.growth.get(...blockPos)
            );
          } else if (isBlockId(terrainId)) {
            builder.setBlock(
              tensorPos,
              toBlockId(terrainId),
              terrain.shapes.get(...blockPos) ?? 0,
              terrain.dye.get(...blockPos),
              terrain.moisture.get(...blockPos)
            );
          } else if (terrainId) {
            builder.setGlass(
              tensorPos,
              toGlassId(terrainId),
              terrain.shapes.get(...blockPos) ?? 0,
              terrain.dye.get(...blockPos),
              terrain.moisture.get(...blockPos)
            );
          }
        }

        if (!isTempEdit) {
          // Stow occupancy to occupancy tensor.
          occupancyWriter.set(tensorPos, terrain.occupancy.get(...blockPos));
          placerWriter.set(tensorPos, terrain.placer.get(...blockPos));
        }

        // Clear terrain.
        terrain.clearTerrainAt(blockPos, undefined);
      }
      occupancyWriter.apply();
      placerWriter.apply();

      // Save group tensor.
      using(builder.build(), (tensor) => {
        spaceClipboardEntity.setGroupComponent({
          tensor: tensor.save(),
        });
      });

      // Save occupancy tensor.
      spaceClipboardEntity.setOccupancyComponent(
        OccupancyComponent.create(occupancyTensor.saveWrapped())
      );

      // Save placer tensor.
      spaceClipboardEntity.setPlacerComponent(
        PlacerComponent.create(placerTensor.saveWrapped())
      );
    }
  );

  spaceClipboardEntity.setIced();
  spaceClipboardEntity.setGroupedEntities({
    ids: groupedEntityIds,
  });
  spaceClipboardEntity.setBox(Box.clone(aabbToBox(aabb)));

  return ret;
}

export function copySpace(
  spaceClipboardEntity: DeltaWith<"id">,
  aabb: ReadonlyAABB,
  allTerrain: Terrain[],
  relevantEntities: DeltaWith<"id">[],
  clonedEntityIds: BiomesId[],
  context: EventContext<{}>
) {
  // Insane way of implementing copy is to cut, pasteCopy, cut copy, paste original
  const tempEntity = new PatchableEntity({
    id: INVALID_BIOMES_ID,
  }) as unknown as SpaceClipboardDelta;
  cutSpace(context.voxeloo, tempEntity, aabb, allTerrain, relevantEntities);

  const pastedCopyReturn = pasteCopySpace(
    tempEntity,
    aabb,
    allTerrain,
    relevantEntities,
    clonedEntityIds,
    context
  );
  ok(pastedCopyReturn.clonedEntities !== undefined);

  cutSpace(context.voxeloo, spaceClipboardEntity, aabb, allTerrain, [
    ...pastedCopyReturn.clonedEntities,
    ...relevantEntities,
  ]);
  pasteSpace(context.voxeloo, tempEntity, aabb, allTerrain, relevantEntities);
}

export function pasteCopySpace(
  spaceClipboardEntity: SpaceClipboardDelta,
  aabb: ReadonlyAABB, // AABB after rotation and reflection has been applied.
  allTerrain: Terrain[],
  relevantEntities: DeltaWith<"id">[],
  clonedEntityIds: BiomesId[],
  context: EventContext<{}>,
  opts: {
    rotation: Rotation;
    reflection: Reflect;
    overrideFlora?: boolean;
  } = {
    rotation: 0,
    reflection: [0, 0, 0],
  }
): PasteCopyReturn {
  const ret = internalPasteOrClone(
    context.voxeloo,
    spaceClipboardEntity,
    aabb,
    allTerrain,
    relevantEntities,
    {
      ...opts,
      cloneWithContext: {
        context,
        newIds: clonedEntityIds,
      },
    }
  );

  ok(ret.clonedEntities !== undefined);

  return {
    clonedEntities: ret.clonedEntities,
  };
}

export function pasteSpace(
  voxeloo: VoxelooModule,
  spaceClipboardEntity: SpaceClipboardDelta,
  aabb: ReadonlyAABB, // AABB after rotation and reflection has been applied.
  allTerrain: Terrain[],
  relevantEntities: DeltaWith<"id">[],
  opts: {
    rotation: Rotation;
    reflection: Reflect;
    overrideFlora?: boolean;
  } = {
    rotation: 0,
    reflection: [0, 0, 0],
  }
): PasteReturn {
  return internalPasteOrClone(
    voxeloo,
    spaceClipboardEntity,
    aabb,
    allTerrain,
    relevantEntities,
    opts
  );
}

function internalPasteOrClone(
  voxeloo: VoxelooModule,
  spaceClipboardEntity: SpaceClipboardDelta,
  aabb: ReadonlyAABB, // AABB after rotation and reflection has been applied.
  allTerrain: Terrain[],
  relevantEntities: DeltaWith<"id">[],
  opts: {
    cloneWithContext?: { newIds: BiomesId[]; context: EventContext<{}> };
    rotation: Rotation;
    reflection: Reflect;
    overrideFlora?: boolean;
  } = {
    rotation: 0,
    reflection: [0, 0, 0],
  }
): InternalPasteReturn {
  ok(aabbIsInteger(aabb), "AABB must be integral");
  const oldBox = spaceClipboardEntity.box();
  const newBox = aabbToBox(aabb);
  const entityIdToClonedId = new Map<BiomesId, BiomesId>();

  const ret: InternalPasteReturn = {
    clonedEntities: opts.cloneWithContext ? [] : undefined,
  };

  // Unstow entities.
  const relevantEntitiesMap = new Map<BiomesId, DeltaWith<"id">>(
    relevantEntities.map((e) => [e.id, e])
  );

  for (const entityId of spaceClipboardEntity.groupedEntities()?.ids ?? []) {
    const stowedEntity = relevantEntitiesMap.get(entityId);
    if (!stowedEntity) {
      throw new RollbackError(`Relevant entity ${entityId} is missing`);
    }
    let entity = stowedEntity;
    if (opts.cloneWithContext) {
      const clonedId = opts.cloneWithContext.newIds.pop();
      ok(clonedId, "Not enough new IDs provided");
      entity = new PatchableEntity({
        ...cloneDeep(stowedEntity.asReadonlyEntity()),
        id: clonedId,
      });
      entityIdToClonedId.set(stowedEntity.id, clonedId);
    }

    if (entity.placeableComponent() || entity.blueprintComponent()) {
      // Unstow Placeables and Blueprints.
      const [newPosition, newOrientation] = transformBoxOwnedPosition(
        entity.position()!.v,
        entity.orientation()?.v,
        oldBox,
        newBox,
        opts.rotation,
        opts.reflection
      );
      entity.clearIced();
      entity.setPosition({ v: newPosition });
      entity.setOrientation({ v: newOrientation });
    } else if (entity.groupComponent()) {
      // Unstow Groups.
      using(new voxeloo.GroupTensor(), (groupTensor) => {
        groupTensor.load(entity.groupComponent()!.tensor);
        using(
          rotateGroupTensor(
            voxeloo,
            groupTensor,
            opts.rotation,
            opts.reflection
          ),
          (rotatedTensor) => {
            entity.setGroupComponent({
              tensor: rotatedTensor.save(),
            });
          }
        );
      });
      entity.clearIced();

      if (entity.warpable()) {
        const [newWarpTo, newWarpOrientation] = transformBoxOwnedPosition(
          entity.warpable()!.warp_to,
          entity.warpable()!.orientation,
          oldBox,
          newBox,
          opts.rotation,
          opts.reflection
        );
        entity.mutableWarpable().warp_to = newWarpTo;
        entity.mutableWarpable().orientation = newWarpOrientation;
      }
      entity.setBox(
        transformBoxOwnedBox(
          entity.box()!,
          oldBox,
          newBox,
          opts.rotation,
          opts.reflection
        )
      );
    }

    if (opts.cloneWithContext) {
      ret.clonedEntities!.push(
        opts.cloneWithContext.context.create(entity.asReadonlyEntity())
      );
    }
  }

  // Unstow voxels.
  const oldSize = sizeAABB(boxToAabb(oldBox));
  usingAll(
    [
      new voxeloo.GroupTensor(),
      Tensor.make(voxeloo, oldSize, "F64"),
      Tensor.make(voxeloo, oldSize, "F64"),
    ],
    (oldTensor, oldOccupancy, oldPlacer) => {
      oldTensor.load(spaceClipboardEntity.groupComponent().tensor);
      oldOccupancy.load(spaceClipboardEntity.occupancyComponent()?.buffer);
      oldPlacer.load(spaceClipboardEntity.placerComponent()?.buffer);
      usingAll(
        [
          rotateGroupTensor(voxeloo, oldTensor, opts.rotation, opts.reflection),
          rotateTensor(voxeloo, oldOccupancy, opts.rotation, opts.reflection),
          rotateTensor(voxeloo, oldPlacer, opts.rotation, opts.reflection),
        ],
        (rotatedTensor, rotatedOccupancy, rotatedPlacer) => {
          // Assign occupancy.
          for (const [tensorPos, occupancyId] of rotatedOccupancy) {
            const worldPos = add(tensorPos, newBox.v0);
            const bp = blockPos(...worldPos);
            const shardId = voxelShard(...worldPos);
            const terrain = allTerrain.find((t) => t.shardId === shardId);
            if (!terrain) {
              continue;
            }
            const existingOccupancyId = terrain.occupancy.get(
              ...bp
            ) as BiomesId;
            let newOccupancyId = occupancyId as BiomesId;
            // Map original IDs to cloned IDs.
            if (newOccupancyId && entityIdToClonedId.has(newOccupancyId)) {
              newOccupancyId = entityIdToClonedId.get(newOccupancyId)!;
            }
            if (existingOccupancyId && existingOccupancyId !== newOccupancyId) {
              throw new RollbackError(
                `Occupancy interference when unstowing ${spaceClipboardEntity.id}`
              );
            }
            terrain.mutableOccupancy.set(...bp, newOccupancyId);
          }

          // Assign terrain and voxels.
          for (const {
            terrain,
            blockPos,
            tensorEntry,
            tensorPos,
          } of new GroupTensorTerrainIterator(
            allTerrain,
            rotatedTensor,
            newBox
          )) {
            const existingTerrainId =
              terrain.diff.get(...blockPos) ?? terrain.seed.get(...blockPos);
            if (existingTerrainId && isBlockId(existingTerrainId)) {
              throw new RollbackError("Tried to override existing block");
            }
            if (existingTerrainId && isGlassId(existingTerrainId)) {
              throw new RollbackError("Tried to override existing glass");
            }
            if (
              existingTerrainId &&
              isFloraId(existingTerrainId) &&
              !opts.overrideFlora
            ) {
              throw new RollbackError("Tried to override existing flora");
            }

            const placerId = rotatedPlacer.get(...tensorPos) as BiomesId;
            const tensorTerrainId = terrainIdForTensorEntry(tensorEntry);
            if (isFloraGroupEntry(tensorEntry)) {
              terrain.setTerrainAt(
                blockPos,
                { value: tensorTerrainId, placerId },
                undefined
              );
            } else if (isBlockGroupEntry(tensorEntry)) {
              terrain.setTerrainAt(
                blockPos,
                {
                  value: tensorTerrainId,
                  placerId,
                  shapeId: tensorEntry.block.isomorphism_id,
                  dyeId: tensorEntry.block.dye,
                  moistureId: tensorEntry.block.moisture,
                },
                undefined
              );
            } else if (isGlassGroupEntry(tensorEntry)) {
              terrain.setTerrainAt(
                blockPos,
                {
                  value: tensorTerrainId,
                  placerId,
                  shapeId: tensorEntry.glass.isomorphism_id,
                  dyeId: tensorEntry.glass.dye,
                  moistureId: tensorEntry.glass.moisture,
                },
                undefined
              );
            }
          }
        }
      );
    }
  );

  if (!opts.cloneWithContext) {
    spaceClipboardEntity.clearIced();
    spaceClipboardEntity.setBox(Box.clone(newBox));

    // We also clear those, since they will be re-created on stowing.
    spaceClipboardEntity.clearGroupComponent();
    spaceClipboardEntity.clearOccupancyComponent();
    spaceClipboardEntity.clearPlacerComponent();
    spaceClipboardEntity.clearGroupedEntities();
  }

  return ret;
}

export function discardSpaceClipboard(
  spaceClipboard: DeltaWith<"id">,
  context: EventContext<{}>
) {
  ok(spaceClipboard.iced(), "Can only delete iced stowed spaces");
  for (const entityId of spaceClipboard.groupedEntities()?.ids ?? []) {
    context.delete(entityId);
  }

  context.delete(spaceClipboard.id);
}
