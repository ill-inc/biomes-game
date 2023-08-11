import type {
  AclChecker,
  EventContext,
  InvolvedSpecification,
} from "@/server/logic/events/core";
import {
  RollbackError,
  aclChecker,
  makeEventHandler,
  newId,
  newIds,
} from "@/server/logic/events/core";
import {
  AabbTerrainIterator,
  GroupTensorTerrainIterator,
} from "@/server/logic/events/occupancy";

import type { QueriedEntityWith } from "@/server/logic/events/query";
import { q } from "@/server/logic/events/query";
import {
  queryForRelevantEntities,
  queryForTerrainInBox,
} from "@/server/logic/events/space_clipboard";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { newDrop } from "@/server/logic/utils/drops";
import {
  checkGroupPermissions,
  editShardedGroupVoxels,
  groupsCreated,
  involvedShards,
  transformBoxOwnedPosition,
} from "@/server/logic/utils/groups";
import {
  checkAndOccupyTerrainForPlaceable,
  clearTerrainOccupancyForPlaceable,
  newPlaceable,
  onPlaceablePlace,
} from "@/server/logic/utils/placeables";
import {
  maybeSetRestoreTo,
  tryRestoreToCreated,
} from "@/server/logic/utils/restoration";
import type { Reflect } from "@/shared/asset_defs/shapes";
import { BikkieIds } from "@/shared/bikkie/ids";
import { GROUP_PREVIEW_EXPIRATION_S } from "@/shared/constants";
import { using, usingAll } from "@/shared/deletable";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { PlacedBy } from "@/shared/ecs/gen/components";
import type { EnvironmentGroup } from "@/shared/ecs/gen/entities";
import { anItem } from "@/shared/game/item";
import type { Terrain } from "@/shared/game/terrain/terrain";

import { deIcePlaceable } from "@/server/logic/events/handlers/placeables";
import type { GrabBagFilter } from "@/shared/ecs/gen/types";
import { getBlueprintData } from "@/shared/game/blueprint";
import { groupBlingCost } from "@/shared/game/costs";
import { getAabbForEntity } from "@/shared/game/entity_sizes";
import {
  aabbToBox,
  boxToAabb,
  groupItem,
  rotateGroupTensor,
  roundBox,
} from "@/shared/game/group";
import { countOf, createBag } from "@/shared/game/items";
import {
  getAabbForPlaceable,
  getAabbForPlaceableEntity,
} from "@/shared/game/placeables";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { log } from "@/shared/logging";
import { centerAABB, integerAABB } from "@/shared/math/linear";
import type { Rotation } from "@/shared/math/rotation";
import {
  orientationToRotation,
  rotationToOrientation,
} from "@/shared/math/rotation";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { GroupTensor } from "@/shared/wasm/types/galois";
import { ok } from "assert";
import { isEqual } from "lodash";

