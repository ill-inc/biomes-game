import type { InteractionErrorWithoutTime } from "@/client/components/toast/types";
import type { PermissionsManager } from "@/client/game/context_managers/permissions_manager";
import type { BuildAction } from "@/client/game/helpers/blueprint";
import { occupancyAt, placerAt } from "@/client/game/helpers/occupancy";
import { AttackDestroyInteractionError } from "@/client/game/interact/errors";
import type { AttackInteraction } from "@/client/game/interact/helpers";
import type {
  ActiveAction,
  AttackInfo,
  DestroyInfo,
  InteractContext,
  PressAndHoldInfo,
} from "@/client/game/interact/types";
import type { GameModal } from "@/client/game/resources/game_modal";
import type { ClientResources } from "@/client/game/resources/types";
import type { ShapeName } from "@/shared/asset_defs/shapes";
import type { TerrainName } from "@/shared/asset_defs/terrain";
import { BikkieIds } from "@/shared/bikkie/ids";
import { terrainIdToBlock } from "@/shared/bikkie/terrain";
import { HAND_HARDNESS } from "@/shared/constants";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { AclAction, OwnedItemReference } from "@/shared/ecs/gen/types";
import { blockDestructionTimeMs, blockShapeTimeMs } from "@/shared/game/damage";
import { getAabbForEntity } from "@/shared/game/entity_sizes";
import { boxToAabb } from "@/shared/game/group";
import type { Item } from "@/shared/game/item";
import { anItem } from "@/shared/game/item";
import type {
  BlueprintHit,
  EntityHit,
  TerrainHit,
} from "@/shared/game/spatial";
import { isEditedAt } from "@/shared/game/terrain_march";
import type { BiomesId } from "@/shared/ids";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { ok } from "assert";
import { isEqual } from "lodash";

export interface LegacyInteractInput {
  actionAllowed: (
    pos: ReadonlyVec3,
    action: AclAction,
    entityId?: BiomesId
  ) => boolean;
  groupOccupancyAt: (pos: ReadonlyVec3) => BiomesId | undefined;
  plantExperimentalAt: (pos: ReadonlyVec3) => BiomesId | undefined;
  groupHardnessClass: (groupId: BiomesId) => number;
  isTerrainAtPosition: (pos: ReadonlyVec3) => boolean;
  checkActionAllowedIfBlueprintVoxel: (
    pos: ReadonlyVec3,
    action: BuildAction
  ) => boolean;
  groupDestructionTimeMs: (groupId: BiomesId, tool: Item | undefined) => number;
  entityGroupPermitsPlaceableDestruction: (entity: ReadonlyEntity) => boolean;

  playerDestroyInfo: DestroyInfo | undefined;
  secondsSinceEpoch: number;
}

export type InteractInputSubset<T extends keyof LegacyInteractInput> = Pick<
  LegacyInteractInput,
  T
>;

export interface PlaceGroupInteraction {
  item: Item;
  slotRef: OwnedItemReference;
}

export interface ShowPlaceablePreviewInteraction {
  position: Vec3;
  item: Item;
  slotRef: OwnedItemReference;
}

export interface PlaceVoxelInteraction {
  position: Vec3;
  face: number | undefined;
  slotRef: OwnedItemReference;
  terrainName: TerrainName;
}

export interface PlacePlaceableInteraction {
  position: Vec3;
  face: number;
  slotRef: OwnedItemReference;
  item: Item;
}

export interface DumpWaterInteraction {
  position: Vec3;
  face: number;
  terrainDist: number;
}

export interface CreateCraftingStationInteraction {
  craftingStationId: BiomesId;
}

export interface WandInteraction {
  hitPosition: Vec3;
}

export interface LegacyInteractOutput {
  destroyInfoChange?: { newValue: DestroyInfo | undefined };
  channelingInfoChange?: { newValue: PressAndHoldInfo | undefined };
  gameModal?: GameModal;
  interactionError?: InteractionErrorWithoutTime;

