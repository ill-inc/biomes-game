import type { ClientContext, ClientContextSubset } from "@/client/game/context";
import {
  getBlueprintActiveLayer,
  isBlueprintCompleted,
  playerHasItemsRequiredForBlueprint,
} from "@/client/game/helpers/blueprint";
import { disposeObject3D } from "@/client/game/renderers/util";
import type { GroupData, GroupMesh } from "@/client/game/resources/groups";
import {
  buildDestructionSubMesh,
  buildSubMesh,
} from "@/client/game/resources/groups";
import { ParticleSystem } from "@/client/game/resources/particles";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import {
  groupGeometryToBufferGeometry,
  wireframeGeometryToBufferGeometry,
} from "@/client/game/util/meshes";
import { blueprintParticleMaterials } from "@/client/game/util/particles_systems";
import { makeColorMap } from "@/client/game/util/textures";
import {
  makeHighlightedTranslucentMaterial,
  updateHighlightedTranslucentMaterial,
} from "@/gen/client/game/shaders/highlighted_translucent";
import {
  makeWireframeMaterial,
  updateWireframeMaterial,
} from "@/gen/client/game/shaders/wireframe";
import {
  getPermuteReflect,
  isomorphismsEquivalent,
} from "@/shared/asset_defs/shapes";
import { using } from "@/shared/deletable";
import { makeDisposable } from "@/shared/disposable";
import { Box } from "@/shared/ecs/gen/components";
import {
  blueprintTerrainMatch,
  getBlueprintData,
  getBlueprintRequiredItems,
} from "@/shared/game/blueprint";
import {
  groupTensorBox,
  rotateGroupTensor,
  setGroupEntry,
} from "@/shared/game/group";
import { anItem } from "@/shared/game/item";
import { getTerrainIdAndIsomorphismAtPosition } from "@/shared/game/terrain_helper";
import type { BiomesId } from "@/shared/ids";
import {
  add,
  floor,
  scale,
  shiftAABB,
  sizeAABB,
  sub,
} from "@/shared/math/linear";
import type { Rotation } from "@/shared/math/rotation";
import { orientationToRotation } from "@/shared/math/rotation";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { AABB } from "@/shared/wasm/types/biomes";
import type { GroupSubMesh, WireframeMesh } from "@/shared/wasm/types/galois";
import { ok } from "assert";
import { isEqual } from "lodash";
import * as THREE from "three";

function genBlueprintData(
  { voxeloo }: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps,
  entityId: BiomesId
): GroupData | undefined {
  const position = deps.get("/ecs/c/position", entityId);
  const orientation = deps.get("/ecs/c/orientation", entityId);
  const blueprintComponent = deps.get("/ecs/c/blueprint_component", entityId);
  if (!position || !blueprintComponent) {
    return;
  }
  const groupData = getBlueprintData(blueprintComponent.blueprint_id);

  const tensor = new voxeloo.GroupTensor();
  tensor.load(groupData.tensor);
  const rotation = ((orientationToRotation(orientation?.v) +
    (anItem(blueprintComponent.blueprint_id).rotation ?? 0)) %
    4) as Rotation;
  const rotatedTensor =
    rotation === 0 ? tensor : rotateGroupTensor(voxeloo, tensor, rotation);
  if (rotation !== 0) {
    tensor.delete();
  }

  const groupBox = groupTensorBox(rotatedTensor);
  const aabb: AABB = [groupBox.v0, groupBox.v1];
  const size = sizeAABB(aabb);
  const shift: Vec3 = floor(sub(position.v, scale(0.5, size)));
  shift[1] = position.v[1];
  const shiftedAABB = shiftAABB(aabb, shift);

  return makeDisposable<GroupData>(
    {
      tensor: rotatedTensor,
      box: Box.create({ v0: shiftedAABB[0], v1: shiftedAABB[1] }),
    },
    () => {
      rotatedTensor.delete();
    }
  );
}

export type BlueprintMeshData = {
  mesh: GroupMesh;
  updateRequired: (required?: ReadonlyVec3) => void;
};