export const createGroupEventHandler = makeEventHandler("createGroupEvent", {
  mergeKey: (event) => event.id,
  prepareInvolves: (event) => ({
    groupedEntities: q
      .ids(event.placeable_ids)
      .with("placeable_component", "position", "orientation"),
  }),
  prepare: ({ groupedEntities }) => ({
    ownedEntityBoxes: groupedEntities.map((e) =>
      aabbToBox(getAabbForPlaceableEntity(e)!)
    ),
  }),
  involves: (event, { ownedEntityBoxes }) => {
    const box = roundBox(event.box);
    const aabb = boxToAabb(box);
    return {
      group: q.id(event.id).optional(),
      player: event.user_id,
      terrain: q
        .byKeys("terrainByShardId", ...involvedShards(box, ...ownedEntityBoxes))
        .terrain(),
      groupedEntities: q
        .ids(event.placeable_ids)
        .with("placeable_component", "position", "orientation"),
      acl: aclChecker({ kind: "aabb", aabb }, event.user_id),
    };
  },
  apply: ({ group, player, terrain, groupedEntities, acl }, event, context) => {
    if (group) {
      return; // Already created.
    }

    const box = roundBox(event.box);
    const inventory = new PlayerInventoryEditor(context, player);
    const cost = groupBlingCost();
    inventory.takeOrThrow(createBag(countOf(BikkieIds.bling, cost)));

    using(new context.voxeloo.GroupTensor(), (tensor) => {
      tensor.load(event.tensor);

      if (
        !checkGroupPermissions(
          terrain,
          tensor,
          box,
          groupedEntities,
          "createGroup",
          acl
        )
      ) {
        throw new RollbackError(
          `No permission to create group ${event.id} here`
        );
      }

      editShardedGroupVoxels(terrain, {
        creation: {
          tensor,
          box,
          checkOccupancyId: INVALID_BIOMES_ID,
          setOccupancyId: event.id,
          setPlacerId: INVALID_BIOMES_ID,
        },
        editVoxels: false,
      });
    });

    groupsCreated.inc();

    for (const entity of groupedEntities) {
      entity.setInGroup({ id: event.id });
    }

    const now = secondsSinceEpoch();
    const newGroup = context.create({
      id: event.id,
      box,
      created_by: {
        id: event.user_id,
        created_at: now,
      },
      placed_by: {
        id: event.user_id,
        placed_at: now,
      },
      group_component: {
        tensor: event.tensor,
      },
      grouped_entities: {
        ids: event.placeable_ids,
      },
      label: event.name
        ? {
            text: event.name,
          }
        : undefined,
      ...(event.warp === undefined
        ? {}
        : {
            warpable: {
              owner: event.user_id,
              trigger_at: now + 24 * 3600,
              warp_to: event.warp.warp_to,
              orientation: event.warp.orientation,
            },
          }),
    } as EnvironmentGroup);

    maybeSetRestoreTo(acl.restoreTimeSecs("createGroup"), newGroup, "deleted");
  },
});

export const unGroupEventHandler = makeEventHandler("unGroupEvent", {
  mergeKey: (event) => event.id,
  prepareInvolves: (event) => ({
    group: q.id(event.id).with("box", "group_component"),
  }),
  prepare: ({ group }) => ({
    box: group.box,
    groupedEntityIds: group.grouped_entities?.ids ?? [],
  }),
  involves: (event, { box, groupedEntityIds }) => ({
    group: q.id(event.id).with("box", "group_component"),
    terrain: q.byKeys("terrainByShardId", ...involvedShards(box)).terrain(),
    groupedEntities: q
      .ids(groupedEntityIds)
      .with("placeable_component", "position", "orientation"),
    acl: aclChecker({ kind: "aabb", aabb: boxToAabb(box) }, event.user_id),
  }),
  apply: ({ group, terrain, groupedEntities, acl }, event, context) => {
    using(new context.voxeloo.GroupTensor(), (tensor) => {
      tensor.load(group.groupComponent().tensor);
      if (
        !checkGroupPermissions(
          terrain,
          tensor,
          group.box(),
          groupedEntities,
          "createGroup",
          acl
        )
      ) {
        throw new RollbackError(
          `No permission to ungroup group ${event.id} here`
        );
      }

      editShardedGroupVoxels(terrain, {
        deletion: {
          tensor,
          box: group.box(),
          checkOccupancyId: group.id,
        },
        editVoxels: event.remove_voxels,
      });
    });
    context.delete(group.id);
  },
});

function makeGroupDrop(
  group: QueriedEntityWith<"id" | "box">,
  dropId: BiomesId,
  userId: BiomesId | undefined,
  rotation: Rotation | undefined,
  context: EventContext<InvolvedSpecification>
) {
  const dropFilter = userId
    ? <GrabBagFilter>{
        kind: "only",
        entity_ids: new Set([userId]),
        expiry: undefined, // Don't expire group drops.
      }
    : undefined;

  const dropPos = centerAABB([group.box().v0, group.box().v1]);
  dropPos[1] = group.box().v0[1];
  context.create(
    newDrop(
      dropId,
      dropPos,
      false,
      [countOf(groupItem(group.id, group.label()?.text, rotation))],
      dropFilter
    )
  );
}