  attackInteraction?: AttackInteraction;
  placeGroupInteraction?: PlaceGroupInteraction;
  showPlaceablePreviewInteraction?: ShowPlaceablePreviewInteraction;
  placeVoxelInteraction?: PlaceVoxelInteraction;
  placePlaceableInteraction?: PlacePlaceableInteraction;
  dumpWaterInteraction?: DumpWaterInteraction;
  createCraftingStationInteraction?: CreateCraftingStationInteraction;
  wandInteraction?: WandInteraction;
}

export function isAttacking(
  attackInfo: AttackInfo | undefined,
  secondsSinceEpoch: number
) {
  return (
    attackInfo !== undefined &&
    secondsSinceEpoch - attackInfo.start < attackInfo.duration
  );
}

export function destroyPlaceable(
  input: {
    entityGroupPermitsPlaceableDestruction: LegacyInteractInput["entityGroupPermitsPlaceableDestruction"];
    actionAllowed: LegacyInteractInput["actionAllowed"];
    playerDestroyInfo: LegacyInteractInput["playerDestroyInfo"];
    secondsSinceEpoch: LegacyInteractInput["secondsSinceEpoch"];
  },
  activeAction: ActiveAction,
  entityHit: EntityHit
): LegacyInteractOutput {
  ok(activeAction.action === "destroy" || activeAction.action === "shape");
  ok(entityHit.entity.position);
  const placeableComponent = entityHit.entity.placeable_component;
  ok(placeableComponent);
  const placeableId = entityHit.entity.id;

  if (!input.entityGroupPermitsPlaceableDestruction(entityHit.entity)) {
    return {};
  }

  const pos = entityHit.entity.position.v;
  const allowed = input.actionAllowed(
    pos,
    activeAction.action,
    entityHit.entity.id
  );
  const toolHardness = activeAction.tool?.hardnessClass || HAND_HARDNESS;
  const hardnessClass = anItem(placeableComponent.item_id).hardnessClass;
  const canDestroy = allowed && toolHardness >= hardnessClass;

  if (!allowed) {
    throw new AttackDestroyInteractionError({
      kind: "acl_permission",
      action: activeAction.action,
      pos: [...pos],
      aabb: getAabbForEntity(entityHit.entity),
    });
  }

  // Use stone destuction time for now.
  const actionTimeMs = blockDestructionTimeMs(
    anItem(BikkieIds.stone),
    activeAction.tool
  );

  if (
    input.playerDestroyInfo?.placeableId !== placeableId ||
    input.playerDestroyInfo?.finished === true
  ) {
    return {
      destroyInfoChange: {
        newValue: {
          placeableId,
          pos: [...pos],
          face: 0,
          start: input.secondsSinceEpoch,
          canDestroy,
          allowed,
          hardnessClass,
          finished: false,
          activeAction: {
            ...activeAction,
            action: activeAction.action,
          },
          actionTimeMs,
        },
      },
    };
  }

  if (!canDestroy && allowed) {
    return {
      interactionError: {
        kind: "hardness",
        hardnessClass,
      },
    };
  }

  if (
    input.playerDestroyInfo === undefined ||
    input.playerDestroyInfo.finished
  ) {
    return {};
  }

  ok(input.playerDestroyInfo.placeableId === placeableId);

  const actionDelta =
    1000 * (input.secondsSinceEpoch - input.playerDestroyInfo.start);

  if (actionDelta > input.playerDestroyInfo.actionTimeMs) {
    return {
      destroyInfoChange: {
        newValue: {
          ...input.playerDestroyInfo,
          finished: true,
        },
      },
    };
  } else {
    return {
      destroyInfoChange: {
        newValue: {
          ...input.playerDestroyInfo,
          percentage: actionDelta / input.playerDestroyInfo.actionTimeMs,
        },
      },
    };
  }
}

