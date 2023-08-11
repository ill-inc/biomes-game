import type { PreviewSlot } from "@/client/components/character/CharacterPreview";
import type { ClientContext } from "@/client/game/context";
import { BasePassMaterial } from "@/client/game/renderers/base_pass_material";
import {
  ItemMeshKey,
  type ItemMeshInstance,
} from "@/client/game/resources/item_mesh";
import type { ParticleSystemMaterials } from "@/client/game/resources/particles";
import type {
  ClientResourceDeps,
  ClientResources,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import { gltfToThree, loadGltf } from "@/client/game/util/gltf_helpers";
import {
  blockPlaceParticleTexture,
  playerBuffParticleMaterials,
  playerHealingParticleMaterials,
  warpPoofParticleMaterials,
} from "@/client/game/util/particles_systems";
import type {
  AnimatedPlayerMesh,
  PlayerAnimationName,
} from "@/client/game/util/player_animations";
import {
  loadPlayerAnimatedMesh,
  playerSystem,
} from "@/client/game/util/player_animations";
import { clonePlayerSkinnedMaterial } from "@/client/game/util/skinning";
import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import { updateBasicMaterial } from "@/gen/client/game/shaders/basic";
import type { CharacterAnimationTiming } from "@/server/shared/minigames/ruleset/tweaks";
import {
  makePlayerMeshQueryString,
  type WearableAssignment,
} from "@/shared/api/assets";
import { isPaletteOption } from "@/shared/asset_defs/color_palettes";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { Disposable } from "@/shared/disposable";
import { makeDisposable } from "@/shared/disposable";
import type {
  Item,
  ReadonlyAppearance,
  ReadonlyItemAssignment,
} from "@/shared/ecs/gen/types";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { mapMap } from "@/shared/util/collections";
import { itemDyedColor } from "@/shared/util/dye_helpers";
import type { Optional } from "@/shared/util/type_helpers";
import * as _ from "lodash";
import type { Texture } from "three";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils";

export interface LoadedPlayerMesh extends AnimatedPlayerMesh {
  id: BiomesId;
  hash: string;
  url: string;
  animationTimings: CharacterAnimationTiming;
  itemAttachment: ItemAttachment;
}

export interface PlayerWearingMeshGltf {
  mesh: GLTF;
  hash: string;
  url: string;
}

async function makePlayerPreviewMesh(
  deps: ClientResourceDeps,
  slot: PreviewSlot
) {
  const preview = deps.get("/player/preview", slot);
  const id = preview.userId;
  const appearance = preview.appearance;
  const wearing = preview.wearing;

  const mesh = await makeAnimatedMesh(deps, true, wearing, appearance, id);

  if (preview.animationKey !== null) {
    // Apply the specified single animation to the player mesh's animation
    // state.
    mesh.animationSystem.applySingleActionToState(
      {
        layers: { arms: "apply", notArms: "apply" },
        state: { repeat: { kind: "repeat" }, startTime: 0 },
        weights: playerSystem.singleAnimationWeight(
          preview.animationKey ?? "idle",
          1
        ),
      },
      mesh.animationSystemState
    );
  }

  return makeDisposable(mesh, () => {
    mesh.dispose();
  });
}

async function makePlayerMesh(
  { userId }: { userId: BiomesId },
  deps: ClientResourceDeps,
  id: BiomesId
) {
  const wearing = deps.get("/ecs/c/wearing", id);
  const appearance = deps.get("/ecs/c/appearance_component", id);

  return makeAnimatedMesh(
    deps,
    userId !== id,
    wearing?.items,
    appearance?.appearance,
    id
  );
}

export interface PlayerPreview {
  userId: BiomesId;
  appearance?: ReadonlyAppearance;
  wearing?: ReadonlyItemAssignment;
  animationKey?: PlayerAnimationName | null;
}

async function updatePlayerMesh(
  { userId }: { userId: BiomesId },
  deps: ClientResourceDeps,
  resource: Promise<Optional<LoadedPlayerMesh>>
) {
  const resolvedPromise = await resource;
  if (!resolvedPromise) {
    return;
  }

  const { id } = resolvedPromise;
  const wearing = deps.get("/ecs/c/wearing", id);
  const appearance = deps.get("/ecs/c/appearance_component", id);
  const url = ecsWearablesToUrl(wearing?.items, appearance?.appearance);
  const isLocalPlayer = userId === id;
  // Only consider tweaks to be out-of-date for the local player to avoid
  // performing the deep comparison for all players' changes.
  const animationTimings = tweaksParams(deps);
  const tweaksOutOfDate =
    isLocalPlayer &&
    !_.isEqual(
      Object.values(animationTimings),
      Object.values(resolvedPromise.animationTimings)
    );

  if (resolvedPromise.url !== url || tweaksOutOfDate) {
    const ret = await makeAnimatedMesh(
      deps,
      !isLocalPlayer,
      wearing?.items,
      appearance?.appearance,
      id
    );
    Object.assign(resolvedPromise, ret);
  }
}

class ItemAttachment {
  private selectedItem: Item | undefined;
  private itemMeshInstance: ItemMeshInstance | undefined;

  constructor(private threeAttachNode: THREE.Object3D) {}

  updateAttachedItem(
    resources: ClientResources,
    item: Item | undefined,
    spatialLighting?: [number, number],
    light?: [number, number, number]
  ) {
    const attachedItem = this.setAttachedItem(resources, item);
    attachedItem?.three.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.material instanceof BasePassMaterial
      ) {
        updateBasicMaterial(obj.material, {
          light,
          spatialLighting,
        });
      }
    });

    return attachedItem;
  }

  private setAttachedItem(resources: ClientResources, item: Item | undefined) {
    // Nothing to do if our currently attached item is equal to what is being
    // set.
    if (_.isEqual(this.selectedItem, item)) {
      return this.itemMeshInstance;
    }

    if (this.itemMeshInstance) {
      // Dispose of the previous one, if it exists
      this.itemMeshInstance.dispose();
    }

    const itemMeshFactory =
      item && resources.cached("/scene/item/mesh", new ItemMeshKey(item));

    // We're either going to switch the attachment or clear it, either way
    // we want to start by resetting it.
    this.threeAttachNode.children.length = 0;

    // If we don't have an item here, clear the attachments and indicate that
    // we don't have anything selected (so that we can try again later.)
    if (!itemMeshFactory) {
      this.selectedItem = undefined;
      return;
    }

    // Create an item mesh instance and attach it to the three attachment node
    // in the player mesh.
    this.itemMeshInstance = itemMeshFactory();
    const withHandTransform = (() => {
      if (this.itemMeshInstance.handAttachmentTransform) {
        const transformed = new THREE.Object3D();
        transformed.applyMatrix4(this.itemMeshInstance.handAttachmentTransform);
        transformed.add(this.itemMeshInstance.three);
        return transformed;
      } else {
        return this.itemMeshInstance.three;
      }
    })();
    this.threeAttachNode.add(withHandTransform);

    // Track what our currently selected item is so that we can know if we need
    // to switch it later or not.
    this.selectedItem = item;

    return this.itemMeshInstance;
  }

  dispose() {
    if (this.itemMeshInstance) {
      this.itemMeshInstance.dispose();
    }
  }
}

