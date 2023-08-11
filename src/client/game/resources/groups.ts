import type { ClientContext, ClientContextSubset } from "@/client/game/context";
import {
  cloneMaterials,
  replaceBaseWithThreeMaterials,
} from "@/client/game/renderers/util";
import type { ParticleSystem } from "@/client/game/resources/particles";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import { gltfToThree } from "@/client/game/util/gltf_helpers";
import {
  biomesMeshToBufferGeometry,
  groupGeometryToBufferGeometry,
  wireframeGeometryToBufferGeometry,
} from "@/client/game/util/meshes";
import { makeColorMap } from "@/client/game/util/textures";
import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import { makeBasicTranslucentMaterial } from "@/gen/client/game/shaders/basic_translucent";
import { makeDestructionMaterial } from "@/gen/client/game/shaders/destruction";
import { makeWireframeMaterial } from "@/gen/client/game/shaders/wireframe";
import { using } from "@/shared/deletable";
import { makeDisposable } from "@/shared/disposable";
import type { ReadonlyBox } from "@/shared/ecs/gen/components";
import { Box } from "@/shared/ecs/gen/components";
import type { ReadonlyBiomesIdList } from "@/shared/ecs/gen/types";
import { aabbToBox } from "@/shared/game/group";
import {
  isBlockId,
  isFloraId,
  toBlockId,
  toFloraId,
  toGlassId,
} from "@/shared/game/ids";
import {
  getAabbForPlaceable,
  getVoxelOccupancyForPlaceable,
} from "@/shared/game/placeables";
import * as Shards from "@/shared/game/shard";
import { bfsEdits } from "@/shared/game/terrain_march";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import {
  add,
  boxEdgeVertices,
  centerAABB,
  max,
  min,
  sizeAABB,
  sub,
} from "@/shared/math/linear";
import type { Rotation } from "@/shared/math/rotation";
import type {
  AABB,
  ReadonlyAABB,
  ReadonlyVec2,
  ReadonlyVec3,
  Vec3,
} from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import { Dir } from "@/shared/wasm/types/common";
import {
  isEmptyGroupEntry,
  type GroupSubMesh,
  type GroupTensor,
} from "@/shared/wasm/types/galois";
import { ok } from "assert";
import { isEqual } from "lodash";
import type { MeshBasicMaterialParameters } from "three";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils";

export type GroupMesh = {
  three: THREE.Object3D;
  box: ReadonlyBox;
  particleSystem?: ParticleSystem;
};

export interface AttachedPlaceable {
  id: BiomesId;
  position: ReadonlyVec3;
  orientation: ReadonlyVec2;
  aabb: ReadonlyAABB;
}

export interface GroupData {
  tensor: GroupTensor;
  box: ReadonlyBox;
  attachedPlaceables?: AttachedPlaceable[];
  placeableIds?: ReadonlyBiomesIdList;
  rotation?: Rotation;
}

export interface GroupRefinement {
  deletions?: ReadonlyVec3[];
  box?: ReadonlyBox;
}

export interface GroupSource {
  pos?: ReadonlyVec3;
  tensor?: GroupTensor;
  box?: ReadonlyBox;
}

export interface GroupPlace {
  pos?: Vec3;
  shift?: Vec3;
  rotation?: Rotation;
  groupId?: BiomesId;
  blueprintId?: BiomesId;
  tensor?: GroupTensor;
  box?: ReadonlyBox;
}

export interface GroupPreview {
  three: THREE.Object3D;
}

export interface GroupHighlightState {
  opacity: number;
  animated: boolean;
  createdAtMs: number;
}

async function genGroupIndex({ voxeloo }: { voxeloo: VoxelooModule }) {
  const config = await jsonFetch<{ index: string }>(
    resolveAssetUrl("indices/groups")
  );

  const ret = new voxeloo.GroupIndex();
  ret.load(config.index);
  return ret;
}

function getAttachedPlaceables(
  deps: ClientResourceDeps,
  ids: ReadonlyBiomesIdList | undefined
): AttachedPlaceable[] | undefined {
  return ids?.flatMap((entityId) => {
    const entity = deps.get("/ecs/entity", entityId);
    if (!entity) {
      return [];
    }
    return [
      {
        id: entityId,
        position: entity.position!.v,
        orientation: entity.orientation!.v,
        aabb: getVoxelOccupancyForPlaceable(entity),
      } as AttachedPlaceable,
    ];
  });
}

