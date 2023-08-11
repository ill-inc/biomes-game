import type { ClientContext } from "@/client/game/context";
import {
  disposeObject3D,
  gltfToBasePassThree,
  replaceBreakable,
  replaceThreeMaterials,
} from "@/client/game/renderers/util";
import { ParticleSystem } from "@/client/game/resources/particles";
import {
  getPlaceableSpatialLighting,
  setPlaceableOrientation,
} from "@/client/game/resources/placeables/helpers";
import type {
  AnimatedPlaceableMesh,
  MountInfo,
} from "@/client/game/resources/placeables/types";
import { placeableSystem } from "@/client/game/resources/placeables/types";
import type { ClientResourceDeps } from "@/client/game/resources/types";
import { gltfToThree } from "@/client/game/util/gltf_helpers";
import {
  firePoofParticleMaterials,
  smokePoofParticleMaterials,
} from "@/client/game/util/particles_systems";
import { TimelineMatcher } from "@/client/game/util/timeline_matcher";
import { DROP_SCALE } from "@/shared/constants";
import { makeDisposable } from "@/shared/disposable";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { ok } from "assert";
import type { Object3D } from "three";
import { BoxGeometry, Group, Mesh } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils";

export interface MakeOptions {
  noBreakableMaterial?: boolean;
  gltf?: GLTF;
  meshUrl?: string;
}

async function getBasicDeps(
  deps: ClientResourceDeps,
  id: BiomesId,
  options: MakeOptions = {}
) {
  const placeableComponent = deps.get("/ecs/c/placeable_component", id);
  ok(placeableComponent);
  const placeableItem = anItem(placeableComponent.item_id);
  const orientation = deps.get("/ecs/c/orientation", id);
  const gltf =
    options.gltf ??
    (await deps.get("/scene/placeable/type_mesh", placeableComponent.item_id));

  const position = deps.get("/ecs/c/position", id);
  const destroyingMaterial = options.noBreakableMaterial
    ? undefined
    : await deps.get("/materials/destroying_material");

  return {
    id,
    gltf,
    placeableItem,
    destroyingMaterial,
    position: position?.v ?? [0, 0, 0],
    orientation: orientation?.v ?? [0, 0],
  };
}

export async function makeBasicStaticPlaceableMesh(
  deps: ClientResourceDeps,
  id: BiomesId,
  particleSystems: ParticleSystem[],
  options: MakeOptions = {}
) {
  const { destroyingMaterial, position, orientation, placeableItem, gltf } =
    await getBasicDeps(deps, id, options);

  const [three, _materials] = gltfToBasePassThree(
    gltf,
    destroyingMaterial && replaceBreakable(destroyingMaterial.texture),
    true,
    placeableItem.isDoubleSided
  );

  setPlaceableOrientation(three, orientation);

  if (position) {
    three.position.fromArray(position);
  }

  let mountContentsInfo: MountInfo | undefined;
  if (placeableItem.isMount) {
    const contentsGroup = new Group();
    three.add(contentsGroup);
    const mountScale = placeableItem.mountScale ?? 1.0;
    contentsGroup.scale.setScalar(mountScale);

    if (placeableItem.boxSize && placeableItem.placementType === "wallCenter") {
      contentsGroup.position.x -= placeableItem.boxSize[0];
      contentsGroup.position.y +=
        placeableItem.boxSize[1] / 2 - DROP_SCALE * mountScale;
    }

    mountContentsInfo = {
      contentsGroup,
      itemMeshInstances: [],
    };
  }

  // Cache spatial lighting since placeables won't move much
  const spatialLighting = getPlaceableSpatialLighting(deps, id);
  return makeDisposable(
    {
      placeableId: id,
      three,
      particleSystems,
      spatialLighting,
      mountContentsInfo,
      url: options.meshUrl,
    },
    () => {
      disposeObject3D(three);
      particleSystems.forEach((ps) => ps.materials.dispose());
    }
  );
}

export async function makeBasicAnimatedPlaceableMesh(
  deps: ClientResourceDeps,
  id: BiomesId,
  particleSystems: ParticleSystem[],
  options: MakeOptions = {}
) {
  const { destroyingMaterial, position, orientation, gltf } =
    await getBasicDeps(deps, id, options);

  const three = SkeletonUtils.clone(gltfToThree(gltf));
  const [materials, _oldMaterials] = replaceThreeMaterials(
    three,
    true,
    true,
    destroyingMaterial && replaceBreakable(destroyingMaterial.texture)
  );
  const state = placeableSystem.newState(three, gltf.animations);

  setPlaceableOrientation(three, orientation);
  let spatialMesh: Object3D | undefined;
  if (position) {
    three.position.fromArray(position);
    // Create a point-sample spatial mesh for spatial lighting
    // since the bounding box of animated meshes can vary wildly
    spatialMesh = new Mesh(new BoxGeometry(0.1, 0.1, 0.1));
    spatialMesh.position.fromArray(position);
    // Add 0.5 offset from ground
    spatialMesh.position.y += 0.5;
  }

  // Cache spatial lighting since placeables won't move much
  const spatialLighting = getPlaceableSpatialLighting(deps, id);

  return makeDisposable(
    {
      three,
      placeableId: id,
      meshAnimationInfo: {
        animationMixer: state.mixer,
        animationSystemState: state,
        animationSystem: placeableSystem,
        timelineMatcher: new TimelineMatcher(() => state.mixer.time),
      },
      spatialMesh,
      particleSystems,
      spatialLighting,
      url: options.meshUrl,
    },
    () => {
      materials.forEach((m) => m.dispose());
      particleSystems.forEach((ps) => ps.materials.dispose());
    }
  );
}

export async function makeCampfirePlaceableMesh(
  context: ClientContext,
  deps: ClientResourceDeps,
  id: BiomesId
) {
  const placeableComponent = deps.get("/ecs/c/placeable_component", id);
  ok(placeableComponent);
  const orientation = deps.get("/ecs/c/orientation", id);
  const particleSystems: ParticleSystem[] = [];
  const clock = deps.get("/clock");
  const smokeMaterial = await smokePoofParticleMaterials();
  const smokeParticles = new ParticleSystem(smokeMaterial, clock.time);
  particleSystems.push(smokeParticles);
  const fireMaterial = await firePoofParticleMaterials();
  const fireParticles = new ParticleSystem(fireMaterial, clock.time);
  particleSystems.push(fireParticles);
  particleSystems.forEach((particles) => {
    setPlaceableOrientation(particles.three, orientation?.v);
  });

  return makeBasicStaticPlaceableMesh(deps, id, particleSystems);
}

export async function makeBasicPlaceableMesh(
  context: ClientContext,
  deps: ClientResourceDeps,
  id: BiomesId,
  options: MakeOptions = {}
): Promise<AnimatedPlaceableMesh> {
  const placeableComponent = deps.get("/ecs/c/placeable_component", id);
  ok(placeableComponent);

  const gltf = await deps.get(
    "/scene/placeable/type_mesh",
    placeableComponent.item_id
  );

  if (gltf.animations.length === 0) {
    return makeBasicStaticPlaceableMesh(deps, id, [], options);
  } else {
    return makeBasicAnimatedPlaceableMesh(deps, id, [], options);
  }
}
