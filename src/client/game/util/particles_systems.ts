import { ParticleSystemMaterials } from "@/client/game/resources/particles";
import type {
  ClientResourceDeps,
  ClientResources,
} from "@/client/game/resources/types";
import { resolveAssetUrlUntyped } from "@/galois/interface/asset_paths";
import { PHYSICS_EMOTE_GRAVITY } from "@/shared/constants";
import type { BlockTerrainSample } from "@/shared/game/spatial";
import type { BiomesId } from "@/shared/ids";
import { add, scale, squareVector, sub } from "@/shared/math/linear";
import type { AABB, ReadonlyAABB, Vec3 } from "@/shared/math/types";
import type { Optional } from "@/shared/util/type_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import { Dir } from "@/shared/wasm/types/common";
import { ok } from "assert";
import type { Texture } from "three";
import blueprintParticle from "/public/textures/particles/blueprint.png";
import checkpointParticle from "/public/textures/particles/checkpoint.png";
import fireIcon from "/public/textures/particles/fire.png";
import greenHeartIcon from "/public/textures/particles/glow-heart-green.png";
import shopIcon from "/public/textures/particles/shop.png";
import smokeIcon from "/public/textures/particles/smoke.png";
import softSmokeIcon from "/public/textures/particles/soft-smoke.png";
import warpParticle from "/public/textures/particles/warp.png";

export async function shopParticleMaterials(): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: {
        kind: "relative_aabb",
        range: [
          [-0.3, 0, -0.3],
          [0.3, 0, 0.3],
        ],
      },
      loop: true,
      fadeAfterRelativeLifespan: 0.64,
      emissiveBoost: 0,
      numParticles: 10,
      birthTimeRange: [0, 2],
      baseAlphaRange: [0.3, 0.6],
      lifespanRange: [0.5, 2],
      velocityRange: [
        [-0.2, 0.05, -0.2],
        [0.2, 0.2, 0.2],
      ],
      angleVelocityRange: [0.5, 1.5],
      acceleration: [0, 1, 0],
      sizeRange: [0.05, 0.1],
    },
    shopIcon.src
  );
}
export async function smokePoofParticleMaterials(): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: {
        kind: "relative_aabb",
        range: [
          [-0.5, 0.0, -0.5],
          [0.5, 0.1, 0.5],
        ],
      },
      loop: true,
      fadeAfterRelativeLifespan: 0.5,
      emissiveBoost: 0.02,
      numParticles: 600,
      birthTimeRange: [0.0, 3.0],
      baseAlphaRange: [0.15, 0.3],
      lifespanRange: [2, 5],
      velocityRange: [
        [-0.15, 0.5, -0.15],
        [0.15, 1.0, 0.15],
      ],
      angleVelocityRange: [0, 0.2],
      acceleration: [0, 0, 0],
      sizeRange: [0.1, 0.3],
    },
    smokeIcon.src
  );
}

export async function warpPoofParticleMaterials(): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: {
        kind: "relative_aabb",
        range: [
          [-0.5, 2, -0.5],
          [0.5, 2.5, 0.5],
        ],
      },
      loop: true,
      fadeAfterRelativeLifespan: 0.25,
      emissiveBoost: 0.2,
      numParticles: 50,
      birthTimeRange: [0, 4.0],
      baseAlphaRange: [0.25, 1],
      lifespanRange: [0, 4],
      velocityRange: [
        [-1, 1.0, 0],
        [1, 2.0, 0],
      ],
      angleVelocityRange: [0, 0.2],
      acceleration: [0, 2, 0],
      sizeRange: [0.02, 0.1],
    },

    warpParticle.src
  );
}

export async function firePoofParticleMaterials(): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: {
        kind: "relative_aabb",
        range: [
          [-0.45, 0.0, -0.45],
          [0.45, 0.1, 0.45],
        ],
      },
      loop: true,
      fadeAfterRelativeLifespan: 0.1,
      emissiveBoost: 1,
      numParticles: 5000,
      birthTimeRange: [0.0, 3.0],
      baseAlphaRange: [0.3, 0.5],
      lifespanRange: [0.5, 2.5],
      velocityRange: [
        [-0.1, 0.1, -0.1],
        [0.1, 0.4, 0.1],
      ],
      angleVelocityRange: [0, 0.2],
      acceleration: [0, 0, 0],
      sizeRange: [0.05, 0.2],
    },
    fireIcon.src
  );
}