async function genBlueprintMesh(
  { voxeloo }: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps,
  entityId: BiomesId
): Promise<BlueprintMeshData | undefined> {
  const groupData = deps.get("/groups/blueprint/data", entityId);
  const blueprint = deps.get("/groups/blueprint/state", entityId);
  if (!groupData) {
    return;
  }

  const finished = blueprint.activeLayer === undefined;
  const ghostingEnabled = !anItem(blueprint.blueprintId).isTemplate;

  const ret = new THREE.Object3D();

  if (finished) {
    const pm = await deps.get("/groups/blueprint/particle_materials", entityId);
    const particles = new ParticleSystem(pm, blueprint.startTime);
    ret.add(particles.three);

    return {
      mesh: makeDisposable<GroupMesh>(
        { three: ret, box: groupData.box, particleSystem: particles },
        () => {
          particles?.materials.dispose();
        }
      ),
      updateRequired: (_?: ReadonlyVec3) => {},
    };
  }

  const groupIndex = await deps.get("/groups/index");
  const shapeIndex = deps.get("/terrain/shape/index");
  let updateRequired = (_?: ReadonlyVec3) => {};

  // Need these to use custom shaders that change opacity based on where we are looking.
  const buildGhostMesh = (
    data: GroupSubMesh,
    baseOpacity: number,
    highLightedOpacity: number
  ) => {
    const bufferGeo = groupGeometryToBufferGeometry(data);
    const translucentMaterial = makeHighlightedTranslucentMaterial({
      useMap: true,
      map: makeColorMap(data.textureData(), ...data.textureShape()),
      baseColor: [1, 1, 1, baseOpacity],
      highlightedColor: [1, 1, 1, highLightedOpacity],
      normalOffset: -0.01,
    });
    translucentMaterial.side = THREE.DoubleSide;
    return new THREE.Mesh(bufferGeo, translucentMaterial);
  };

  const buildWireframeMesh = (
    data: WireframeMesh,
    baseOpacity: number,
    highLightedOpacity: number
  ) => {
    const bufferGeo = wireframeGeometryToBufferGeometry(data);
    const color = new THREE.Color(0x2db3ff);
    const wireframeMaterial = makeWireframeMaterial({
      baseColor: [color.r, color.g, color.b, baseOpacity],
      highlightedColor: [color.r, color.g, color.b, highLightedOpacity],
    });
    wireframeMaterial.side = THREE.DoubleSide;
    return new THREE.Mesh(bufferGeo, wireframeMaterial);
  };

  // Build wireframes, ghost blocks, and highlighted faces
  const activeFaces: [Vec3, number][] = [];
  const [activeGroupMesh, activeWireframeMesh] = using(
    new voxeloo.GroupTensorBuilder(),
    (builder) => {
      groupData.tensor.scan((position, groupEntry) => {
        // We only show voxels on the active layer
        if (blueprint.activeLayer && position[1] !== blueprint.activeLayer) {
          return;
        }

        // TODO: Fully support flora
        if (!("block" in groupEntry)) {
          return;
        }

        // Check to see if this voxel is done
        const worldPos = add(position, groupData.box.v0);
        const [terrainId, isomorphism] = getTerrainIdAndIsomorphismAtPosition(
          deps,
          worldPos
        );
        const blocksMatch = blueprintTerrainMatch(
          blueprint.blueprintId,
          terrainId,
          groupEntry.block.block_id
        );
        const isomorphismMatches = isomorphismsEquivalent(
          isomorphism ?? 0,
          groupEntry.block.isomorphism_id ?? 0
        );
        const voxelDone = blocksMatch && isomorphismMatches;
        if (voxelDone) {
          return;
        }

        // Add this block to the unfinished subgroup that we render
        if (blueprint.activeLayer === position[1]) {
          setGroupEntry(builder, position, groupEntry);
        }

        // If the correct block is there but the wrong isomorphism, highlight the face
        let isomorphismFace: [Vec3, number] | undefined;
        if (
          blocksMatch &&
          !isomorphismMatches &&
          groupEntry.block.isomorphism_id
        ) {
          isomorphismFace = [position, groupEntry.block.isomorphism_id];
        }
        if (isomorphismFace) {
          activeFaces.push(isomorphismFace);
        }
      });

      // Now that we have created a subgroup of only active voxels, create a
      // GroupMesh and a WireframeMesh
      return using(builder.build(), (layerTensor) => {
        return [
          voxeloo.toGroupMesh(layerTensor, groupIndex),
          voxeloo.toWireframeMesh(layerTensor, shapeIndex),
        ];
      });
    }
  );

  // Finally, create the meshes themselves
  const blockMesh = ghostingEnabled
    ? buildGhostMesh(activeGroupMesh.blocks, 0.6, 0.9)
    : undefined;
  const wireframeMesh = buildWireframeMesh(activeWireframeMesh, 0.6, 0.9);
  // This callback is passed up, allowing calling code to update the highlightedPosition
  // uniform for the shader.
  updateRequired = (required?: ReadonlyVec3) => {
    if (blockMesh) {
      updateHighlightedTranslucentMaterial(blockMesh.material, {
        highlightedPosition: required ? [...required] : [-1, -1, -1],
      });
    }
    updateWireframeMaterial(wireframeMesh.material, {
      highlightedPosition: required ? [...required] : [-1, -1, -1],
    });
  };
  const floraMesh = buildSubMesh(activeGroupMesh.florae, {
    opacity: 0.6,
  });
  if (blockMesh) {
    ret.add(blockMesh);
  }
  ret.add(wireframeMesh);
  ret.add(floraMesh);

  // Create meshes for the highlighted faces
  const addFaces = (
    faces: [Vec3, number][],
    color: number,
    opacity: number
  ) => {
    for (const [pos, isomorphism] of faces) {
      const transformId = isomorphism & 0x3f;
      const [permute, reflect] = getPermuteReflect(transformId);
      let faceBoxGeometry: THREE.BoxGeometry | undefined;
      const THICKNESS = 0.01;
      if (isEqual(permute, [0, 1, 2]) && reflect[0] === 0) {
        faceBoxGeometry = new THREE.BoxGeometry(THICKNESS, 1, 1);
        faceBoxGeometry.translate(...add(pos, [0, 0.5, 0.5]));
      } else if (isEqual(permute, [0, 1, 2]) && reflect[0] === 1) {
        faceBoxGeometry = new THREE.BoxGeometry(THICKNESS, 1, 1);
        faceBoxGeometry.translate(...add(pos, [1, 0.5, 0.5]));
      } else if (isEqual(permute, [2, 1, 0]) && reflect[0] === 1) {
        faceBoxGeometry = new THREE.BoxGeometry(1, 1, THICKNESS);
        faceBoxGeometry.translate(...add(pos, [0.5, 0.5, 0]));
      } else if (isEqual(permute, [2, 1, 0]) && reflect[0] === 0) {
        faceBoxGeometry = new THREE.BoxGeometry(1, 1, THICKNESS);
        faceBoxGeometry.translate(...add(pos, [0.5, 0.5, 1]));
      }

      if (faceBoxGeometry) {
        ret.add(
          new THREE.Mesh(
            faceBoxGeometry,
            new THREE.MeshBasicMaterial({
              color,
              opacity,
              side: THREE.DoubleSide,
              transparent: true,
              depthTest: true,
              depthWrite: false,
              polygonOffset: true,
              polygonOffsetFactor: -4,
            })
          )
        );
      }
    }
  };

  if (activeFaces.length) {
    addFaces(activeFaces, 0xe7ea3b, 0.2);
  }

  return {
    mesh: makeDisposable<GroupMesh>({ three: ret, box: groupData.box }, () => {
      disposeObject3D(ret);
      activeGroupMesh?.florae.delete();
      activeGroupMesh?.blocks.delete();
    }),
    updateRequired: updateRequired,
  };
}

