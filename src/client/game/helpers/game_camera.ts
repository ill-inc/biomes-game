import type { ClientContextSubset } from "@/client/game/context";
import type { Camera } from "@/client/game/resources/camera";
import type { ClientResources } from "@/client/game/resources/types";
import {
  EnvironmentGroupSelector,
  NpcMetadataSelector,
  PlaceableSelector,
  PlayerSelector,
  RobotSelector,
} from "@/shared/ecs/gen/selectors";
import type { ReadonlyVec3f } from "@/shared/ecs/gen/types";
import { getAabbForEntity } from "@/shared/game/entity_sizes";
import { boxToAabb } from "@/shared/game/group";
import { countOf, createBag } from "@/shared/game/items";
import { itemBagToString } from "@/shared/game/items_serde";
import { terrainMarch } from "@/shared/game/terrain_march";
import {
  centerAABB,
  dist,
  frustumToConvexPolytope,
  intersectConvexPolytopeAABB,
  length,
  nearestPointAABB,
  scale,
  sub,
} from "@/shared/math/linear";
import type { ReadonlyAABB, Vec3 } from "@/shared/math/types";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import type { PostTaggedObject } from "@/shared/types";
import { mapMap } from "@/shared/util/collections";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { Vec3f } from "@/shared/wasm/types/common";
import { Matrix4, Vector3 } from "three";
export type ImageCrop = {
  normX: number;
  normY: number;
  normWidth: number;
  normHeight: number;
};

export function isClipped(threeNDC: Vector3) {
  return (
    threeNDC.x < -1 ||
    threeNDC.x > 1 ||
    threeNDC.y < -1 ||
    threeNDC.y > 1 ||
    threeNDC.z < -1 ||
    threeNDC.z > 1
  );
}

export function outsideOfCroppedImage(coords: [number, number, number]) {
  return coords[0] < 0 || coords[0] > 1.0 || coords[1] < 0 || coords[1] > 1.0;
}

export function getPositionRelativeToCrop(
  threeNDC: Vector3,
  imageCrop: ImageCrop
): [number, number, number] {
  const imageX = (threeNDC.x + 1) / 2;
  const imageY = (threeNDC.y + 1) / 2;

  return [
    (imageX - imageCrop.normX) / imageCrop.normWidth,
    (imageY - imageCrop.normY) / imageCrop.normHeight,
    threeNDC.z,
  ];
}

export function getNDC(
  position: Vector3,
  matrixWorldInverse: Matrix4,
  projectionMatrix: Matrix4
) {
  return new Vector3()
    .copy(position)
    .applyMatrix4(matrixWorldInverse)
    .applyMatrix4(projectionMatrix);
}

interface EntityPhotoInfo {
  ndcCoordinates: Vec3f;
  imageCoordinates: Vec3f;
}

export function approximatePointOccluded(
  voxeloo: VoxelooModule,
  resources: ClientResources,
  camera: Camera,
  pos: Vec3
) {
  const camPos = camera.three.position.toArray();
  let rayDir = sub(pos, camPos);
  const rayDist = length(rayDir);
  rayDir = scale(1 / Math.max(1e-5, rayDist), rayDir);

  let didHit = false;
  terrainMarch(voxeloo, resources, camPos, rayDir, rayDist, () => {
    didHit = true;
    return false;
  });
  return didHit;
}

export function approximatePointsOccluded(
  voxeloo: VoxelooModule,
  resources: ClientResources,
  camera: Camera,
  positions: Array<Vec3>
) {
  for (const point of positions) {
    if (!approximatePointOccluded(voxeloo, resources, camera, point)) {
      return false;
    }
  }

  return true;
}