function genGroupData(
  { voxeloo }: { voxeloo: VoxelooModule },
  deps: ClientResourceDeps,
  groupId: BiomesId
): GroupData | undefined {
  const groupComponent = deps.get("/ecs/c/group_component", groupId);
  const groupBox = deps.get("/ecs/c/box", groupId);
  if (!groupComponent?.tensor || !groupBox) {
    return;
  }
  const tensor = new voxeloo.GroupTensor();
  tensor.load(groupComponent.tensor);
  const box = groupBox;
  const attachedPlaceables = getAttachedPlaceables(
    deps,
    deps.get("/ecs/c/grouped_entities", groupId)?.ids
  );

  return makeDisposable<GroupData>(
    {
      tensor,
      box,
      attachedPlaceables,
    },
    () => {
      tensor.delete();
    }
  );
}

function genGroupSrcData(
  { voxeloo }: ClientContext,
  deps: ClientResourceDeps
): GroupData | undefined {
  const src = deps.get("/groups/src");
  ok(src.pos, "Group source position is missing");

  const refinement = deps.get("/groups/src/refinement");

  const MAX_DISTANCE = 32;
  let minPos: Vec3 = [...src.pos];
  let maxPos: Vec3 = [...src.pos];

  const placeableIds = new Set<BiomesId>();
  const voxels: Vec3[] = [];

  bfsEdits(deps, src.pos, (pos, shardId, blockPos, occupancyId) => {
    // Handle size limit.
    const newMinPos = min(minPos, pos);
    const newMaxPos = max(maxPos, pos);
    const [dx, dy, dz] = sub(newMaxPos, newMinPos);
    if (dx >= MAX_DISTANCE || dy >= MAX_DISTANCE || dz >= MAX_DISTANCE) {
      return false;
    }
    minPos = newMinPos;
    maxPos = newMaxPos;

    // Handle refinement deletions.
    if (refinement.deletions?.find((v) => isEqual(v, pos))) {
      return false;
    }

    // BFS into placeables.
    if (occupancyId) {
      const inGroup = deps.get("/ecs/c/in_group", occupancyId);
      if (!inGroup) {
        placeableIds.add(occupancyId);
        return true;
      } else {
        return false;
      }
    }

    // Don't BFS into blocks without placer.
    const placerBlock = deps.get("/terrain/placer", shardId);
    const placerId = placerBlock?.get(...blockPos);
    if (!placerId) {
      return false;
    }

    // Add voxel.
    voxels.push(pos);
    return true;
  });

  // After the BFS run, we now actually know the AABB of the group.
  const aabb: AABB = [minPos, add(maxPos, [1, 1, 1])];

  return using(new voxeloo.GroupTensorBuilder(), (builder) => {
    for (const pos of voxels) {
      const shardId = Shards.voxelShard(...pos);
      const blockPos = Shards.blockPos(...pos);

      const edits = deps.get("/terrain/edits", shardId);
      const shapes = deps.get("/terrain/isomorphisms", shardId);
      const dyes = deps.get("/terrain/dye", shardId);
      const moistures = deps.get("/terrain/moisture", shardId);
      const growths = deps.get("/terrain/growth", shardId);

      const groupPos = sub(pos, aabb[0]);

      const terrainID = edits?.get(...blockPos);
      if (terrainID && isFloraId(terrainID)) {
        builder.setFlora(
          groupPos,
          toFloraId(terrainID),
          growths?.get(...blockPos) ?? 0
        );
      } else if (terrainID && isBlockId(terrainID)) {
        builder.setBlock(
          groupPos,
          toBlockId(terrainID),
          shapes?.get(...blockPos) ?? 0,
          dyes?.get(...blockPos) ?? 0,
          moistures?.get(...blockPos) ?? 0
        );
      } else if (terrainID) {
        builder.setGlass(
          groupPos,
          toGlassId(terrainID),
          shapes?.get(...blockPos) ?? 0,
          dyes?.get(...blockPos) ?? 0,
          moistures?.get(...blockPos) ?? 0
        );
      }
    }

    const attachedPlaceables: AttachedPlaceable[] = Array.from(
      placeableIds
    ).map((id) => {
      const placeableComponent = deps.get("/ecs/c/placeable_component", id);
      ok(placeableComponent);
      const itemId = placeableComponent.item_id;
      const position = deps.get("/ecs/c/position", id)?.v;
      ok(position);
      const orientation = deps.get("/ecs/c/orientation", id)?.v ?? [0, 0];
      const aabb = getAabbForPlaceable(itemId, position, orientation);
      ok(aabb);
      return {
        id,
        position,
        orientation,
        aabb,
      };
    });

    const tensor = builder.build();
    return makeDisposable<GroupData>(
      {
        tensor,
        box: aabbToBox(aabb),
        attachedPlaceables,
      },
      () => {
        tensor.delete();
      }
    );
  });
}