export async function feedFireParticleMaterials(
  resources: ClientResources
): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTextureMaterials(
    {
      spawnType: {
        kind: "relative_aabb",
        range: [
          [-0.25, 0, -0.25],
          [0.25, 0.1, 0.25],
        ],
      },
      loop: false,
      fadeAfterRelativeLifespan: 0,
      emissiveBoost: 1,
      numParticles: 99,
      birthTimeRange: [0, 0],
      baseAlphaRange: [1, 1],
      lifespanRange: [0.5, 2],
      velocityRange: [
        [-2, 1, -2],
        [2, 2, 2],
      ],
      angleVelocityRange: [-0.5, 0.5],
      acceleration: [0, 2, 0],
      sizeRange: [0.025, 0.1],
    },
    await resources.get("/scene/texture/url", fireIcon.src)
  );
}

export async function feedFireSmokeParticleMaterials(
  resources: ClientResources
): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTextureMaterials(
    {
      spawnType: {
        kind: "relative_aabb",
        range: [
          [-0.5, 0.5, -0.5],
          [0.5, 0.5, 0.5],
        ],
      },
      loop: false,
      fadeAfterRelativeLifespan: 0.5,
      emissiveBoost: 0.02,
      numParticles: 200,
      birthTimeRange: [0, 0],
      baseAlphaRange: [0.15, 0.3],
      lifespanRange: [2, 5],
      velocityRange: [
        [-0.15, 1, -0.15],
        [0.15, 3, 0.15],
      ],
      angleVelocityRange: [0, 0.2],
      acceleration: [0, 0, 0],
      sizeRange: [0.1, 0.4],
    },
    await resources.get("/scene/texture/url", smokeIcon.src)
  );
}

function fromVoxelCenterDir(face: Dir): Vec3 {
  switch (face) {
    case Dir.X_NEG:
      return [-1, 0, 0];
    case Dir.X_POS:
      return [1, 0, 0];
    case Dir.Y_NEG:
      return [0, -1, 0];
    case Dir.Y_POS:
      return [0, 1, 0];
    case Dir.Z_NEG:
      return [0, 0, -1];
    case Dir.Z_POS:
      return [0, 0, 1];
  }
}

function oppositeFace(face: Dir) {
  switch (face) {
    case Dir.X_NEG:
      return Dir.X_POS;
    case Dir.X_POS:
      return Dir.X_NEG;
    case Dir.Y_NEG:
      return Dir.Y_POS;
    case Dir.Y_POS:
      return Dir.Y_NEG;
    case Dir.Z_NEG:
      return Dir.Z_POS;
    case Dir.Z_POS:
      return Dir.Z_NEG;
  }
}