export const destroyGroupEventHandler = makeEventHandler("destroyGroupEvent", {
  mergeKey: (event) => event.id,
  prepareInvolves: (event) => ({
    group: q.id(event.id).with("box", "group_component"),
    groupedEntities: q
      .ids(event.placeable_ids)
      .with("placeable_component", "position", "orientation"),
  }),
  prepare: ({ group, groupedEntities }) => {
    return {
      box: group.box,
      groupedEntityBoxes: groupedEntities.map((e) =>
        aabbToBox(getAabbForPlaceableEntity(e)!)
      ),
    };
  },
  involves: (event, { box, groupedEntityBoxes }) => ({
    group: q.id(event.id).with("box", "group_component"),
    groupedEntities: q
      .ids(event.placeable_ids)
      .with("placeable_component", "position", "orientation"),
    terrain: q
      .byKeys("terrainByShardId", ...involvedShards(box, ...groupedEntityBoxes))
      .terrain(),
    dropId: newId(),
    user: event.user_id,
    acl: aclChecker({ kind: "aabb", aabb: boxToAabb(box) }, event.user_id),
  }),
  apply: (
    { group, groupedEntities, terrain, dropId, user, acl },
    event,
    context
  ) => {
    // Make sure client-supplied placeables list matches server.
    ok(isEqual(event.placeable_ids, group.groupedEntities()?.ids || []));

    // Check permissions for a single voxel.
    if (!acl.can("destroy", { entity: group })) {
      log.warn(
        `User "${
          event.user_id
        }" is not allowed to destroy group at (${event.position.join(",")}).`
      );
      return;
    }

    usingAll([new context.voxeloo.GroupTensor()], (tensor) => {
      tensor.load(group.groupComponent().tensor);
      iceGroup(group, tensor, terrain, groupedEntities);
    });
    maybeSetRestoreTo(acl.restoreTimeSecs("destroy"), group, "created");

    const willBeRestored = group.restoresTo()?.restore_to_state === "created";

    if (!willBeRestored) {
      makeGroupDrop(group, dropId, user.id, event.rotation, context);
    }
  },
});

function iceGroup(
  group: QueriedEntityWith<"id" | "box" | "group_component">,
  tensor: GroupTensor,
  terrain: Terrain[],
  groupedEntities: QueriedEntityWith<
    "id" | "position" | "orientation" | "placeable_component"
  >[]
) {
  editShardedGroupVoxels(terrain, {
    deletion: {
      tensor,
      box: group.box(),
      checkOccupancyId: group.id,
    },
    editVoxels: true,
  });

  group.setIced();

  groupedEntities.forEach((e) => {
    e.setIced();
    clearTerrainOccupancyForPlaceable(
      terrain,
      e.placeableComponent().item_id,
      e.position().v,
      e.orientation().v
    );
  });
}