interface SubMeshOptions {
  colorOverride?: [number, number, number];
  opacity?: number;
  translucent?: boolean;
}

export function buildSubMesh(data: GroupSubMesh, options: SubMeshOptions) {
  // TODO convert these into translucent and basic materials
  // need to split basic and translucent meshes, and have GLTF exporter
  // be aware of our shaders
  // Using a transparent MeshBasicMaterial also adds some in-object sorting,
  // but these meshes won't respect fog
  const bufferGeo = groupGeometryToBufferGeometry(data);

  if (options.opacity && options.opacity !== 1.0) {
    // Temp: use in-house translucent material here, if an opacity was specified
    // this will allow things to be affected by fog
    // NOTE: these will not export to GLTF correctly
    const translucentMaterial = makeBasicTranslucentMaterial({
      useMap: true,
      map: makeColorMap(data.textureData(), ...data.textureShape()),
      baseColor: [
        ...(options.colorOverride || [1, 1, 1]),
        options.opacity || 0.5,
      ],
      normalOffset: -0.01,
    });
    translucentMaterial.side = THREE.DoubleSide;
    return new THREE.Mesh(bufferGeo, translucentMaterial);
  } else {
    // If we're rendering opaque, use the THREE basic material so that
    // it renders with correct sorting and can be exported to GLTF

    const materialOptions: MeshBasicMaterialParameters = {
      alphaTest: options.translucent ? 0.0 : 0.5,
      side: THREE.DoubleSide,
      map: makeColorMap(data.textureData(), ...data.textureShape()),
      transparent: options.translucent ?? false,
    };

    if (options.colorOverride) {
      materialOptions.color = new THREE.Color(...options.colorOverride);
    }
    return new THREE.Mesh(
      bufferGeo,
      new THREE.MeshBasicMaterial(materialOptions)
    );
  }
}

async function placeableMesh(
  deps: ClientResourceDeps,
  id: BiomesId
): Promise<THREE.Object3D> {
  const placeableComponent = deps.get("/ecs/c/placeable_component", id);
  ok(placeableComponent);
  const gltf = await deps.get(
    "/scene/placeable/type_mesh",
    placeableComponent.item_id
  );
  // Is gltfDispose() needed here?
  return SkeletonUtils.clone(gltfToThree(gltf));
}

export async function groupMesh(
  { voxeloo }: { voxeloo: VoxelooModule },
  deps: ClientResourceDeps,
  groupData: GroupData | undefined,
  opts: {
    transparent?: boolean;
    colorOverride?: [number, number, number];
    blueprintId?: BiomesId;
  } = {}
) {
  if (!groupData) {
    return;
  }
  const groupIndex = await deps.get("/groups/index");
  const groupMesh = voxeloo.toGroupMesh(groupData.tensor, groupIndex);

  const blockMesh = buildSubMesh(groupMesh.blocks, {
    colorOverride: opts.colorOverride,
    opacity: opts.transparent ? 0.6 : 1.0,
  });
  const glassMesh = buildSubMesh(groupMesh.glass, {
    colorOverride: opts.colorOverride,
    opacity: opts.transparent ? 0.6 : 1.0,
    translucent: true,
  });
  const floraMesh = buildSubMesh(groupMesh.florae, {
    colorOverride: opts.colorOverride,
    opacity: opts.transparent ? 0.6 : 1.0,
  });

  const ret = new THREE.Object3D();
  ret.add(blockMesh);
  ret.add(glassMesh);
  ret.add(floraMesh);
  const materials: THREE.Material[] = [];

  if (groupData.attachedPlaceables) {
    for (const placeable of groupData.attachedPlaceables) {
      const mesh = await placeableMesh(deps, placeable.id);
      const [newMaterials, _oldMaterials] = cloneMaterials(mesh);
      materials.push(...newMaterials);
      const pos = sub(placeable.position, groupData.box.v0);
      mesh.position.fromArray(pos);
      mesh.rotation.y = Math.PI / 2 + placeable.orientation[1];
      ret.add(mesh);
    }
  }

  if (opts.blueprintId) {
    const shapeIndex = deps.get("/terrain/shape/index");
    const wireframeMesh = voxeloo.toWireframeMesh(groupData.tensor, shapeIndex);
    const geometry = wireframeGeometryToBufferGeometry(wireframeMesh);
    const material = makeWireframeMaterial({
      baseColor: [0, 0.8, 0.8, 1.0],
      highlightedColor: [0, 0.8, 0.8, 1.0],
    });
    const mesh = new THREE.Mesh(geometry, material);
    ret.add(mesh);
  }

  return makeDisposable<GroupMesh>({ three: ret, box: groupData.box }, () => {
    groupMesh.florae.delete();
    groupMesh.glass.delete();
    groupMesh.blocks.delete();
    ret.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
    materials.forEach((m) => m.dispose());
  });
}