export function terrainDestroyingParticleMaterials(
  { voxeloo }: { voxeloo: VoxelooModule },
  deps: ClientResources,
  blockSample: BlockTerrainSample,
  face: number
): Promise<ParticleSystemMaterials> {
  const outwardFaceVelocityMin = 0.3;
  const outwardFaceVelocityMax = 1;
  const lateralFaceVelocity = 0.5;
  const velocityRange: [Vec3, Vec3] = [
    [-lateralFaceVelocity, 0, -lateralFaceVelocity],
    [lateralFaceVelocity, 2, lateralFaceVelocity],
  ];
  const spawnRange: [Vec3, Vec3] = [
    [-0.5, -0.5, -0.5],
    [0.5, 0.5, 0.5],
  ];
  const faceScaling = 0.8;
  const spawnOffset = 0.65 / faceScaling;
  const spawnOffsetVec = scale(spawnOffset, fromVoxelCenterDir(face));
  spawnRange[0] = add(spawnOffsetVec, spawnRange[0]);
  spawnRange[1] = add(spawnOffsetVec, spawnRange[1]);

  switch (face) {
    case Dir.X_NEG:
      velocityRange[0][0] = -outwardFaceVelocityMin;
      velocityRange[1][0] = -outwardFaceVelocityMax;
      break;
    case Dir.X_POS:
      velocityRange[0][0] = outwardFaceVelocityMin;
      velocityRange[1][0] = outwardFaceVelocityMax;
      break;
    case Dir.Y_NEG:
      velocityRange[0][1] = 0;
      velocityRange[1][1] = 0;
      break;
    case Dir.Y_POS:
      velocityRange[0][1] = 1;
      velocityRange[1][1] = 3;
      break;
    case Dir.Z_NEG:
      velocityRange[0][2] = -outwardFaceVelocityMin;
      velocityRange[1][2] = -outwardFaceVelocityMax;
      break;
    case Dir.Z_POS:
      velocityRange[0][2] = outwardFaceVelocityMin;
      velocityRange[1][2] = outwardFaceVelocityMax;
      break;
  }
  return ParticleSystemMaterials.createTerrainMaterialsFromDeps(
    voxeloo,
    deps,
    {
      spawnType: {
        kind: "relative_aabb",
        range: [
          scale(faceScaling, spawnRange[0]),
          scale(faceScaling, spawnRange[1]),
        ],
      },
      numParticles: 16,
      birthTimeRange: [0.0, 2.0],
      lifespanRange: [1, 3],
      velocityRange,
      angleVelocityRange: [-0.5 * Math.PI, 0.5 * Math.PI],
      acceleration: [...PHYSICS_EMOTE_GRAVITY],
      sizeRange: [0.05, 0.15],
      fadeAfterRelativeLifespan: 0.95,
      emissiveBoost: 0,
    },
    blockSample
  );
}

export function terrainDestroyedParticleSystemMaterials(
  { voxeloo }: { voxeloo: VoxelooModule },
  deps: ClientResources,
  blockSample: BlockTerrainSample
): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTerrainMaterialsFromDeps(
    voxeloo,
    deps,
    {
      spawnType: {
        kind: "relative_aabb",
        range: [
          [-0.5, -0.5, -0.5],
          [0.5, 0.5, 0.5],
        ],
      },
      numParticles: 40,
      birthTimeRange: [0.0, 0.0],
      lifespanRange: [1, 5],
      velocityRange: [
        [-2, 0, -2],
        [2, 3, 2],
      ],
      angleVelocityRange: [-2 * Math.PI, 2 * Math.PI],
      acceleration: [...PHYSICS_EMOTE_GRAVITY],
      sizeRange: [0.1, 0.25],
      loop: false,
      fadeAfterRelativeLifespan: 0.95,
      emissiveBoost: 0,
    },
    blockSample
  );
}

export async function blueprintParticleMaterials(
  deps: ClientResourceDeps,
  entityId: BiomesId
): Promise<ParticleSystemMaterials> {
  const groupData = deps.get("/groups/blueprint/data", entityId);
  ok(groupData, "Group Data missing");
  const aabb: AABB = [[0, 0, 0], sub(groupData.box.v1, groupData.box.v0)];
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: {
        kind: "relative_aabb",
        range: aabb,
      },
      loop: true,
      fadeAfterRelativeLifespan: 0.64,
      emissiveBoost: 0,
      numParticles: 25,
      birthTimeRange: [1.25, 2],
      baseAlphaRange: [1, 1],
      lifespanRange: [0.5, 3],
      velocityRange: [
        [-0.2, 0.05, -0.2],
        [0.2, 0.5, 0.2],
      ],
      angleVelocityRange: [0.5, 1.5],
      acceleration: [0, 1, 0],
      sizeRange: [0.05, 0.1],
    },
    shopIcon.src
  );
}

export async function craftingStationCreatedParticleMaterials(
  aabb: ReadonlyAABB
): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: {
        kind: "relative_aabb",
        range: aabb as AABB,
      },
      loop: false,
      fadeAfterRelativeLifespan: 0.9,
      emissiveBoost: 0,
      numParticles: 200,
      birthTimeRange: [0, 0],
      baseAlphaRange: [1, 1],
      lifespanRange: [2, 5],
      velocityRange: [
        [-1, 0, -1],
        [1, 3, 1],
      ],
      angleVelocityRange: [0, 0],
      acceleration: [0, 1, 0],
      sizeRange: [0.2, 0.5],
    },
    shopIcon.src
  );
}