export function approximateAABBOccluded(
  voxeloo: VoxelooModule,
  resources: ClientResources,
  camera: Camera,
  aabb: ReadonlyAABB
) {
  const ret = centerAABB(aabb);
  return approximatePointsOccluded(voxeloo, resources, camera, [
    [aabb[0][0], ret[1], ret[2]],
    [aabb[1][0], ret[1], ret[2]],

    [ret[0], aabb[1][1], ret[2]],
    [ret[0], aabb[0][1], ret[2]],

    [ret[0], ret[1], aabb[0][2]],
    [ret[0], ret[1], aabb[1][2]],

    [ret[0], ret[1], ret[2]],
  ]);
}

export function positionPhotoInfo(
  camera: Camera,
  matrixWorldInverse: Matrix4,
  projectionMatrix: Matrix4,
  imageCrop: ImageCrop,
  pos: ReadonlyVec3f,
  inclusionDistance: number
): EntityPhotoInfo | undefined {
  const dist = length(sub(camera.pos(), pos));
  if (dist > inclusionDistance) {
    return undefined;
  }

  const ndc = getNDC(new Vector3(...pos), matrixWorldInverse, projectionMatrix);
  if (isClipped(ndc)) {
    return undefined;
  }

  const imageCoordinates = getPositionRelativeToCrop(ndc, imageCrop);
  if (outsideOfCroppedImage(imageCoordinates)) {
    return undefined;
  }

  return {
    ndcCoordinates: ndc.toArray(),
    imageCoordinates,
  };
}