async function genBlueprintDestructionMesh(
  { voxeloo }: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps,
  groupId: BiomesId
) {
  const groupData = deps.get("/groups/blueprint/data", groupId);
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

export class BlueprintResource {
  blueprintId: BiomesId;
  startTime: number;
  completed: boolean;
  activeLayer?: number;

  constructor(
    public context: ClientContextSubset<"userId" | "voxeloo">,
    deps: ClientResourceDeps,
    public readonly entityId: BiomesId
  ) {
    const blueprintComponent = deps.get("/ecs/c/blueprint_component", entityId);
    ok(blueprintComponent);
    this.blueprintId = blueprintComponent.blueprint_id;
    this.startTime = deps.get("/clock").time;
    this.completed = false;
    this.update(deps);
  }

  update(deps: ClientResourceDeps) {
    this.completed = isBlueprintCompleted(deps, this.entityId);
    this.activeLayer = getBlueprintActiveLayer(
      this.context,
      deps,
      this.entityId
    );
  }
}

function genGroupBlueprintRequiredItems(
  { voxeloo }: { voxeloo: VoxelooModule },
  deps: ClientResourceDeps,
  blueprintId: BiomesId
) {
  const { tensor } = getBlueprintData(blueprintId);
  return getBlueprintRequiredItems(voxeloo, blueprintId, tensor);
}

function genGroupBlueprintHasRequiredItems(
  { userId }: { userId: BiomesId },
  deps: ClientResourceDeps,
  blueprintId: BiomesId
): boolean {
  return playerHasItemsRequiredForBlueprint(userId, deps, blueprintId);
}

export async function addNewBlueprintResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  // Blueprints
  builder.addDynamic(
    "/groups/blueprint/state",
    loader.provide(
      (ctx, deps, entityId) => new BlueprintResource(ctx, deps, entityId)
    ),
    (deps, blueprint) => blueprint.update(deps)
  );
  builder.add(
    "/groups/blueprint/required_items",
    loader.provide(genGroupBlueprintRequiredItems)
  );
  builder.add(
    "/groups/blueprint/has_required_items",
    loader.provide(genGroupBlueprintHasRequiredItems)
  );
  builder.add("/groups/blueprint/data", loader.provide(genBlueprintData));
  builder.add("/groups/blueprint/mesh", loader.provide(genBlueprintMesh));
  builder.add(
    "/groups/blueprint/destruction_mesh",
    loader.provide(genBlueprintDestructionMesh)
  );
  builder.add(
    "/groups/blueprint/particle_materials",
    blueprintParticleMaterials
  );
}