export const placeGroupEventHandler = makeEventHandler("placeGroupEvent", {
  mergeKey: (event) => event.id,
  prepareInvolves: (event) => ({
    group: q
      .id(event.id)
      .includeIced() // For admin endpoint.
      .with("box", "group_component")
      .optional(),
  }),
  prepare: ({ group }) => ({
    oldBox: group?.box,
    groupedEntityIds: group?.grouped_entities?.ids ?? [],
  }),
  involves: (event, { oldBox, groupedEntityIds }) => {
    const newBox = roundBox(event.box);
    return {
      group: q.id(event.id).includeIced().with("box", "group_component"),
      groupedEntities: q
        .ids(groupedEntityIds)
        .includeIced()
        .with("placeable_component", "position", "orientation"),
      terrain: q
        .byKeys("terrainByShardId", ...involvedShards(oldBox, newBox))
        .terrain(),
      player: q.id(event.user_id).includeIced(),
      acl: aclChecker({ kind: "aabb", aabb: boxToAabb(newBox) }, event.user_id),
    };
  },
  apply: ({ group, groupedEntities, terrain, player, acl }, event, context) => {
    const newBox = roundBox(event.box);
    const inventory = new PlayerInventoryEditor(context, player);
    const slot = inventory.get(event.inventory_ref);
    if (!slot || slot.item.groupId !== event.id) {
      log.warn("Attempted to place group from invalid slot");
    } else {
      inventory.set(event.inventory_ref, undefined);
    }

    if (group && !group.iced()) {
      usingAll([new context.voxeloo.GroupTensor()], (tensor) => {
        tensor.load(group.groupComponent().tensor);
        iceGroup(group, tensor, terrain, groupedEntities);
      });
    }

    group.setBox(newBox);
    const now = secondsSinceEpoch();
    group.setPlacedBy(PlacedBy.create({ id: event.user_id, placed_at: now }));

    if (event.tensor) {
      group.setGroupComponent({
        tensor: event.tensor,
      });
    }

    // Rotate and place owned entities.
    // We need them to be placed correctly to run the group permissions check below.
    groupedEntities.forEach((e) => {
      const [newPosition, newOrientation] = transformBoxOwnedPosition(
        e.position().v,
        e.orientation().v,
        group.box(),
        newBox,
        (event.rotation ?? 0) as Rotation,
        (event.reflection ?? [0, 0, 0]) as Reflect
      );
      e.setPosition({ v: newPosition });
      e.setOrientation({ v: newOrientation });
    });

    usingAll([new context.voxeloo.GroupTensor()], (tensor) => {
      tensor.load(group.groupComponent().tensor);
      deIceGroup(
        context.voxeloo,
        event.user_id,
        group,
        tensor,
        terrain,
        groupedEntities,
        acl
      );
    });

    if (group.warpable()) {
      group.mutableWarpable().warp_to = event.warp.warp_to;
      group.mutableWarpable().orientation = event.warp.orientation;
    }

    maybeSetRestoreTo(acl.restoreTimeSecs("place"), group, "deleted");
  },
});

function deIceGroup(
  voxeloo: VoxelooModule,
  actor: BiomesId | undefined,
  group: QueriedEntityWith<"id" | "box" | "group_component">,
  tensor: GroupTensor,
  terrain: Terrain[],
  groupedEntities: QueriedEntityWith<
    "id" | "position" | "orientation" | "placeable_component"
  >[],
  acl?: AclChecker
) {
  const now = secondsSinceEpoch();
  groupedEntities.forEach((e) => {
    e.clearIced();
    checkAndOccupyTerrainForPlaceable(
      e.id,
      terrain,
      e.placeableComponent().item_id,
      e.position().v,
      e.orientation().v,
      acl
    );
    if (actor) {
      e.setPlacedBy(PlacedBy.create({ id: actor, placed_at: now }));
    }
  });

  usingAll([new voxeloo.GroupTensor()], (creationTensor) => {
    const tensorBlob = group.groupComponent().tensor;
    ok(tensorBlob);
    creationTensor.load(tensorBlob);

    if (
      acl &&
      !checkGroupPermissions(
        terrain,
        creationTensor,
        group.box(),
        groupedEntities,
        "place",
        acl
      )
    ) {
      throw new RollbackError(`No permission to place group ${group.id} here`);
    }

    editShardedGroupVoxels(terrain, {
      creation: {
        tensor: creationTensor,
        box: group.box(),
        setOccupancyId: group.id,
        setPlacerId: INVALID_BIOMES_ID,
        ignoreExistingFlora: true,
      },
      editVoxels: true,
    });
  });

  group.clearIced();
  if (actor) {
    group.setPlacedBy(PlacedBy.create({ id: actor, placed_at: now }));
  }
}