export function findTaggedObjectsInPost(
  deps: ClientContextSubset<"resources" | "table" | "voxeloo">,
  camera: Camera,
  matrixWorldInverse: Matrix4,
  projectionMatrix: Matrix4,
  imageCrop: ImageCrop,
  inclusionDistance: number
) {
  const taggedItems: PostTaggedObject[] = [];

  // Players
  for (const entity of deps.table.scan(
    PlayerSelector.query.spatial.inSphere(camera.frustumBoundingSphere, {
      approx: true,
    })
  )) {
    const scenePlayer = deps.resources.get("/scene/player", entity.id);
    if (!scenePlayer) {
      continue;
    }

    const wearing = deps.resources.get("/ecs/c/wearing", entity.id);

    const photoInfo = positionPhotoInfo(
      camera,
      matrixWorldInverse,
      projectionMatrix,
      imageCrop,
      scenePlayer.position,
      inclusionDistance
    );

    if (!photoInfo) {
      continue;
    }

    if (
      approximateAABBOccluded(
        deps.voxeloo,
        deps.resources,
        camera,
        scenePlayer.aabb()
      )
    ) {
      continue;
    }

    taggedItems.push({
      kind: "user",
      id: entity.id,
      ndcCoordinates: photoInfo.ndcCoordinates,
      imageCoordinates: photoInfo.imageCoordinates,
      position: [...entity.position.v],
      wearing: wearing?.items
        ? itemBagToString(
            createBag(...mapMap(wearing.items, (item) => countOf(item, 1n)))
          )
        : undefined,
    });
  }

  // NPCs
  for (const entity of deps.table.scan(
    NpcMetadataSelector.query.spatial.inSphere(camera.frustumBoundingSphere, {
      approx: true,
    })
  )) {
    const npcRenderState = deps.resources.cached(
      "/scene/npc/render_state",
      entity.id
    );
    if (!npcRenderState) {
      continue;
    }

    const photoInfo = positionPhotoInfo(
      camera,
      matrixWorldInverse,
      projectionMatrix,
      imageCrop,
      npcRenderState.smoothedPosition(),
      inclusionDistance
    );

    if (!photoInfo) {
      continue;
    }

    const aabb = getAabbForEntity(entity, {
      motionOverrides: {
        position: [...npcRenderState.smoothedPosition()],
      },
    });

    if (
      !aabb ||
      approximateAABBOccluded(deps.voxeloo, deps.resources, camera, aabb)
    ) {
      continue;
    }

    const biscuit = relevantBiscuitForEntityId(deps.resources, entity.id);
    if (!biscuit) {
      continue;
    }
    taggedItems.push({
      kind: "entity",
      id: entity.id,
      biscuitId: biscuit.id,
      ndcCoordinates: photoInfo.ndcCoordinates,
      imageCoordinates: photoInfo.imageCoordinates,
      position: [...entity.position.v],
      wearing: entity.wearing?.items
        ? itemBagToString(
            createBag(
              ...mapMap(entity.wearing.items, (item) => countOf(item, 1n))
            )
          )
        : undefined,
    });
  }

  // Placeables / other
  for (const entity of deps.table.scan(
    PlaceableSelector.query.spatial.inSphere(camera.frustumBoundingSphere, {
      approx: true,
    })
  )) {
    if (!entity.position) {
      continue;
    }
    const photoInfo = positionPhotoInfo(
      camera,
      matrixWorldInverse,
      projectionMatrix,
      imageCrop,
      entity.position.v,
      inclusionDistance
    );

    if (!photoInfo) {
      continue;
    }

    const aabb = getAabbForEntity(entity);
    if (
      !aabb ||
      approximateAABBOccluded(deps.voxeloo, deps.resources, camera, aabb)
    ) {
      continue;
    }

    const biscuit = relevantBiscuitForEntityId(deps.resources, entity.id);
    if (!biscuit) {
      continue;
    }
    taggedItems.push({
      kind: "entity",
      id: entity.id,
      biscuitId: biscuit.id,
      ndcCoordinates: photoInfo.ndcCoordinates,
      imageCoordinates: photoInfo.imageCoordinates,
      position: [...entity.position.v],
    });
  }

  const matrix = new Matrix4().multiplyMatrices(
    projectionMatrix,
    matrixWorldInverse
  );
  const frustumShape = frustumToConvexPolytope(matrix.toArray());

  const includeAABB = (aabb: ReadonlyAABB): boolean => {
    const closestPoint = nearestPointAABB(camera.pos(), aabb);
    const distance = dist(closestPoint, camera.pos());
    const occluded = approximateAABBOccluded(
      deps.voxeloo,
      deps.resources,
      camera,
      aabb
    );
    const withinView = intersectConvexPolytopeAABB(frustumShape, aabb);
    return distance < inclusionDistance && !occluded && withinView;
  };

  for (const entity of deps.table.scan(EnvironmentGroupSelector.query.all())) {
    if (includeAABB(boxToAabb(entity.box))) {
      taggedItems.push({
        kind: "environment_group",
        id: entity.id,
      });
    }
  }

  // Land
  for (const entity of deps.table.scan(RobotSelector.query.all())) {
    const robotParams = deps.resources.get("/robots/params", entity.id);
    const createdBy = deps.resources.get("/ecs/c/created_by", entity.id);
    if (
      robotParams === undefined ||
      !robotParams.aabb ||
      createdBy === undefined
    ) {
      continue;
    }

    if (includeAABB(robotParams.aabb)) {
      taggedItems.push({
        kind: "land",
        id: entity.id,
        robotId: entity.id,
        creatorId: createdBy.id,
      });
    }
  }

  return taggedItems;
}

export interface ImageSpec {
  url: string;
  baseScale: number;
}

export function composeAndCropImage(
  urls: ImageSpec[],
  width: number,
  height: number,
  x: number,
  y: number
): Promise<string> {
  const numToResolve = [urls.length];
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Unable to create canvas context"));
      return;
    }

    // set canvas dimensions

    canvas.width = width;
    canvas.height = height;

    for (const url of urls) {
      const imageObj = new Image();
      imageObj.onload = function () {
        context.drawImage(
          imageObj,
          x * url.baseScale,
          y * url.baseScale,
          width * url.baseScale,
          height * url.baseScale,
          0,
          0,
          width,
          height
        );
        numToResolve[0] -= 1;
        if (numToResolve[0] === 0) {
          resolve(canvas.toDataURL());
        }
      };
      imageObj.src = url.url;
    }
  });
}
