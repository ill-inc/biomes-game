import type { ClientContext } from "@/client/game/context";
import {
  gltfToBasePassThree,
  replaceBreakable,
} from "@/client/game/renderers/util";
import { ParticleSystem } from "@/client/game/resources/particles";
import {
  getPlaceableSpatialLighting,
  setPlaceableOrientation,
} from "@/client/game/resources/placeables/helpers";
import type { AnimatedPlaceableMesh } from "@/client/game/resources/placeables/types";
import type { ClientResourceDeps } from "@/client/game/resources/types";
import { makeDisposable } from "@/shared/disposable";
import type { BiomesId } from "@/shared/ids";
import { ok } from "assert";
import { Euler, Group, Object3D } from "three";

function animateShop(
  mesh: AnimatedPlaceableMesh,
  dt: number,
  globalTime: number
) {
  const s = 0.25 * (Math.sin(1.5 * globalTime) / 2 + 0.5) + 0.25;
  mesh.mountContentsInfo!.contentsGroup.position.y = s;
  mesh.mountContentsInfo!.contentsGroup.setRotationFromEuler(
    new Euler(0, globalTime, 0)
  );
  mesh.mountContentsInfo!.particleSystem!.tickToTime(globalTime, [0, 1, 0]);
}

export async function makePlaceableShopContainerMesh(
  context: ClientContext,
  deps: ClientResourceDeps,
  id: BiomesId
) {
  const placeableComponent = deps.get("/ecs/c/placeable_component", id);
  const pricedContainerInventory = deps.get(
    "/ecs/c/priced_container_inventory",
    id
  );
  ok(placeableComponent && pricedContainerInventory);
  const gltf = await deps.get(
    "/scene/placeable/type_mesh",
    placeableComponent.item_id
  );
  const destroyingMaterial = await deps.get("/materials/destroying_material");
  const renderMesh = new Object3D();
  (renderMesh as any).sceneType = "three";
  const spatialMesh = new Object3D();
  renderMesh.add(spatialMesh);
  const [mesh, materials] = gltfToBasePassThree(
    gltf,
    replaceBreakable(destroyingMaterial.texture)
  );
  spatialMesh.add(mesh);

  const contentsGroup = new Group();
  spatialMesh.add(contentsGroup);

  const clock = deps.get("/clock");
  const pm = await deps.get("/scene/placeable/shop_particle_materials");
  const particles = new ParticleSystem(pm, clock.time);
  // Only add particles to render mesh; don't allow it to affect spatial meshes
  renderMesh.add(particles.three);

  // Depend on position and orientation
  const orientation = deps.get("/ecs/c/orientation", id);
  const position = deps.get("/ecs/c/position", id);
  setPlaceableOrientation(renderMesh, orientation?.v);
  if (position) {
    renderMesh.position.fromArray(position.v);
  }

  // Cache spatial lighting since placeables won't move much
  const spatialLighting = getPlaceableSpatialLighting(deps, id);

  const ret: AnimatedPlaceableMesh = {
    placeableId: id,
    three: renderMesh,
    mountContentsInfo: {
      contentsGroup,
      particleSystem: particles,
      itemMeshInstances: [],
    },
    manualAnimationUpdate: animateShop,
    spatialLighting,
    spatialMesh,
  };
  return makeDisposable(ret, () => {
    particles.materials.dispose();
    materials.forEach((m) => m.dispose());
    ret.mountContentsInfo?.itemMeshInstances.forEach((i) => i.dispose());
  });
}
