import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { ExtentsContext } from "@/shared/game/entity_sizes";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { normalizeAngle } from "@/shared/math/angles";
import {
  ceil,
  discreteRotation,
  discreteRotationWithReflection,
  squareVector,
} from "@/shared/math/linear";
import type {
  AABB,
  ReadonlyVec2,
  ReadonlyVec3,
  Vec2,
  Vec3,
} from "@/shared/math/types";
import { ok } from "assert";

export function getSizeForPlacable(
  itemId: BiomesId,
  context: ExtentsContext = {}
): Vec3 | undefined {
  const item = anItem(itemId);
  if (item.isBlueprint) {
    return item.boxSize;
  } else if (item.isPlaceable) {
    const size =
      context.extentsType === "collidable" ? item.collidableSize : item.boxSize;
    return size ?? item.boxSize ?? squareVector;
  }
}

export function getAabbForPlaceable(
  itemId: BiomesId,
  position: ReadonlyVec3,
  orientation: ReadonlyVec2 | undefined,
  context: ExtentsContext = {}
): AABB | undefined {
  let size = getSizeForPlacable(itemId, context);
  if (!size) {
    return;
  }

  let shift: ReadonlyVec3 = [0, 0, 0];
  if (anItem(itemId).isDoor && context.animationState?.type === "open") {
    shift = [-0.5, 0, -0.5];
    size = [size[2], size[1], size[0]];
  }

  const orientedShift = discreteRotationWithReflection(orientation, shift);
  const orientedBoxSize = discreteRotation(orientation, size);
  return [
    [
      position[0] + orientedShift[0] - orientedBoxSize[0] / 2,
      position[1] + orientedShift[1],
      position[2] + orientedShift[2] - orientedBoxSize[2] / 2,
    ],
    [
      position[0] + orientedShift[0] + orientedBoxSize[0] / 2,
      position[1] + orientedShift[1] + orientedBoxSize[1],
      position[2] + orientedShift[2] + orientedBoxSize[2] / 2,
    ],
  ];
}

export function getAabbForPlaceableEntity(
  entity: Pick<
    ReadonlyEntity,
    "placeable_component" | "position" | "orientation" | "blueprint_component"
  >,
  context: ExtentsContext = {}
): AABB | undefined {
  ok(entity.position);
  const { motionOverrides } = context;
  const position = motionOverrides?.position ?? entity.position.v;
  const orientation = motionOverrides?.orientation ?? entity.orientation?.v;

  if (entity.placeable_component) {
    const itemId = entity.placeable_component.item_id;
    return getAabbForPlaceable(itemId, position, orientation, context);
  } else if (entity.blueprint_component) {
    const itemId = entity.blueprint_component.blueprint_id;
    return getAabbForPlaceable(itemId, position, orientation, context);
  }
}

export function getVoxelOccupancyForPlaceable(
  entity: ReadonlyEntity
): AABB | undefined {
  if (!entity.placeable_component || !entity.position) {
    return;
  }

  const boxSize =
    anItem(entity.placeable_component.item_id)?.boxSize ?? squareVector;
  const ceilBoxSize = ceil(boxSize);

  const position = entity.position.v;
  return [
    [
      position[0] - ceilBoxSize[0] / 2,
      position[1],
      position[2] - ceilBoxSize[2] / 2,
    ],
    [
      position[0] + ceilBoxSize[0] / 2,
      position[1] + ceilBoxSize[1],
      position[2] + ceilBoxSize[2] / 2,
    ],
  ];
}

export function allowPlaceableDestruction(
  placeable: ReadonlyEntity,
  group: ReadonlyEntity | undefined
) {
  // Only allow destroying placeables that are not in a group.
  return group === undefined;
}

export function placeableOrientationToPlayerOrientation(
  orientation: undefined
): undefined;
export function placeableOrientationToPlayerOrientation(
  orientation: Vec2 | ReadonlyVec2
): Vec2;
export function placeableOrientationToPlayerOrientation(
  orientation?: Vec2 | ReadonlyVec2
): Vec2 | undefined {
  if (!orientation) {
    return undefined;
  }

  return [orientation[0], normalizeAngle(orientation[1] + Math.PI)];
}