export async function npcOnHitParticleMaterials(): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: { kind: "point", pos: [0, 0, 0] },
      loop: false,
      fadeAfterRelativeLifespan: 0.03,
      emissiveBoost: 0.05,
      numParticles: 200,
      birthTimeRange: [0, 0],
      baseAlphaRange: [1, 1],
      lifespanRange: [0.1, 0.25],
      velocityRange: [
        [-3, -3, -3],
        [3, 3, 3],
      ],
      angleVelocityRange: [0, 10],
      acceleration: [0, 0, 0],
      sizeRange: [0.15, 0.2],
    },
    smokeIcon.src
  );
}

export async function npcOnDeathParticleMaterials(): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: { kind: "point", pos: [0, 0, 0] },
      loop: false,
      fadeAfterRelativeLifespan: 0.03,
      emissiveBoost: 0.05,
      numParticles: 400,
      birthTimeRange: [0, 0],
      baseAlphaRange: [1, 1],
      lifespanRange: [0.2, 0.4],
      velocityRange: [
        [-5, -5, -5],
        [5, 5, 5],
      ],
      angleVelocityRange: [0, 10],
      acceleration: [0, 0, 0],
      sizeRange: [0.3, 0.7],
    },
    smokeIcon.src
  );
}

export async function playerHealingParticleMaterials(): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: {
        kind: "relative_aabb",
        range: [
          [-0.5, 1.0, -0.5],
          [0.5, 2.0, 0.5],
        ],
      },
      loop: true,
      fadeAfterRelativeLifespan: 0.5,
      emissiveBoost: 0.1,
      numParticles: 4,
      birthTimeRange: [0.1, 0.2],
      baseAlphaRange: [0.25, 1],
      lifespanRange: [1, 2],
      velocityRange: [
        [-0.1, 0.5, -0.1],
        [0.1, 1, 0.1],
      ],
      angleVelocityRange: [0, 0],
      acceleration: [0, 0, 0],
      sizeRange: [0.075, 0.15],
    },
    greenHeartIcon.src
  );
}

export async function playerBuffParticleMaterials(
  particleIcon: string
): Promise<Optional<ParticleSystemMaterials>> {
  const particleIconUrl = resolveAssetUrlUntyped(
    `icons/particles/${particleIcon}`
  );
  if (!particleIconUrl) {
    return;
  }
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: {
        kind: "relative_aabb",
        range: [
          [-0.5, 1.0, -0.5],
          [0.5, 2.0, 0.5],
        ],
      },
      loop: true,
      fadeAfterRelativeLifespan: 0.5,
      emissiveBoost: 0,
      numParticles: 4,
      birthTimeRange: [0.1, 0.2],
      baseAlphaRange: [0.25, 1],
      lifespanRange: [1, 2],
      velocityRange: [
        [-0.1, 0.5, -0.1],
        [0.1, 1, 0.1],
      ],
      angleVelocityRange: [0, 0],
      acceleration: [0, 0, 0],
      sizeRange: [0.075, 0.15],
    },
    particleIconUrl
  );
}

export async function blockPlaceParticleTexture(
  resources: ClientResources | ClientResourceDeps
) {
  return resources.get("/scene/texture/url", softSmokeIcon.src);
}

