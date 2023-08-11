import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type {
  ClientResourceDeps,
  ClientResources,
} from "@/client/game/resources/types";

import { BikkieIds } from "@/shared/bikkie/ids";
import type { BuildingRequirements } from "@/shared/bikkie/schema/types";
import type { Item } from "@/shared/ecs/gen/types";
import { anItem } from "@/shared/game/item";
import { getAabbForPlaceable } from "@/shared/game/placeables";
import { terrainMarch } from "@/shared/game/terrain_march";
import type { BiomesId } from "@/shared/ids";
import {
  add,
  discreteRotation,
  mod,
  scale,
  squareVector,
} from "@/shared/math/linear";
import { faceNormal, sideFaceRight } from "@/shared/math/normals";
import type {
  ReadonlyAABB,
  ReadonlyVec2,
  ReadonlyVec3,
  Vec3,
} from "@/shared/math/types";
import { assertNever } from "@/shared/util/type_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import { Dir } from "@/shared/wasm/types/common";
import { every, some } from "lodash";
import { useEffect, useState } from "react";

export function isDoubleSidedFrame(itemId: BiomesId) {
  return itemId === BikkieIds.smallOakSign;
}

export function isStandingFrameId(itemId: BiomesId) {
  return itemId === BikkieIds.smallOakSign;
}

export function allowPlacement(item: Item, dir: Dir) {
  if (item.placementType === "wallCenter") {
    return dir !== Dir.Y_POS && dir !== Dir.Y_NEG;
  } else if (item.placementType === "any") {
    return true;
  }

  return dir === Dir.Y_POS;
}

export function placementPos(
  item: Item,
  pos: ReadonlyVec3,
  faceDir: Dir,
  orientation: ReadonlyVec2
): Vec3 {
  const boxSize = anItem(item.id)?.boxSize ?? squareVector;
  const orientedBoxSize = discreteRotation(orientation, boxSize);
  if (item.placementType === "wallCenter") {
    const width = boxSize[1];
    const centerVoxel = add(pos, [0.5, 0, 0.5]);
    const bottomCenter = add(centerVoxel, scale(-0.45, faceNormal(faceDir)));
    if (width % 2 === 1) {
      return bottomCenter;
    } else {
      const rightMove = add(
        bottomCenter,
        scale(-0.5 + 0.5 * width, sideFaceRight(faceDir))
      );
      return rightMove;
    }
  } else {
    const voxalign: Vec3 = scale(0.5, mod(orientedBoxSize, 2));
    voxalign[1] = 0;
    return add(pos, voxalign);
  }
}

const MAX_ROOF_DISTANCE = 16;

export function roofAbovePos(
  voxeloo: VoxelooModule,
  deps: ClientResources | ClientResourceDeps,
  pos: ReadonlyVec3,
  maxDistance: number = MAX_ROOF_DISTANCE
) {
  const dir: Vec3 = [0, 1, 0];
  let hitRoof = false;
  terrainMarch(voxeloo, deps, pos, dir, maxDistance, (_hit) => {
    hitRoof = true;
  });
  return hitRoof;
}

function* aabbTopPlaneIterator(aabb: ReadonlyAABB) {
  for (let x = Math.floor(aabb[0][0]); x < Math.ceil(aabb[1][0]); x++) {
    for (let z = Math.floor(aabb[0][2]); z < Math.ceil(aabb[1][2]); z++) {
      const pos: Vec3 = [x, aabb[1][1] - 1, z];
      yield pos;
    }
  }
}

export function roofAboveAabb(
  voxeloo: VoxelooModule,
  deps: ClientResources | ClientResourceDeps,
  aabb: ReadonlyAABB,
  maxDistance: number = MAX_ROOF_DISTANCE
) {
  return every([...aabbTopPlaneIterator(aabb)], (pos) =>
    roofAbovePos(voxeloo, deps, pos, maxDistance)
  );
}

export function noRoofAboveAabb(
  voxeloo: VoxelooModule,
  deps: ClientResources | ClientResourceDeps,
  aabb: ReadonlyAABB,
  maxDistance: number = MAX_ROOF_DISTANCE
) {
  return !some([...aabbTopPlaneIterator(aabb)], (pos) =>
    roofAbovePos(voxeloo, deps, pos, maxDistance)
  );
}

export function useCheckPlaceableBuildingRequirements(
  entityId: BiomesId,
  maxDistance: number = MAX_ROOF_DISTANCE
) {
  const [meetsRequirements, setMeetsRequirements] = useState(false);
  const { reactResources, resources, voxeloo } = useClientContext();
  const [placeableComponent, position, orientation] = reactResources.useAll(
    ["/ecs/c/placeable_component", entityId],
    ["/ecs/c/position", entityId],
    ["/ecs/c/orientation", entityId]
  );

  useEffect(() => {
    if (!placeableComponent || !position) {
      setMeetsRequirements(false);
      return;
    }
    const item = anItem(placeableComponent.item_id);
    const aabb = getAabbForPlaceable(
      placeableComponent.item_id,
      position.v,
      orientation?.v
    );
    if (!aabb) {
      setMeetsRequirements(false);
      return;
    }
    setMeetsRequirements(
      checkAabbBuildingRequirements(
        voxeloo,
        resources,
        aabb,
        item.buildingRequirements,
        maxDistance
      )
    );
  }, [entityId, placeableComponent?.item_id, position?.v, orientation?.v]);

  return meetsRequirements;
}

export function checkAabbBuildingRequirements(
  voxeloo: VoxelooModule,
  deps: ClientResources | ClientResourceDeps,
  aabb: ReadonlyAABB,
  buildingRequirements: BuildingRequirements,
  maxDistance: number = MAX_ROOF_DISTANCE
) {
  switch (buildingRequirements) {
    case "roof":
      return roofAboveAabb(voxeloo, deps, aabb, maxDistance);
    case "noRoof":
      return noRoofAboveAabb(voxeloo, deps, aabb, maxDistance);
    case "none":
    case undefined:
      return true;
  }
  assertNever(buildingRequirements);
}
