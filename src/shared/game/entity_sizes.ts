import type { Create, Update } from "@/shared/ecs/change";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { PlaceableAnimation } from "@/shared/ecs/gen/types";
import { getAabbForPlaceableEntity } from "@/shared/game/placeables";
import { playerAABB } from "@/shared/game/players";
import { discreteRotation, sizeAABB } from "@/shared/math/linear";
import type { AABB, Vec2, Vec3 } from "@/shared/math/types";

export type EntityMotionOverrides = {
  position?: Vec3;
  velocity?: Vec3;
  orientation?: Vec2;
};

const SIZE_AFFECTING_COMPONENTS = [
  "size",
  "position",
  "orientation",
  "placeable_component",
  "player_behavior",
  "blueprint_component",
] as const;

export type ReadonlySizeEntity = Pick<
  ReadonlyEntity,
  (typeof SIZE_AFFECTING_COMPONENTS)[number] | "id"
>;

export function changeMayAffectSize(
  change: Readonly<Create | Update>
): boolean {
  return SIZE_AFFECTING_COMPONENTS.some((c) => c in change.entity);
}

export function getSizeForEntity(
  entity: ReadonlySizeEntity,
  context: ExtentsContext = {}
): Vec3 | undefined {
  if (entity.placeable_component || entity.blueprint_component) {
    const aabb = getAabbForPlaceableEntity(entity, context);
    return aabb ? sizeAABB(aabb) : undefined;
  }
  if (entity.size) {
    return [...entity.size.v];
  }
  if (entity.player_behavior) {
    return sizeAABB(playerAABB([0, 0, 0]));
  }
  // No size for this entity.
  return undefined;
}

export interface ExtentsContext {
  extentsType?: "collidable";
  motionOverrides?: EntityMotionOverrides;
  animationState?: PlaceableAnimation;
}

export function getAabbForEntity(
  entity: ReadonlySizeEntity,
  context: ExtentsContext = {}
): AABB | undefined {
  const { motionOverrides } = context;
  const position = motionOverrides?.position ?? entity.position?.v;
  if (!position) {
    return undefined;
  }
  const orientation = motionOverrides?.orientation ?? entity.orientation?.v;

  if (entity.placeable_component || entity.blueprint_component) {
    // Placables have special logic based on their state (e.g. open/closed)
    return getAabbForPlaceableEntity(entity, {
      ...context,
      animationState: entity.placeable_component?.animation,
    });
  }

  const size = getSizeForEntity(entity, context);
  if (!size) {
    return undefined;
  }

  const orientedSize = orientation ? discreteRotation(orientation, size) : size;
  return [
    [
      position[0] - orientedSize[0] / 2,
      position[1],
      position[2] - orientedSize[2] / 2,
    ],
    [
      position[0] + orientedSize[0] / 2,
      position[1] + orientedSize[1],
      position[2] + orientedSize[2] / 2,
    ],
  ];
}