async function makeAnimatedMesh(
  deps: ClientResourceDeps,
  frustumCulling: boolean,
  wearables: ReadonlyItemAssignment | undefined,
  appearance: ReadonlyAppearance | undefined,
  id: BiomesId
): Promise<Disposable<LoadedPlayerMesh>> {
  // Get both the player animations and the player mesh and merge them together.
  const { mesh, url, hash } = await fetchPlayerMeshGLTF(
    deps,
    wearables,
    appearance
  );
  setFrustumCulling(mesh, frustumCulling);

  const animationTimings = tweaksParams(deps);

  const playerAnimatedMesh = loadPlayerAnimatedMesh(mesh, animationTimings);

  const itemAttachment = new ItemAttachment(
    playerAnimatedMesh.threeWeaponAttachment
  );

  return makeDisposable(
    {
      ...playerAnimatedMesh,
      hash,
      url,
      id,
      animationTimings: { ...animationTimings },
      itemAttachment,
    },
    () => {
      itemAttachment.dispose();
    }
  );
}

async function fetchPlayerAnimationsGLTF() {
  const anims = await loadGltf(resolveAssetUrl("wearables/animations"));
  anims.animations.forEach((x) => x.optimize());

  for (const anim of anims.animations) {
    for (const track of anim.tracks) {
      if (track.name.includes("_1")) {
        throw new Error(
          "GLTF nodes that include `_1` are not supported. This might mean that nodes with duplicate names existed and the threejs loader tweaked their names to ensure uniqueness, check for duplicate node names in the GLTF."
        );
      }
    }
  }

  return anims;
}

