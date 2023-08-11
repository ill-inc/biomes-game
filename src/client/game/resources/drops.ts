import type { ClientContext } from "@/client/game/context";
import { computeSpatialLighting } from "@/client/game/renderers/util";
import * as item_mesh from "@/client/game/resources/item_mesh";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type { Transition } from "@/client/game/util/transitions";
import {
  fixedDurationScalarTransition,
  fixedDurationVec3Curve,
  makeBezierVec3Transition,
  smoothDurationVec3Transition,
} from "@/client/game/util/transitions";
import { DROP_SCALE } from "@/shared/constants";
import { makeDisposable } from "@/shared/disposable";
import type { ItemAndCount } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { MAX_ID } from "@/shared/ids";
import { add } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import { ok } from "assert";
import * as THREE from "three";

export interface DropResource {
  ecsId: BiomesId;
  itemMesh?: item_mesh.ItemMeshInstance;
  visible: boolean;
  scale: Transition<number>;
  position: Transition<Vec3>;
  acquirer?: BiomesId;
  acquired?: boolean;
  spatialLighting: Transition<Vec3>;
}

function makeDrop({}: ClientContext, deps: ClientResourceDeps, id: BiomesId) {
  const drop = deps.get("/ecs/entity", id);
  ok(drop && drop.position && drop.loose_item);
  const pos: Vec3 = [...drop.position.v];

  const meshPromise = deps
    .get("/scene/item/mesh", new item_mesh.ItemMeshKey(drop.loose_item.item))
    .then((factory: item_mesh.ItemMeshFactory) => {
      const mesh = factory();

      // Scale down from item-space to world space.
      mesh.three.scale.setScalar(DROP_SCALE);
      // Re-parent `mesh.three` so that subsequent code can process its
      // scale and transform without affecting the DROP_SCALE setting above.
      const parent = new THREE.Object3D();
      parent.add(mesh.three);
      mesh.three = parent;

      // Put the mesh in the correct location.
      mesh.three.position.set(...pos);

      // Choose a rotation offset.
      mesh.three.rotateOnAxis(
        new THREE.Vector3(0, 1, 0),
        (id / MAX_ID) * 2.0 * Math.PI
      );

      return mesh;
    });

  // Sample self and adjacent neighbors' spatial lighting, and take max for initial value.
  const sourceSpatialLighting = computeSpatialLighting(deps, ...pos);
  let spatialLighting = sourceSpatialLighting;
  for (const offset of [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ] as Vec3[]) {
    const localSpatialLighting = computeSpatialLighting(
      deps,
      ...add(pos, offset)
    );
    spatialLighting = [
      Math.min(spatialLighting[0], localSpatialLighting[0]),
      Math.max(spatialLighting[1], localSpatialLighting[1]),
    ];
  }
  const spatialLightingTransition = makeBezierVec3Transition(
    [...spatialLighting, 0.0],
    5.0,
    [0.7, 0.9]
  );
  spatialLightingTransition.target([...sourceSpatialLighting, 0.0]);

  const result: DropResource = {
    ecsId: id,
    visible: true,
    scale: fixedDurationScalarTransition(0.0, 0.5).target(1.0),
    position: smoothDurationVec3Transition(pos, 1.0, 0.0),
    spatialLighting: spatialLightingTransition,
  };

  void meshPromise.then((mesh) => {
    result.itemMesh = mesh;
  });

  return makeDisposable(result, () => {
    result.itemMesh?.dispose();
  });
}

// Store a t [0,1] over a circle, incrementing and
// keeping us in [0,1], to distribute loot flyover
// positions
let lastSegment = 0;

function updateDrop(
  { resources, userId }: ClientContext,
  deps: ClientResourceDeps,
  resource: DropResource
) {
  // Update the drop resource state based on acquisition.
  const drop = deps.get("/ecs/entity", resource.ecsId);
  if (!drop || !drop.position) {
    // drop has been deleted.
    resource.visible = false;
    return;
  }

  // Update spatial lighting.
  const spatialLighting = computeSpatialLighting(deps, ...drop.position.v);
  resource.spatialLighting.target([...spatialLighting, 0.0]);

  // Synchronize position.
  const pos: Vec3 = [...drop.position.v];
  if (drop.acquisition && !resource.acquired) {
    resource.acquired = true;
    resource.scale.target(0.7);
    const acquirerId = drop.acquisition.acquired_by;

    // Check if it's the local player. If so, use the local player position
    // instead of the dst, since it will update more frequently and reliably
    const isLocalPlayer = acquirerId === userId;

    // compute a position offset for loot flyovers, and increment
    // our stored segment for distribution
    const radius = 0.3;
    const circleT = lastSegment * 2 * Math.PI;
    lastSegment = (lastSegment + 0.7) % 1;
    const circleOffset = [
      radius * Math.cos(circleT),
      0,
      radius * Math.sin(circleT),
    ] as Vec3;

    // Generate a curve from world position to character
    // This animation is a little bit weird, it's anchored in the world, then transitions
    // to being anchored to the character, so there's no single good space (character/world)
    // for it to live in.
    resource.position = fixedDurationVec3Curve(
      pos,
      (src: Vec3, dst: Vec3) => {
        const targetPos = isLocalPlayer
          ? resources.get("/scene/player", userId).position
          : dst;

        const floatHeight = 2.25;
        const floatJitter = 0.1;
        const floatPosition = add(circleOffset, [0, floatHeight, 0]);
        return [
          { point: src, t: 0 },
          { point: add(targetPos, floatPosition), t: 10 },
          {
            point: add(targetPos, add(floatPosition, [0, floatJitter, 0])),
            t: 50,
          },
          { point: add(targetPos, floatPosition), t: 90 },
          { point: add(targetPos, [0, 1, 0]), t: 120 },
          { point: add(targetPos, [0, 1, 0]), t: 120 },
        ];
      },
      1,
      // Regenerate every frame to match player pos, if it's a local player
      isLocalPlayer
    );
    resource.acquirer = drop.acquisition.acquired_by;

    if (isLocalPlayer) {
      // append to loot event overlay
      const items = drop.acquisition.items;
      resources.update("/overlays/loot", (lootEvents) => {
        // go through existing items and store indices into a map
        const existingItems: {
          [key in BiomesId]?: number;
        } = {};
        for (let idx = 0; idx < lootEvents.events.length; idx++) {
          const lootEvent = lootEvents.events[idx];
          if (lootEvent) {
            existingItems[lootEvent.item.item.id] = idx;
          }
        }

        const newItems: ItemAndCount[] = [];
        for (const [_, item] of items) {
          // for each item in this grab bag, remove the loot event if one exists
          // and store its count
          let existingCount = 0n;
          if (item.item.id in existingItems) {
            const idx: number = existingItems[item.item.id]!;
            const existingEvent = lootEvents.events[idx];
            if (existingEvent) {
              existingCount = existingEvent.item.count;
              lootEvents.events[idx] = undefined;
            }
          }
          newItems.push({
            item: item.item,
            count: existingCount + item.count,
          });
        }

        for (const item of newItems) {
          lootEvents.events.push({
            entityId: resource.ecsId,
            item,
            time: Date.now(),
          });
        }
        lootEvents.version += 1;
      });
    }
  } else {
    resource.position.target(pos);
  }
}

export function addDropResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addDynamic(
    "/scene/drops",
    loader.provide(makeDrop),
    loader.provide(updateDrop)
  );
}