async function genGroupMesh(
  context: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps,
  groupId: BiomesId
): Promise<GroupMesh | undefined> {
  return groupMesh(context, deps, deps.get("/groups/data", groupId));
}

async function genGroupSrcMesh(
  context: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps
): Promise<GroupMesh | undefined> {
  return groupMesh(context, deps, deps.get("/groups/src/data"));
}

async function genGroupStaticMesh(
  context: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps
): Promise<GroupMesh | undefined> {
  const groupData = deps.get("/groups/static/data");
  groupData.attachedPlaceables = getAttachedPlaceables(
    deps,
    groupData.placeableIds
  );
  return groupMesh(context, deps, groupData);
}

function genGroupPreviewData(
  { voxeloo }: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps,
  previewId: BiomesId
): GroupData | undefined {
  const groupComponent = deps.get("/ecs/c/group_component", previewId);
  const groupBox = deps.get("/ecs/c/box", previewId);
  if (!groupComponent?.tensor || !groupBox) {
    return;
  }
  const tensor = new voxeloo.GroupTensor();
  tensor.load(groupComponent.tensor);

  return makeDisposable<GroupData>(
    {
      tensor: tensor,
      box: groupBox,
    },
    () => {
      tensor.delete();
    }
  );
}

async function genGroupGLTF(deps: ClientResourceDeps) {
  const groupPreview = await deps.get("/groups/src/mesh");
  ok(groupPreview, `Group mesh is missing`);
  return new Promise<string>((resolve) => {
    const obj = groupPreview.three.clone();
    replaceBaseWithThreeMaterials(obj);

    const exporter = new GLTFExporter();
    exporter.parse(
      obj,
      (gltf) => {
        resolve(JSON.stringify(gltf, null, 2));
      },
      (err) => {
        log.error("Failed to generate GLTF", { error: err });
      }
    );
  });
}

function genGroupBoxesMesh(deps: ClientResourceDeps, groupId: BiomesId) {
  const box = deps.get("/ecs/c/box", groupId);
  if (!box) {
    return;
  }

  const geometry = new THREE.BufferGeometry();
  const vertices = boxEdgeVertices(box.v0, box.v1);
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );

  return makeDisposable(
    new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0x000000ff })
    ),
    () => geometry.dispose()
  );
}

function highlightMesh(
  { voxeloo }: ClientContextSubset<"voxeloo">,
  groupData: GroupData | undefined
) {
  if (!groupData) {
    return;
  }

  return using(new voxeloo.SparseMap_U32(), (map) => {
    groupData.tensor.scan((pos, val) => {
      if (!isEmptyGroupEntry(val)) {
        const worldPos = add(pos, groupData.box.v0);
        map.set(...worldPos, 1);
      }
    });
    const index = new voxeloo.TextureMap();
    index.set(1, Dir.X_NEG, 0);
    index.set(1, Dir.X_POS, 0);
    index.set(1, Dir.Y_NEG, 0);
    index.set(1, Dir.Y_POS, 0);
    index.set(1, Dir.Z_NEG, 0);
    index.set(1, Dir.Z_POS, 0);
    const mesh = voxeloo.sparse_map_to_mesh(map, index);
    const geometry = biomesMeshToBufferGeometry(mesh);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff69b4,
      opacity: 0.5,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });
    const voxelMesh = new THREE.Mesh(geometry, material);

    const ret = new THREE.Object3D();
    ret.add(voxelMesh);

    if (groupData.attachedPlaceables) {
      for (const placeable of groupData.attachedPlaceables) {
        const boxGeometry = new THREE.BoxGeometry(...sizeAABB(placeable.aabb));
        const center = centerAABB(placeable.aabb);
        boxGeometry.translate(center[0], center[1], center[2]);
        ret.add(new THREE.Mesh(boxGeometry, material));
      }
    }

    return makeDisposable<GroupPreview>(
      {
        three: ret,
      },
      () => {
        geometry.dispose();
        mesh.delete();
        material.dispose();
      }
    );
  });
}