// Convert the ECS description of the player's appearance into its Galois
// counterpart, and then use that to return a URL for the character mesh
// asset.
export function ecsWearablesToQueryString(
  wearables?: ReadonlyItemAssignment,
  appearance?: ReadonlyAppearance
) {
  const wearablesAssignment =
    wearables === undefined
      ? []
      : (mapMap(wearables, (item, slot) => [
          slot,
          item.id,
          itemDyedColor(item),
        ]) as WearableAssignment);

  const skinColorId =
    appearance?.skin_color_id &&
    isPaletteOption("color_palettes/skin_colors", appearance.skin_color_id)
      ? appearance.skin_color_id
      : undefined;
  const eyeColorId =
    appearance?.eye_color_id &&
    isPaletteOption("color_palettes/eye_colors", appearance.eye_color_id)
      ? appearance.eye_color_id
      : undefined;
  const hairColorId =
    appearance?.hair_color_id &&
    isPaletteOption("color_palettes/hair_colors", appearance.hair_color_id)
      ? appearance.hair_color_id
      : undefined;

  if (appearance?.head_id) {
    // eye shape is implemented by setting the "head" wearable (which is
    // different than the "hat" wearable that you can equip.)
    wearablesAssignment.push([BikkieIds.head, appearance.head_id, undefined]);
  }

  return makePlayerMeshQueryString(
    wearablesAssignment,
    skinColorId,
    eyeColorId,
    hairColorId
  );
}

export function ecsWearablesToUrl(
  wearables?: ReadonlyItemAssignment,
  appearance?: ReadonlyAppearance
) {
  return `/api/assets/player_mesh.glb${ecsWearablesToQueryString(
    wearables,
    appearance
  )}`;
}

export function ecsWearablesToWarmupUrl(
  wearables?: ReadonlyItemAssignment,
  appearance?: ReadonlyAppearance
) {
  return `/api/assets/warm_player_mesh${ecsWearablesToQueryString(
    wearables,
    appearance
  )}`;
}

export function replaceWithPlayerMaterial(gltf: GLTF): void {
  const scene = gltfToThree(gltf);
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.computeVertexNormals();
      child.material = clonePlayerSkinnedMaterial();
    }
  });
}

export function setFrustumCulling(gltf: GLTF, frustumCulling: boolean) {
  const scene = gltfToThree(gltf);
  scene.traverse((object) => {
    object.frustumCulled = frustumCulling;
  });
  scene.frustumCulled = frustumCulling;
}

async function genFetchPlayerMeshGLTF(deps: ClientResourceDeps, url: string) {
  const [animations, mesh, hash] = await Promise.all([
    deps.get("/scene/player/animations"),
    loadGltf(url),
    url,
  ]);

  mergeAnimations(mesh, animations);

  replaceWithPlayerMaterial(mesh);

  return { mesh, url, hash };
}