export const cloneGroupEventHandler = makeEventHandler("cloneGroupEvent", {
  mergeKey: (event) => event.id,
  prepareInvolves: (event) => ({
    group: q.id(event.id).includeIced().with("box", "group_component"),
  }),
  prepare: ({ group }) => ({
    oldBox: group.box,
    groupedEntityIds: group.grouped_entities?.ids ?? [],
  }),
  involves: (event, { oldBox, groupedEntityIds }) => {
    const newBox = roundBox(event.box);
    return {
      group: q.id(event.id).includeIced().with("box", "group_component"),
      groupedEntities: q
        .ids(groupedEntityIds)
        .includeIced()
        .with("position", "orientation"),
      terrain: q
        .byKeys("terrainByShardId", ...involvedShards(oldBox, newBox))
        .terrain(),
      player: q.id(event.user_id).includeIced(),
      newPlaceableIds: groupedEntityIds?.length
        ? newIds(groupedEntityIds.length)
        : undefined,
    };
  },
  apply: (
    { group, groupedEntities, terrain, player, newPlaceableIds },
    event,
    context
  ) => {
    const newBox = roundBox(event.box);
    const inventory = new PlayerInventoryEditor(context, player);
    const slot = inventory.get(event.inventory_ref);
    if (!slot || slot.item.groupId !== event.id) {
      log.warn("Attempted to clone group from invalid slot");
      return;
    }

    const tensorBlob = event.tensor || group.groupComponent().tensor;
    ok(tensorBlob, `Group tensor missing for ${event.id}`);

    using(new context.voxeloo.GroupTensor(), (creationTensor) => {
      ok(tensorBlob);
      creationTensor.load(tensorBlob);
      editShardedGroupVoxels(terrain, {
        creation: {
          tensor: creationTensor,
          box: newBox,
        },
        editVoxels: true,
      });
    });

    // Rotate and clone owned entities.
    groupedEntities.forEach((e, idx) => {
      const [newPosition, newOrientation] = transformBoxOwnedPosition(
        e.position().v,
        e.orientation().v,
        group.box(),
        newBox,
        (event.rotation ?? 0) as Rotation,
        (event.reflection ?? [0, 0, 0]) as Reflect
      );
      ok(newPlaceableIds);
      context.create(
        newPlaceable({
          id: newPlaceableIds[idx],
          creatorId: event.user_id,
          position: newPosition,
          orientation: newOrientation,
          item: anItem(e.placeableComponent()!.item_id),
        })
      );
    });
  },
});

export const repairGroupEventHandler = makeEventHandler("repairGroupEvent", {
  mergeKey: (event) => event.id,
  prepareInvolves: (event) => ({
    group: q.id(event.id).with("box", "group_component"),
  }),
  prepare: ({ group }) => group?.box,
  involves: (event, box) => ({
    group: q.id(event.id).with("box", "group_component"),
    terrain: q.byKeys("terrainByShardId", ...involvedShards(box)).terrain(),
  }),
  apply: ({ group, terrain }, _event, context) => {
    using(new context.voxeloo.GroupTensor(), (tensor) => {
      tensor.load(group.groupComponent().tensor);
      editShardedGroupVoxels(terrain, {
        creation: {
          tensor,
          box: group.box(),
          setOccupancyId: group.id,
          setPlacerId: INVALID_BIOMES_ID,
          ignoreExistingBlocks: true,
          ignoreExistingFlora: true,
        },
        editVoxels: true,
      });
    });
  },
});

export const adminInventoryGroupEventHandler = makeEventHandler(
  "adminInventoryGroupEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      group: q.includeIced(event.id).with("group_component"),
      player: q.id(event.user_id).with("inventory"),
    }),
    apply: ({ group, player }, _event, context) => {
      const inventory = new PlayerInventoryEditor(context, player);
      const bag = createBag(countOf(groupItem(group.id)));
      inventory.giveOrThrow(bag);
    },
  }
);

export const updateGroupPreviewEventHandler = makeEventHandler(
  "updateGroupPreviewEvent",
  {
    mergeKey: (event) => event.id,
    prepareInvolves: (event) => ({
      player: event.id,
    }),
    prepare: ({ player }) => ({ ref: player.group_preview_reference?.ref }),
    involves: (event, ref) => ({
      player: event.id,
      groupPreview: q.optional(ref.ref),
      newPreviewId: newId(),
    }),
    apply: ({ player, groupPreview, newPreviewId }, event, context) => {
      if (!groupPreview) {
        groupPreview = context.create({
          id: newPreviewId,
        });
        player.setGroupPreviewReference({
          ref: groupPreview.id,
        });
      }
      groupPreview.setBox(event.box);
      groupPreview.setGroupComponent({
        tensor: event.tensor,
      });
      groupPreview.setGroupPreviewComponent({
        owner_id: player.id,
        blueprint_id: event.blueprint_id,
      });
      groupPreview.setExpires({
        trigger_at: secondsSinceEpoch() + GROUP_PREVIEW_EXPIRATION_S,
      });
    },
  }
);

