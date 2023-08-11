import type { ClientContext } from "@/client/game/context";
import type { BlockTextures } from "@/client/game/resources/blocks";
import type { GlassTextures } from "@/client/game/resources/glass";
import type {
  ClientResourceDeps,
  ClientResources,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import {
  makeBufferTexture,
  makeColorMapArray,
} from "@/client/game/util/textures";
import {
  makeParticlesMaterial,
  updateParticlesMaterial,
} from "@/gen/client/game/shaders/particles";
import { using } from "@/shared/deletable";
import { isBlockId } from "@/shared/game/ids";
import type { BlockTerrainSample } from "@/shared/game/spatial";
import type { Vec2, Vec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import { assertNever } from "@/shared/util/type_helpers";
import { makeDynamicBuffer } from "@/shared/wasm/buffers";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { BlockIndex } from "@/shared/wasm/types/galois";
import type { RawShaderMaterial, Texture } from "three";
import {
  BufferGeometry,
  DataTexture,
  LinearFilter,
  Mesh,
  Object3D,
  RGBAFormat,
  TextureLoader,
} from "three";

export type DisplayType =
  | {
      kind: "block";
      material: number;
    }
  | {
      kind: "sprite";
      textureURL: string;
    };

export type SpawnType =
  | {
      kind: "relative_aabb";
      range: [Vec3, Vec3];
    }
  | {
      kind: "point";
      pos?: Vec3;
    };

export interface ParticleSystemDynamics {
  numParticles: number;
  spawnType: SpawnType;

  // Spawn info
  lifespanRange: Vec2;
  birthTimeRange?: Vec2;
  loop?: boolean;

  // Particle physics
  velocityRange: [Vec3, Vec3];
  acceleration: Vec3;
  angleVelocityRange?: Vec2;

  // Appearence
  sizeRange: Vec2;
  baseAlphaRange?: Vec2;
  fadeAfterRelativeLifespan?: number;

  // Lighting.
  emissiveBoost: number; // Added to each pixel's emissive component.
}

export async function genTerrainTextureMapping(
  voxeloo: VoxelooModule,
  blockIndex: BlockIndex,
  terrainID: number
): Promise<number[]> {
  return using(makeDynamicBuffer(voxeloo, "U32"), (buffer) => {
    voxeloo.toBlockSamples(blockIndex, 0, 0, 0, terrainID, buffer);
    return Array.from(buffer.asArray());
  });
}

// Must match the shader
enum ParticleDisplayMode {
  BLOCK = 0,
  SPRITE = 1,
}

export class ParticleSystemMaterials {
  // Construct using static creators below
  private constructor(
    public material: RawShaderMaterial,
    public geometry: BufferGeometry,
    public systemDynamics: ParticleSystemDynamics
  ) {}

  withClonedMaterial() {
    return new ParticleSystemMaterials(
      this.material.clone(),
      this.geometry,
      this.systemDynamics
    );
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }

  // Creation functions
  static createBlockMaterials(
    systemDynamics: ParticleSystemDynamics,
    blockTextures: BlockTextures | GlassTextures,
    textureMap: number[]
  ) {
    return new ParticleSystemMaterials(
      makeParticlesMaterial({
        ...this.emptyTextureParams(),
        displayRenderMode: ParticleDisplayMode.BLOCK,
        sampleIndex: textureMap,
        numSampleIndex: textureMap.length,
        colorMap: blockTextures.colorMap,
        textureIndex: blockTextures.index,
        mreaMap: blockTextures.mreaMap,
        ...this.systemDynamicsMaterialParameters(systemDynamics),
      }),
      this.prepareGeometry(systemDynamics.numParticles),
      systemDynamics
    );
  }

  static async createTerrainMaterialsFromDeps(
    voxeloo: VoxelooModule,
    deps: ClientResources,
    systemDynamics: ParticleSystemDynamics,
    blockSample: BlockTerrainSample
  ) {
    const isBlock = isBlockId(blockSample.terrainId);
    const [index, textures] = await Promise.all([
      deps.get(isBlock ? "/terrain/block/index" : "/terrain/glass/index"),
      deps.get(isBlock ? "/terrain/block/textures" : "/terrain/glass/textures"),
    ]);
    const textureMap = using(makeDynamicBuffer(voxeloo, "U32"), (buffer) => {
      voxeloo.toBlockSamples(
        index,
        blockSample.dye,
        blockSample.muck > 0 ? 1 : 0,
        blockSample.moisture,
        blockSample.terrainId,
        buffer
      );
      return Array.from(buffer.asArray());
    });

    return this.createBlockMaterials(systemDynamics, textures, textureMap);
  }

  static createTextureMaterials(
    systemDynamics: ParticleSystemDynamics,
    texture: Texture
  ) {
    return new ParticleSystemMaterials(
      makeParticlesMaterial({
        ...this.emptyTextureParams(),
        displayRenderMode: ParticleDisplayMode.SPRITE,
        spriteMap: texture,
        ...this.systemDynamicsMaterialParameters(systemDynamics),
      }),
      this.prepareGeometry(systemDynamics.numParticles),
      systemDynamics
    );
  }

  static async createTextureMaterialsFromURL(
    systemDynamics: ParticleSystemDynamics,
    url: string
  ) {
    const loader = new TextureLoader();
    const texture = await loader.loadAsync(url);
    texture.format = RGBAFormat;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;
    return this.createTextureMaterials(systemDynamics, texture);
  }

  private static emptyTextureParams() {
    return {
      sampleIndex: [1],
      numSampleIndex: 1,
      colorMap: makeColorMapArray(new Uint8Array([0, 0, 0, 0]), 1, 1, 1, 3),
      mreaMap: makeColorMapArray(
        new Uint8Array([0, 0, 0, 0]),
        1,
        1,
        1,
        3,
        false
      ),
      textureIndex: makeBufferTexture(new Uint32Array([0]), 1, 1),
      spriteMap: new DataTexture(),
    };
  }

  private static prepareGeometry(numParticles: number): BufferGeometry {
    const geometry = new BufferGeometry();
    const triangleCount = numParticles * 2;
    const vertexCount = triangleCount * 3;
    geometry.setDrawRange(0, vertexCount);
    return geometry;
  }

  private static systemDynamicsMaterialParameters(
    systemDynamics: ParticleSystemDynamics
  ) {
    let spawnAABBStart: Vec3;
    let spawnAABBEnd: Vec3;
    switch (systemDynamics.spawnType.kind) {
      case "point":
        spawnAABBStart = systemDynamics.spawnType.pos ?? [0, 0, 0];
        spawnAABBEnd = systemDynamics.spawnType.pos ?? [0, 0, 0];
        break;
      case "relative_aabb":
        spawnAABBStart = systemDynamics.spawnType.range[0];
        spawnAABBEnd = systemDynamics.spawnType.range[1];
        break;
      default:
        assertNever(systemDynamics.spawnType);
        throw new Error("Unreachable");
    }
    return {
      // Particle parameters
      spawnAABBStart,
      spawnAABBEnd,
      fadeAfterRelativeLifespan:
        systemDynamics.fadeAfterRelativeLifespan ?? 1.0,
      birthTimeRange: systemDynamics.birthTimeRange ?? [0, 0],
      lifespanRange: systemDynamics.lifespanRange,
      velocityRangeStart: systemDynamics.velocityRange[0],
      velocityRangeEnd: systemDynamics.velocityRange[1],
      acceleration: systemDynamics.acceleration,
      angleVelocityRange: systemDynamics.angleVelocityRange ?? [0, 0],
      sizeRange: systemDynamics.sizeRange ?? [1, 1],
      baseAlphaRange: systemDynamics.baseAlphaRange ?? [1.0, 1.0],
      emissiveBoost: systemDynamics.emissiveBoost,
      seed: Math.random(),
    };
  }
}

export class ParticleSystem {
  private _startTime?: number;
  private pauseTime?: number;
  private currentTime?: number;
  three: Object3D;

  constructor(public materials: ParticleSystemMaterials, startTime?: number) {
    this.three = new Object3D();
    this.three.frustumCulled = false;
    const mesh = new Mesh(materials.geometry, materials.material);
    mesh.frustumCulled = false;
    this.three.add(mesh);
    this.startTime = startTime;
  }

  public set startTime(theTime: number | undefined) {
    this._startTime = theTime;
    if (theTime && !(this.materials.systemDynamics.loop ?? true)) {
      this.pauseTime = theTime + 0.0001;
    }
  }

  public get startTime() {
    return this._startTime;
  }

  tickToTime(time: number, sunDirection: Vec3) {
    if (!this.startTime) {
      return;
    }

    this.currentTime = time;
    updateParticlesMaterial(this.materials.material, {
      relativeTime: this.currentTime - this.startTime,
      systemPauseTime:
        (this.pauseTime ?? this.currentTime + 1) - this.startTime,
      light: sunDirection,
    });
  }

  ready() {
    return this.startTime !== undefined;
  }

  pauseAt(time: number) {
    this.pauseTime = time;
  }

  pausingOrPaused() {
    return this.pauseTime !== undefined;
  }

  allAnimationsComplete() {
    if (!this.pauseTime || !this.currentTime) {
      return false;
    }

    return (
      this.currentTime >
      this.pauseTime + this.materials.systemDynamics.lifespanRange[1]
    );
  }
}

async function genTextureFromUrl(_deps: ClientResourceDeps, url: string) {
  const loader = new TextureLoader();
  return loader.loadAsync(url);
}

export function addParticleResources(
  _loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/scene/particles", new Map());
  builder.add("/scene/texture/url", genTextureFromUrl);
}