export function blockPlaceParticleMaterials(
  texture: Texture,
  face: number
): ParticleSystemMaterials {
  const spawnRange: [Vec3, Vec3] = [
    [-0.75, -0.75, -0.75],
    [0.75, 0.75, 0.75],
  ];
  const velocityRange: [Vec3, Vec3] = [
    [-1, -1, -1],
    [1, 1, 1],
  ];

  const squishBox = 0.2;
  const spawnOffset = 0.5;
  const spawnOffsetVec = scale(
    spawnOffset,
    fromVoxelCenterDir(oppositeFace(face))
  );
  for (const i of [0, 1, 2]) {
    if (spawnOffsetVec[i] !== 0) {
      spawnRange[0][i] *= squishBox;
      spawnRange[1][i] *= squishBox;
      velocityRange[0][i] = 0;
      velocityRange[1][i] = 0;
    }
  }
  spawnRange[0] = add(spawnRange[0], spawnOffsetVec);
  spawnRange[1] = add(spawnRange[1], spawnOffsetVec);

  return ParticleSystemMaterials.createTextureMaterials(
    {
      spawnType: {
        kind: "relative_aabb",
        range: spawnRange,
      },
      loop: false,
      fadeAfterRelativeLifespan: 0,
      emissiveBoost: 0,
      numParticles: 12,
      birthTimeRange: [0, 0],
      baseAlphaRange: [0.15, 0.3],
      lifespanRange: [0.25, 0.5],
      velocityRange,
      angleVelocityRange: [-2, 2],
      acceleration: [0, 0.5, 0],
      sizeRange: [0.5, 0.8],
    },
    texture
  );
}

export async function blueprintCompleteParticleMaterials1(
  aabb: ReadonlyAABB
): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: {
        kind: "relative_aabb",
        range: [[...aabb[0]], [...aabb[1]]],
      },
      loop: false,
      emissiveBoost: 0.2,
      numParticles: 2000,
      baseAlphaRange: [0.25, 1],
      lifespanRange: [0, 4.0],
      velocityRange: [
        [-2, 2, -2],
        [2, 4, 2],
      ],
      acceleration: [0, -4, 0],
      angleVelocityRange: [-2, 2],
      sizeRange: [0.05, 0.15],
    },
    warpParticle.src
  );
}

export async function blueprintCompleteParticleMaterials2(
  aabb: ReadonlyAABB
): Promise<ParticleSystemMaterials> {
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: {
        kind: "relative_aabb",
        range: [[...aabb[0]], [...aabb[1]]],
      },
      loop: false,
      emissiveBoost: 0.2,
      numParticles: 200,
      baseAlphaRange: [0.5, 1],
      lifespanRange: [0, 4.0],
      velocityRange: [
        [-2, 2, -2],
        [2, 4, 2],
      ],
      acceleration: [0, -4, 0],
      angleVelocityRange: [-2, 2],
      sizeRange: [0.05, 0.1],
    },
    blueprintParticle.src
  );
}

export async function checkpointActiveParticleMaterials(
  boxSize: Vec3 = squareVector
): Promise<ParticleSystemMaterials> {
  const x = (boxSize[0] - 0.4) / 2;
  const z = (boxSize[2] - 0.4) / 2;

  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: {
        kind: "relative_aabb",
        range: [
          [-x, 0, -z],
          [x, 0.05, z],
        ],
      },
      loop: true,
      fadeAfterRelativeLifespan: 0.4,
      emissiveBoost: 0.2,
      numParticles: 15,
      birthTimeRange: [0, 5],
      baseAlphaRange: [0.5, 1],
      lifespanRange: [1, 3],
      velocityRange: [
        [0, 0.2, 0],
        [0, 0.8, 0],
      ],
      angleVelocityRange: [0, 0],

      acceleration: [0, 0, 0],
      sizeRange: [0.05, 0.14],
    },
    checkpointParticle.src
  );
}

export async function checkpointCompleteParticleMaterials(
  boxSize: Vec3 = squareVector
): Promise<ParticleSystemMaterials> {
  const x = (boxSize[0] - 0.4) / 2;
  const y = boxSize[1];
  const z = (boxSize[2] - 0.4) / 2;
  return ParticleSystemMaterials.createTextureMaterialsFromURL(
    {
      spawnType: {
        kind: "relative_aabb",
        range: [
          [-x, 0, -z],
          [x, y, z],
        ],
      },
      loop: false,
      fadeAfterRelativeLifespan: 0.5,
      emissiveBoost: 0.2,
      numParticles: 250,
      birthTimeRange: [0, 0],
      baseAlphaRange: [0, 1],
      lifespanRange: [0, 0.75],
      velocityRange: [
        [0, 0, 0],
        [0, 3, 0],
      ],
      angleVelocityRange: [0, 0],
      acceleration: [0, 5, 0],
      sizeRange: [0.05, 0.1],
    },
    checkpointParticle.src
  );
}