export const deleteGroupPreviewEventHandler = makeEventHandler(
  "deleteGroupPreviewEvent",
  {
    mergeKey: (event) => event.id,
    prepareInvolves: (event) => ({
      player: event.id,
    }),
    prepare: ({ player }) => player.group_preview_reference?.ref,
    involves: (event, ref) => ({
      player: event.id,
      groupPreview: ref,
    }),
    apply: ({ player, groupPreview }, _event, context) => {
      context.delete(groupPreview?.id);
      player.setGroupPreviewReference({ ref: undefined });
    },
  }
);

export const createCraftingStationEventHandler = makeEventHandler(
  "createCraftingStationEvent",
  {
    mergeKey: (event) => event.id,
    prepareInvolves: (event) => ({
      blueprint: event.id,
    }),
    prepare: ({ blueprint }) => ({
      aabb: getAabbForEntity(blueprint)!,
    }),
    involves: (event, { aabb }) => ({
      blueprint: q.id(event.id).with("position", "blueprint_component"),
      terrain: q
        .byKeys("terrainByShardId", ...involvedShards(aabbToBox(aabb)))
        .terrain(),
      stationId: newId(),
      acl: aclChecker(
        {
          kind: "aabb",
          aabb: integerAABB(aabb),
        },
        event.id
      ),
    }),
    apply: ({ blueprint, terrain, stationId, acl }, event, context) => {
      const box = aabbToBox(getAabbForEntity(blueprint.asReadonlyEntity())!);
      const blueprintItem = anItem(blueprint.blueprintComponent().blueprint_id);
      const { tensor: tensorBlob } = getBlueprintData(blueprintItem.id);
      const rotation = ((orientationToRotation(blueprint.orientation()?.v) +
        (blueprintItem.rotation ?? 0)) %
        4) as Rotation;

      using(new context.voxeloo.GroupTensor(), (tensor) => {
        tensor.load(tensorBlob);
        using(
          rotateGroupTensor(context.voxeloo, tensor, rotation),
          (rotatedTensor) => {
            editShardedGroupVoxels(terrain, {
              deletion: {
                tensor: rotation === 0 ? tensor : rotatedTensor,
                box,
                ignoreMaterial: true,
              },
              editVoxels: true,
            });
          }
        );
      });
      context.delete(event.id);

      const turnsInto = anItem(blueprintItem.id).turnsInto;
      ok(turnsInto);
      // Would be nice to not have to do this and have consitent orientations...
      const stationOrientation = rotationToOrientation(
        rotation + (blueprintItem.turnsIntoRotation ?? 0)
      );

      // We set the owner of the crafting station to the owner of the blueprint.
      // That way other people can help you build the blueprint.
      const ownerId = blueprint.blueprintComponent().owner_id;

      // Emit a firehose event when the station is created.
      const pos = blueprint.position()?.v;
      ok(pos, "Blueprint has no position");
      context.publish({
        kind: "blueprintBuilt",
        entityId: ownerId,
        blueprint: blueprintItem.id,
        position: pos,
      });

      const entityToCreate = newPlaceable({
        id: stationId,
        creatorId: ownerId,
        position: blueprint.position().v,
        orientation: stationOrientation,
        item: anItem(turnsInto),
        craftingStation: true,
        timestamp: secondsSinceEpoch(),
      });
      const placeable = context.create(entityToCreate);

      deIcePlaceable(
        ownerId,
        placeable,
        undefined,
        terrain,
        placeable.position().v,
        placeable.orientation().v,
        acl
      );

      onPlaceablePlace(placeable, acl, context);
    },
  }
);

