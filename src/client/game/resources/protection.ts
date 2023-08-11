import { toQuads } from "@/cayley/graphics/aabbs";
import { buildQuadIndices } from "@/cayley/graphics/geometry";
import { toLines } from "@/cayley/graphics/rects";
import type { Array3 } from "@/cayley/numerics/arrays";
import { fromArray, makeArray } from "@/cayley/numerics/arrays";
import { concat } from "@/cayley/numerics/manipulate";
import type { ClientContext } from "@/client/game/context";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type { AssetPath } from "@/galois/interface/asset_paths";
import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import {
  makeHexagonalBloomMaterial,
  updateHexagonalBloomMaterial,
} from "@/gen/client/game/shaders/hexagonal_bloom";
import {
  makeProtectionMaterial,
  updateProtectionMaterial,
} from "@/gen/client/game/shaders/protection";
import { makeDisposable } from "@/shared/disposable";
import type { Entity } from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import { anchorAndSizeToAABB, unionAABB } from "@/shared/math/linear";
import type { AABB, Vec2, Vec3, Vec4 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import * as THREE from "three";

export type ProtectionBoundary = {
  aabb?: AABB;
  fields: AABB[];
};

export type ProtectionMapBoundary = {
  border: [Vec2, Vec2][];
  interior: [Vec2, Vec2][];
};

export interface ProtectionMesh {
  three: THREE.Mesh;
  update(playerPos: Vec3, fadeOut: number, time: number): void;
  draw(scenes: Scenes): void;
}

export interface ProtectionMaterial {
  three: THREE.Material;
  update(playerPos: Vec3, fadeOut: number, time: number): void;
}

function getEntityAABB(deps: ClientResourceDeps, id: BiomesId) {
  const pos = deps.get("/ecs/c/position", id)?.v;
  if (pos) {
    const size = deps.get("/ecs/c/size", id)?.v;
    if (size) {
      return anchorAndSizeToAABB(pos, size);
    }
  }
}

function protectionFields(deps: ClientResourceDeps, fieldIds: BiomesId[]) {
  const aabbs: AABB[] = [];
  for (const fieldId of fieldIds) {
    const aabb = getEntityAABB(deps, fieldId);
    if (aabb) {
      aabbs.push(aabb);
    }
  }
  return aabbs;
}

function robotFields(deps: ClientResourceDeps, robots: Entity[]) {
  const fieldIds = [];
  for (const robot of robots) {
    const fieldId = robot.projects_protection?.protectionChildId;
    if (fieldId) {
      fieldIds.push(fieldId);
    }
  }
  return protectionFields(deps, fieldIds);
}

function aabbUnion(aabbs: AABB[]) {
  let ret = undefined;
  for (const aabb of aabbs) {
    ret = unionAABB(aabb, ret ?? aabb);
  }
  return ret;
}

function genCreatorBoundary(deps: ClientResourceDeps, creator: BiomesId) {
  const robots = deps.get("/ecs/robots_by_creator_id", creator);
  const fields = robotFields(deps, robots);
  return { aabb: aabbUnion(fields), fields };
}

function genLandmarkBoundary(deps: ClientResourceDeps, landmark: string) {
  const robots = deps.get("/ecs/robots_by_landmark_name", landmark);
  const fields = robotFields(deps, robots);
  return { aabb: aabbUnion(fields), fields };
}

function genTeamBoundary(deps: ClientResourceDeps, id: BiomesId) {
  const ids = deps
    .get("/ecs/protection_by_team_id", id)
    .map((entity) => entity.id);
  const fields = protectionFields(deps, ids);
  return {
    aabb: aabbUnion(fields),
    fields,
  };
}

function genRobotBoundary(deps: ClientResourceDeps, id: BiomesId) {
  const landmark = deps.get("/ecs/c/landmark", id);
  if (landmark?.override_name) {
    return deps.get("/protection/landmark_boundary", landmark.override_name);
  }

  const protection = deps.get("/ecs/c/projects_protection", id);
  if (protection?.protectionChildId) {
    const fieldId = protection.protectionChildId;

    // Merge by appropriate ACL grouping if possible.
    const acl = deps.get("/ecs/c/acl_component", fieldId)?.acl;
    if (acl) {
      if (acl.creatorTeam?.[0]) {
        return deps.get("/protection/team_boundary", acl.creatorTeam[0]);
      } else if (acl.creator?.[0]) {
        return deps.get("/protection/creator_boundary", acl.creator[0]);
      }
    }

    // If ACL based merge didn't work, render the field on its own.
    const fields = protectionFields(deps, [fieldId]);
    return { aabb: aabbUnion(fields), fields };
  }

  return { fields: [] };
}

function genProtectionTexture(deps: ClientResourceDeps) {
  const tweaks = deps.get("/tweaks");
  const loader = new THREE.TextureLoader();
  const textureUrl = tweaks.protectionField.texture as AssetPath;
  const texture = loader.load(resolveAssetUrl(textureUrl));
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return makeDisposable(texture, () => {
    texture.dispose();
  });
}

function buildDefaultProtectionMaterial(deps: ClientResourceDeps) {
  const tweaks = deps.get("/tweaks");
  const texture = deps.get("/protection/texture");

  // Build the mesh material.
  const material = makeProtectionMaterial({
    // pattern
    patternTexture: texture,
    texScale: [
      tweaks.protectionField.textureScale,
      tweaks.protectionField.textureScale,
    ],
    opacity: tweaks.protectionField.opacity,

    // modified by render loop as well
    fadeOut: 1.0,

    // Ring: ring around the player when they get close
    ringColor: [0.25, 1.0, 0.55, 1.0] as Vec4,
    ringFadeDistance: 50.0,
    ringFadePower: 4000.0,
    ringSize: tweaks.protectionField.ring ? 1.5 : 0.0,

    // Close: fade in when player gets close
    closeFadeDistance: 100.0,
    closeFadePower: 10.0,

    // Add a bit of opaqueness when very close
    closePlaneDistance: 3.0,
    closePlaneAlpha: tweaks.protectionField.highlight !== "none" ? 0.75 : 0.0,
    pixelHighlight: tweaks.protectionField.highlight === "pixel",

    // Tweak options
    fadeOutOpacityOnly: tweaks.protectionField.fadeOutOpacityOnly,
    hideBehindCharacter: tweaks.protectionField.hideBehindCharacter,
  });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -4;

  return makeDisposable(
    {
      three: material,
      update: (playerPos: Vec3, fadeOut: number) => {
        updateProtectionMaterial(material, { playerPos, fadeOut });
      },
    },
    () => {
      material.dispose();
    }
  );
}

function buildHexagonalBloomMaterial(deps: ClientResourceDeps) {
  const tweaks = deps.get("/tweaks");

  // Build the mesh material.
  const material = makeHexagonalBloomMaterial({
    fadeOut: 1.0,
    playerPos: [0.0, 0.0, 0.0],
    maxIntensity: tweaks.protectionField.hexIntensity,
    hexThickness: tweaks.protectionField.hexThickness,
    hexSmoothing: tweaks.protectionField.hexSmoothing,
    hexGridScale: tweaks.protectionField.hexGridScale,
    quantization: tweaks.protectionField.hexQuantization,
    shimmeryBrightness: tweaks.protectionField.hexShimmerBrightness,
    shimmerySpeed: tweaks.protectionField.hexShimmerSpeed,
    shimmeryFatness: tweaks.protectionField.hexShimmerFatness,
    shimmeryFrequency: tweaks.protectionField.hexShimmerFrequency,
    heightScaling: tweaks.protectionField.heightScaling,
    hexColor: [1.3, 0.9, 2.5],
  });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -4;

  return makeDisposable(
    {
      three: material,
      update: (playerPos: Vec3, fadeOut: number, time: number) => {
        updateHexagonalBloomMaterial(material, { playerPos, fadeOut, time });
      },
    },
    () => {
      material.dispose();
    }
  );
}

function genProtectionMaterial(deps: ClientResourceDeps) {
  const tweaks = deps.get("/tweaks");
  if (tweaks.protectionField.shader == "hexagonal_bloom") {
    return buildHexagonalBloomMaterial(deps);
  } else {
    return buildDefaultProtectionMaterial(deps);
  }
}

function addTexCoords(vertices: Array3<"F32">) {
  const [n, q, v] = vertices.shape;
  return makeArray("F32", [n, q, v + 2])
    .view()
    .merge(":,:,:-2", vertices)
    .merge(":,:,-2:", [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    ])
    .eval();
}

function addBackFaces(vertices: Array3<"F32">) {
  return concat([vertices, vertices.view().flip([false, true, false]).eval()]);
}

function buildProtectionGeometry(fields: AABB[]) {
  const vertices = addBackFaces(
    addTexCoords(toQuads(fromArray("F32", [fields.length, 2, 3], fields)))
  );
  const indices = buildQuadIndices(vertices.shape[0]);

  // Convert to three.
  const ret = new THREE.BufferGeometry();
  const vbo = new THREE.InterleavedBuffer(vertices.data, 5);
  ret.setAttribute("position", new THREE.InterleavedBufferAttribute(vbo, 3, 0));
  ret.setAttribute("texCoord", new THREE.InterleavedBufferAttribute(vbo, 2, 3));
  ret.setIndex(new THREE.BufferAttribute(indices, 1));
  ret.computeVertexNormals();
  return ret;
}

function genProtectionMesh(deps: ClientResourceDeps, id: BiomesId) {
  const tweaks = deps.get("/tweaks");
  if (tweaks.protectionField.shader === "none") {
    return;
  }

  if (tweaks.protectionField.hideWhenCameraHeld) {
    const selection = deps.get("/hotbar/selection");
    if (selection.kind === "camera") {
      return;
    }
  }

  const { aabb, fields } = deps.get("/protection/boundary", id);
  if (!aabb) {
    return;
  }

  // Build and return a new mesh Build and return a new mesh
  // TODO: Replace aabb below with fields once toQuads is good to go.
  const material = deps.get("/protection/material");
  const geometry = buildProtectionGeometry(fields);
  const three = new THREE.Mesh(geometry, material.three);
  return makeDisposable(
    {
      three,
      update(playerPos: Vec3, fadeOut: number, time: number) {
        material.update(playerPos, fadeOut, time);
      },
      draw(scenes: Scenes) {
        addToScenes(scenes, three);
      },
    },
    () => {
      geometry.dispose();
    }
  );
}

export function getRobotProtectionBoundary(
  fields: AABB[]
): ProtectionMapBoundary {
  // Take the xz face of each field AABB.
  const interior: [Vec2, Vec2][] = [];
  for (const aabb of fields) {
    interior.push([
      [aabb[0][0], aabb[0][2]],
      [aabb[1][0], aabb[1][2]],
    ]);
  }

  // Generate the lines along the border of the interior.
  const border = toLines(fromArray("F32", [fields.length, 2, 2], interior));

  return {
    interior,
    border: border.js() as [Vec2, Vec2][],
  };
}

function genRobotMapBoundary(deps: ClientResourceDeps, id: BiomesId) {
  const { aabb, fields } = deps.get("/protection/boundary", id);
  if (!aabb) {
    return;
  }

  return getRobotProtectionBoundary(fields);
}

export function addProtectionResources(
  _loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.add("/protection/creator_boundary", genCreatorBoundary);
  builder.add("/protection/landmark_boundary", genLandmarkBoundary);
  builder.add("/protection/team_boundary", genTeamBoundary);
  builder.add("/protection/boundary", genRobotBoundary);
  builder.add("/protection/map_boundary", genRobotMapBoundary);
  builder.add("/protection/material", genProtectionMaterial);
  builder.add("/protection/texture", genProtectionTexture);
  builder.add("/protection/mesh", genProtectionMesh);
}