function genGroupSrcHighlightMesh(
  context: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps
) {
  return highlightMesh(context, deps.get("/groups/src/data"));
}

function genGroupHighlightMesh(
  context: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps,
  groupId: BiomesId
) {
  return highlightMesh(context, deps.get("/groups/data", groupId));
}

export async function buildDestructionSubMesh(
  deps: ClientResourceDeps,
  data: GroupSubMesh
) {
  const destroyingMaterial = await deps.get("/materials/destroying_material");

  const material = makeDestructionMaterial({
    destroyTexture: destroyingMaterial.texture,
    destroyTextureFrame: 5,
  });
  material.side = THREE.DoubleSide;
  material.polygonOffset = true;
  material.polygonOffsetFactor = -4;
  material.depthWrite = false;

  return new THREE.Mesh(groupGeometryToBufferGeometry(data), material);
}

async function genGroupDestructionMesh(
  { voxeloo }: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps,
  groupId: BiomesId
) {
  const groupData = deps.get("/groups/data", groupId);
  if (!groupData) {
    return;
  }

  const groupIndex = await deps.get("/groups/index");
  const groupMesh = voxeloo.toGroupMesh(groupData.tensor, groupIndex);

  const [blockMesh, glassMesh, floraMesh] = await Promise.all([
    buildDestructionSubMesh(deps, groupMesh.blocks),
    buildDestructionSubMesh(deps, groupMesh.glass),
    buildDestructionSubMesh(deps, groupMesh.florae),
  ]);

  const ret = new THREE.Object3D();
  ret.add(blockMesh);
  ret.add(glassMesh);
  ret.add(floraMesh);
  ret.position.set(...groupData.box.v0);

  return makeDisposable<GroupMesh>(
    {
      three: ret,
      box: groupData.box,
    },
    () => {
      groupMesh.florae.delete();
      groupMesh.glass.delete();
      groupMesh.blocks.delete();
      ret.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    }
  );
}

async function genGroupPreviewMesh(
  context: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps,
  previewId: BiomesId
): Promise<GroupMesh | undefined> {
  return groupMesh(context, deps, deps.get("/groups/preview/data", previewId), {
    transparent: true,
    blueprintId: deps.get("/ecs/c/group_preview_component", previewId)
      ?.blueprint_id,
  });
}

export async function addNewGroupResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  // Group Index
  builder.add("/groups/index", loader.provide(genGroupIndex));

  // Sourced from ECS
  builder.add("/groups/data", loader.provide(genGroupData));
  builder.add("/groups/mesh", loader.provide(genGroupMesh));
  builder.add("/groups/highlight_mesh", loader.provide(genGroupHighlightMesh));
  builder.add("/groups/boxes_mesh", genGroupBoxesMesh);
  builder.add(
    "/groups/destruction_mesh",
    loader.provide(genGroupDestructionMesh)
  );

  // Sourced from Static Data
  const voxeloo = await loader.get("voxeloo");
  builder.addGlobal("/groups/static/data", {
    tensor: new voxeloo.GroupTensor(),
    box: new Box(),
  });
  builder.add("/groups/static/mesh", loader.provide(genGroupStaticMesh));

  // Sourced from Magic Wand
  builder.addGlobal("/groups/src", {});
  builder.add("/groups/src/data", loader.provide(genGroupSrcData));
  builder.add("/groups/src/mesh", loader.provide(genGroupSrcMesh));
  builder.add("/groups/src/gltf", genGroupGLTF);
  builder.add(
    "/groups/src/highlight_mesh",
    loader.provide(genGroupSrcHighlightMesh)
  );
  builder.addGlobal("/groups/src/refinement", {});

  // Previews
  builder.add("/groups/preview/data", loader.provide(genGroupPreviewData));
  builder.add("/groups/preview/mesh", loader.provide(genGroupPreviewMesh));

  // Highlights
  builder.addGlobal("/groups/highlighted_groups", new Map());
}