export const captureGroupEventHandler = makeEventHandler("captureGroupEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    player: q.id(event.user_id).with("inventory"),
    group: q.id(event.id),
  }),
  apply: ({ player, group }, _event, context) => {
    const inventory = new PlayerInventoryEditor(context, player);
    inventory.giveOrThrow(
      createBag(countOf(groupItem(group.id, group.label()?.text)))
    );
  },
});

export const restoreGroupEventHandler = makeEventHandler("restoreGroupEvent", {
  mergeKey: (event) => event.id,
  prepareInvolves: (event) => ({
    group: q.includeIced(event.id).with("box", "group_component"),
    groupedEntities: q
      .ids(event.placeable_ids)
      .with("placeable_component", "position", "orientation"),
    terrain: event.restoreRegion
      ? queryForTerrainInBox(aabbToBox(event.restoreRegion))
      : undefined,
  }),
  prepare: ({ group, groupedEntities, terrain }, event, { voxeloo }) => {
    return {
      box: group.box,
      groupedEntityBoxes: groupedEntities.map((e) =>
        aabbToBox(getAabbForPlaceableEntity(e)!)
      ),
      terrainRelevantEntityIds:
        terrain && event.restoreRegion
          ? queryForRelevantEntities(voxeloo, terrain, event.restoreRegion)
          : undefined,
    };
  },
  involves: (event, { box, groupedEntityBoxes, terrainRelevantEntityIds }) => ({
    group: q
      .includeIced(event.id)
      .with("restores_to", "box", "group_component"),
    groupedEntities: q
      .ids(event.placeable_ids)
      .with("placeable_component", "position", "orientation"),
    terrain: q
      .byKeys("terrainByShardId", ...involvedShards(box, ...groupedEntityBoxes))
      .terrain(),
    terrainRelevantEntities: terrainRelevantEntityIds
      ? q.ids(terrainRelevantEntityIds)
      : undefined,
    dropId: newId(),
  }),
  apply: (
    { group, terrain, groupedEntities, terrainRelevantEntities, dropId },
    _event,
    context
  ) => {
    const timestamp = secondsSinceEpoch();
    ok(group.restoresTo().trigger_at <= timestamp);

    using(new context.voxeloo.GroupTensor(), (tensor) => {
      tensor.load(group.groupComponent().tensor);

      switch (group.restoresTo().restore_to_state) {
        case "created":
          {
            ok(terrainRelevantEntities);
            tryRestoreToCreated(
              group,
              terrainRelevantEntities,
              groupTerrainIterators(group, tensor, groupedEntities, terrain),
              context,
              () => {
                deIceGroup(
                  context.voxeloo,
                  undefined,
                  group,
                  tensor,
                  terrain,
                  groupedEntities
                );
              }
            );
          }
          break;
        case "deleted":
          {
            if (group.iced()) {
              log.error(
                `About to restore entity ${group.id} to deleted state, but it's already iced.`
              );
              group.clearRestoresTo();
              break;
            }
            iceGroup(group, tensor, terrain, groupedEntities);
            group.clearRestoresTo();
            makeGroupDrop(group, dropId, undefined, undefined, context);
          }
          break;
      }
    });
  },
});

function groupTerrainIterators(
  group: QueriedEntityWith<"id" | "box" | "group_component">,
  tensor: GroupTensor,
  groupedEntities: QueriedEntityWith<
    "id" | "position" | "orientation" | "placeable_component"
  >[],
  allTerrain: Terrain[]
) {
  const terrainIterators = [];

  for (const e of groupedEntities) {
    const aabb = getAabbForPlaceable(
      e.placeableComponent().item_id,
      e.position().v,
      e.orientation().v
    );
    if (!aabb) {
      continue;
    }
    terrainIterators.push(new AabbTerrainIterator(allTerrain, aabb));
  }

  terrainIterators.push(
    new GroupTensorTerrainIterator(allTerrain, tensor, group.box())
  );

  return terrainIterators;
}
