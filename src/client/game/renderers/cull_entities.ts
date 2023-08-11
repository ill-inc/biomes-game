import type { Camera } from "@/client/game/resources/camera";
import type { Entity, ReadonlyEntityWith } from "@/shared/ecs/gen/entities";
import type { SpecifiedComponentSelector } from "@/shared/ecs/selectors/helper";
import type { SelectorQuery } from "@/shared/ecs/selectors/selector";
import type { SpatialIndex } from "@/shared/ecs/spatial/spatial_index";
import { isEntryDomainAabb } from "@/shared/ecs/spatial/types";
import type { BiomesId } from "@/shared/ids";
import {
  centerAABB,
  distSq,
  frustumToConvexPolytope,
  intersectConvexPolytopeAABB,
  pointInConvexPolytope,
} from "@/shared/math/linear";
import type { ReadonlyAABB, ReadonlyVec3 } from "@/shared/math/types";

export function entitiesInFrustum<
  I extends string,
  C extends keyof Entity,
  MI extends { [K in I]: SpatialIndex } = {
    [K in I]: SpatialIndex;
  }
>(
  camera: Camera,
  scan: (
    query: SelectorQuery<MI, C | "position">
  ) => Iterable<ReadonlyEntityWith<C | "position">>,
  spatialIndex: SpecifiedComponentSelector<I, C | "position">
): Iterable<ReadonlyEntityWith<C | "position">> {
  const viewFrustumShape = frustumToConvexPolytope(camera.viewProj());
  return scan(
    spatialIndex.query.spatial.inSphere(camera.frustumBoundingSphere, {
      refine: (domain) => {
        if (isEntryDomainAabb(domain)) {
          return intersectConvexPolytopeAABB(viewFrustumShape, domain);
        } else {
          return pointInConvexPolytope(viewFrustumShape, domain);
        }
      },
    })
  );
}

export function nearestKEntitiesInFrustum<
  I extends string,
  C extends keyof Entity,
  MI extends { [K in I]: SpatialIndex } = {
    [K in I]: SpatialIndex;
  }
>(
  camera: Camera,
  scan: (
    query: SelectorQuery<MI, C | "position">
  ) => Iterable<ReadonlyEntityWith<C | "position">>,
  spatialIndex: SpecifiedComponentSelector<I, C | "position">,
  maxCount: number,
  options?: {
    mustKeep?: Set<BiomesId>;
  }
): ReadonlyEntityWith<C | "position">[] {
  const entities = Array.from(entitiesInFrustum(camera, scan, spatialIndex));
  return nearestEntities(camera.pos(), entities, maxCount, options);
}

function nearestEntities<T extends ReadonlyEntityWith<"position">>(
  sourcePoint: ReadonlyVec3,
  entities: T[],
  maxCount: number,
  options?: {
    mustKeep?: Set<BiomesId>;
  }
): T[] {
  const mustKeepEntities: T[] = [];
  const entitiesWithDistance: [T, number][] = [];
  for (const entity of entities) {
    if (options?.mustKeep?.has(entity.id)) {
      mustKeepEntities.push(entity);
    } else {
      entitiesWithDistance.push([
        entity,
        distSq(entity.position.v, sourcePoint),
      ]);
    }
  }

  return [
    ...entitiesWithDistance
      .sort((a, b) => a[1] - b[1])
      .map((x) => x[0])
      .splice(0, maxCount - mustKeepEntities.length),
    ...mustKeepEntities,
  ];
}

// This should be removed and deprecated as soon as players renderer stops
// using it.
export type Renderable<T> = {
  aabb: ReadonlyAABB;
  id: BiomesId;
  payload: T;
};
export function cullEntities<T>(
  renderables: Renderable<T>[],
  camera: Camera,
  maxCount: number
): T[] {
  const cameraPos = camera.pos();
  // Sort entities by distance, so that we can prioritize culling.
  const sortedRenderables = renderables
    .map(
      (x) => [x, distSq(centerAABB(x.aabb), cameraPos)] as [typeof x, number]
    )
    .sort((a, b) => a[1] - b[1]);

  const shouldRender: T[] = [];
  const frustumRegion = frustumToConvexPolytope(camera.viewProj());
  for (const [x, _] of sortedRenderables) {
    // Skip entities that are not in the camera's view frustum, though
    // not for players taking selfies since their camera sticks out away from
    // their bodies.
    if (!intersectConvexPolytopeAABB(frustumRegion, x.aabb)) {
      continue;
    }

    // Congratulations, you get to be rendered.
    shouldRender.push(x.payload);

    // Only render up to a maximum number of entities (sorted by distance), to
    // avoid poor framerate if too many entities are nearby.
    if (shouldRender.length >= maxCount) {
      break;
    }
  }

  return shouldRender;
}