export function makeECSWearablesUrl(
  deps: ClientResourceDeps,
  id: BiomesId
): string {
  const wearables = deps.get("/ecs/c/wearing", id);
  const appearance = deps.get("/ecs/c/appearance_component", id);
  return ecsWearablesToUrl(wearables?.items, appearance?.appearance);
}

export async function fetchPlayerMeshGLTF(
  deps: ClientResourceDeps,
  wearables?: ReadonlyItemAssignment,
  appearance?: ReadonlyAppearance
): Promise<PlayerWearingMeshGltf> {
  const url = ecsWearablesToUrl(wearables, appearance);
  const templateGltf = await deps.get("/scene/player/wearing_mesh_gltf", url);

  // Clone the mesh so that different contexts that work with the same mesh
  // template (e.g. the same URL) get different three object instances.
  const cloned = SkeletonUtils.clone(gltfToThree(templateGltf.mesh));
  const clonedScene = new THREE.Group();
  clonedScene.add(cloned);

  return {
    ...templateGltf,
    mesh: {
      ...templateGltf.mesh,
      scene: clonedScene,
      scenes: [clonedScene],
    },
  };
}

function mergeAnimations(gltf: GLTF, animations: GLTF) {
  gltf.animations.push(...animations.animations);
}

function tweaksParams(deps: ClientResourceDeps) {
  return deps.get("/tweaks").characterAnimationTiming;
}

// Resources shared by all player types.
export interface PlayerCommonEffects {
  healingParticleMaterials: ParticleSystemMaterials;
  warpParticleMaterials: ParticleSystemMaterials;
  placeParticleTexture: Texture;
}

async function makePlayerCommonEffects(
  deps: ClientResourceDeps
): Promise<PlayerCommonEffects> {
  return {
    healingParticleMaterials: await playerHealingParticleMaterials(),
    warpParticleMaterials: await warpPoofParticleMaterials(),
    placeParticleTexture: await blockPlaceParticleTexture(deps),
  };
}

async function makePlayerBuffEffects(
  context: ClientContext,
  deps: ClientResourceDeps,
  buffId: BiomesId
): Promise<Optional<ParticleSystemMaterials>> {
  const particleIcon = anItem(buffId)?.particleIcon;
  if (!particleIcon) {
    return;
  }
  const material = await playerBuffParticleMaterials(particleIcon);
  if (!material) {
    log.warn(`Could not find particle asset for: ${particleIcon} (${buffId})`);
    return;
  }
  return material;
}

export async function makePlayerLikeAppearanceMesh(
  deps: ClientResourceDeps,
  id: BiomesId
): Promise<GLTF> {
  const wearing = deps.get("/ecs/c/wearing", id);
  const appearance = deps.get("/ecs/c/appearance_component", id);
  const { mesh } = await fetchPlayerMeshGLTF(
    deps,
    wearing?.items,
    appearance?.appearance
  );
  return mesh;
}

export async function addPlayerMeshResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/scene/player/animations", fetchPlayerAnimationsGLTF());
  builder.add("/scene/player/wearing_mesh_gltf", genFetchPlayerMeshGLTF);
  builder.addDynamic(
    "/scene/player/mesh",
    loader.provide(makePlayerMesh),
    loader.provide(updatePlayerMesh)
  );

  builder.addDynamic(
    "/player/preview",
    loader.provide(({ userId }) => ({
      userId,
    })),
    (_deps: ClientResourceDeps, resource: any) => resource
  );

  builder.add("/scene/player/mesh_preview", makePlayerPreviewMesh);
  builder.add("/scene/player/common_effects", makePlayerCommonEffects);
  builder.add(
    "/scene/player/buff_effects",
    loader.provide(makePlayerBuffEffects)
  );
}