export function destroyOrShapeTerrain(
  deps: InteractContext<"resources">,
  input: InteractInputSubset<
    | "groupHardnessClass"
    | "groupOccupancyAt"
    | "checkActionAllowedIfBlueprintVoxel"
    | "actionAllowed"
    | "playerDestroyInfo"
    | "secondsSinceEpoch"
    | "groupDestructionTimeMs"
  >,
  activeAction: ActiveAction,
  hit: TerrainHit | Required<BlueprintHit>
): LegacyInteractOutput {
  let groupId: BiomesId | undefined;
  if (hit) {
    const { pos } = hit;
    groupId = input.groupOccupancyAt(pos);
  }

  ok(activeAction.action === "destroy" || activeAction.action === "shape");

  const { pos, terrainId, face } = hit;
  const terrainSample = hit.kind === "terrain" ? hit.terrainSample : undefined;
  const block = terrainIdToBlock(terrainId);
  const hardnessClass = groupId
    ? input.groupHardnessClass(groupId)
    : block
    ? block.hardnessClass
    : 0;

  const shapeName =
    activeAction.action === "shape"
      ? (activeAction.tool?.shape as ShapeName)
      : undefined;
  if (
    shapeName &&
    !input.checkActionAllowedIfBlueprintVoxel(pos, {
      kind: "shape",
      shapeName,
    })
  ) {
    return {};
  }

  const allowed = input.actionAllowed(pos, activeAction.action, groupId);
  const blockDestructionTime = block
    ? blockDestructionTimeMs(block, activeAction.tool)
    : 0;
  const blockShapeTime = block ? blockShapeTimeMs(block, activeAction.tool) : 0;
  const canDestroy = allowed && isFinite(blockDestructionTime);

  // Start Destroy or Shaping
  if (
    !input.playerDestroyInfo?.start ||
    !isEqual(pos, input.playerDestroyInfo.pos) ||
    terrainId !== input.playerDestroyInfo.terrainId ||
    !isEqual(terrainSample, input.playerDestroyInfo.terrainSample) ||
    groupId !== input.playerDestroyInfo.groupId ||
    canDestroy !== input.playerDestroyInfo.canDestroy ||
    !isEqual(input.playerDestroyInfo.activeAction, activeAction)
  ) {
    const actionTimeMs =
      activeAction.action === "destroy"
        ? groupId
          ? input.groupDestructionTimeMs(groupId, activeAction.tool)
          : blockDestructionTime
        : blockShapeTime;

    return {
      destroyInfoChange: {
        newValue: {
          start: input.secondsSinceEpoch,
          pos,
          face,
          terrainId: terrainId,
          terrainSample: terrainSample,
          groupId: groupId,
          canDestroy,
          allowed,
          hardnessClass,
          finished: false,
          activeAction: {
            ...activeAction,
            action: activeAction.action,
          },
          actionTimeMs,
        },
      },
    };
  }

  if (!canDestroy) {
    // Display error messages if held past a second.
    if (!allowed) {
      const box = groupId
        ? deps.resources.get("/ecs/c/box", groupId)
        : undefined;
      const aabb = box ? boxToAabb(box) : undefined;
      return {
        interactionError: {
          kind: "acl_permission",
          action: activeAction.action,
          pos,
          aabb,
        },
      };
    } else {
      return {
        interactionError: {
          kind: "hardness",
          hardnessClass,
        },
      };
    }
  }

  if (input.playerDestroyInfo.finished || !input.playerDestroyInfo.canDestroy) {
    return {};
  }

  // Progress Destroy or Shaping

  const actionDelta =
    1000 * (input.secondsSinceEpoch - input.playerDestroyInfo.start);

  if (actionDelta > input.playerDestroyInfo.actionTimeMs) {
    return {
      destroyInfoChange: {
        newValue: {
          ...input.playerDestroyInfo,
          finished: true,
        },
      },
    };
  }
  return {
    destroyInfoChange: {
      newValue: {
        ...input.playerDestroyInfo,
        percentage: actionDelta / input.playerDestroyInfo.actionTimeMs,
      },
    },
  };
}

export function isPotentialGroupVoxel(
  resources: ClientResources,
  permissionsManager: PermissionsManager,
  pos: ReadonlyVec3
) {
  const placerId = placerAt(resources, pos);
  if (!placerId) {
    return false;
  }

  const occupancyId = occupancyAt(resources, pos);
  if (occupancyId) {
    // This voxel is already occupied.
    return false;
  }
  if (!isEditedAt(resources, pos)) {
    return false;
  }
  return permissionsManager.getPermissionForAction(pos, "createGroup");
}
