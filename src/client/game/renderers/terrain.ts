import type { AuthManager } from "@/client/game/context_managers/auth_manager";
import type { Priority } from "@/client/game/context_managers/biomes_async";
import { priorityForPosition } from "@/client/game/context_managers/biomes_async";
import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScene, addToScenes } from "@/client/game/renderers/scenes";
import type { BlockMesh } from "@/client/game/resources/blocks";
import type { FloraMesh } from "@/client/game/resources/florae";
import type { GlassMesh } from "@/client/game/resources/glass";
import type {
  OcclusionData,
  OcclusionDebugMesh,
} from "@/client/game/resources/terrain";
import { updateOcclusionMesh } from "@/client/game/resources/terrain";
import type {
  ClientResourcePaths,
  ClientResources,
  ClientResourcesStats,
} from "@/client/game/resources/types";
import type { WaterMesh } from "@/client/game/resources/water";
import type { BlocksUniforms } from "@/gen/client/game/shaders/blocks";
import { updateBlocksMaterial } from "@/gen/client/game/shaders/blocks";
import type { FloraUniforms } from "@/gen/client/game/shaders/flora";
import { updateFloraMaterial } from "@/gen/client/game/shaders/flora";
import { FloraLowQualityShaders } from "@/gen/client/game/shaders/flora_low_quality_shaders";
import { FloraShaders } from "@/gen/client/game/shaders/flora_shaders";
import type { GlassUniforms } from "@/gen/client/game/shaders/glass";
import { updateGlassMaterial } from "@/gen/client/game/shaders/glass";
import type { WaterUniforms } from "@/gen/client/game/shaders/water";
import { updateWaterMaterial } from "@/gen/client/game/shaders/water";
import { using } from "@/shared/deletable";
import type { ShardId } from "@/shared/ecs/gen/types";
import { shardCenter, voxelShard } from "@/shared/game/shard";
import { distSq } from "@/shared/math/linear";
import { clamp } from "@/shared/math/math";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import type { ResourcesStats } from "@/shared/resources/biomes";
import { ResourceLimiter } from "@/shared/resources/biomes";
import type { PathMap } from "@/shared/resources/path_map";
import type {
  Args,
  Key,
  Resolve,
  Ret,
  TypedResources,
} from "@/shared/resources/types";
import { Cval } from "@/shared/util/cvals";
import type { Optional } from "@/shared/util/type_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import type {
  FrustumSharder,
  VisibilitySharder,
} from "@/shared/wasm/types/shards";

const numRenderedBlockShards = new Cval({
  path: ["renderer", "terrain", "numRenderedBlockShards"],
  help: "The total number of block terrain shards that are rendered in the previous frame.",
  initialValue: 0,
});
const numRenderedGlassShards = new Cval({
  path: ["renderer", "terrain", "numRenderedGlassShards"],
  help: "The total number of glass terrain shards that are rendered in the previous frame.",
  initialValue: 0,
});
const numRenderedFloraShards = new Cval({
  path: ["renderer", "terrain", "numRenderedFloraShards"],
  help: "The total number of flora terrain shards that are rendered in the previous frame.",
  initialValue: 0,
});
const numRenderedWaterShards = new Cval({
  path: ["renderer", "terrain", "numRenderedWaterShards"],
  help: "The total number of water terrain shards that are rendered in the previous frame.",
  initialValue: 0,
});
const numRenderedOccluders = new Cval({
  path: ["renderer", "terrain", "numRenderedOccluders"],
  help: "The total number of occluders rasterized to the occlusion buffer.",
  initialValue: 0,
});

// Encapsulates terrain-specific logic for resource build queue throttling.
// Namely that we:
//   1. Want high priority terrain shards to (almost) always get enqueued ASAP,
//      to reduce edit latency.
class TerrainResourceLimiter<P extends PathMap<P>> {
  defaultThrottler: ResourceLimiter<P>;
  criticalThrottler: ResourceLimiter<P>;

  constructor(resources: TypedResources<P>, stats: ResourcesStats<P>) {
    this.defaultThrottler = new ResourceLimiter(resources, stats, 6);
    this.criticalThrottler = new ResourceLimiter(resources, stats, 40);
  }

  cached<K extends Key<P>>(
    priority: Priority,
    path: K,
    ...args: [...Args<P, K>]
  ): Resolve<Ret<P, K>> | undefined {
    if (priority === "critical") {
      return this.criticalThrottler.cached(path, ...args);
    } else {
      return this.defaultThrottler.cached(path, ...args);
    }
  }
}

const OCCLUSION_BUFFER_SHAPE = [128, 64] as const;
const OCCLUSION_MESH_UPDATE_MS = 1_000.0;

class OcclusionMeshWriter {
  stale: boolean;

  constructor(
    readonly occlusionMesh: OcclusionDebugMesh,
    readonly step: number
  ) {
    const now = performance.now();
    this.stale = now - this.occlusionMesh.time > OCCLUSION_MESH_UPDATE_MS;
  }

  update(sharder: VisibilitySharder, step: number) {
    if (this.stale && this.step > 0 && step >= this.step) {
      this.occlusionMesh.time = performance.now();
      this.stale = false;

      // Update the debug mesh to reflect the current occlusion buffer data.
      sharder.writeOcclusionBuffer(this.occlusionMesh.buffer);
      this.occlusionMesh.shape = OCCLUSION_BUFFER_SHAPE;
      updateOcclusionMesh(this.occlusionMesh);
    }
  }
}

export class TerrainRenderer implements Renderer {
  name = "terrain";
  time: number = 0;
  sharder: FrustumSharder;

  constructor(
    private readonly resources: ClientResources,
    private readonly resourcesStats: ClientResourcesStats,
    private readonly authManager: AuthManager,
    private readonly voxeloo: VoxelooModule
  ) {
    this.sharder = new voxeloo.FrustumSharder(5 /* shard level */);
  }

  draw(scenes: Scenes, dt: number) {
    this.time += dt;
    const settings = this.resources.get("/settings/graphics/dynamic");
    const tweaks = this.resources.get("/tweaks");
    const camera = this.resources.get("/scene/camera");
    const env = this.resources.get("/camera/environment");
    const sky = this.resources.get("/scene/sky_params");
    const enableWaterReflection = settings.postprocesses.waterReflection;

    // The reosurce limiter throttles how often resource generation occurs as a
    // side effect of fetching resources from the cache. Internally, the limiter
    // maintains a quota and only generates so many new terrain shards per frame.
    const throttledResources = new TerrainResourceLimiter(
      this.resources,
      this.resourcesStats
    );

    // Fetch the debug occlusion mesh data.
    const occlusionDebugMeshWriter = new OcclusionMeshWriter(
      this.resources.get("/terrain/occlusion_debug_mesh"),
      tweaks.showOcclusionMask ? tweaks.occlusionMeshStep : 0
    );

    // Figure out which shards are should be rendered with occlusion culling.
    const shards: {
      shard: ShardId;
      center: Vec3;
      occlusion: Optional<OcclusionData>;
    }[] = [];
    using(
      new this.voxeloo.VisibilitySharder(
        camera.viewProj(),
        camera.pos(),
        camera.view(),
        OCCLUSION_BUFFER_SHAPE
      ),
      (sharder) => {
        let step = 0;
        numRenderedOccluders.value = 0;
        sharder.scan((shard) => {
          const center = shardCenter(shard);
          const priority = priorityForPosition(camera, center);

          const occlusion = throttledResources.cached(
            priority,
            "/terrain/occluder",
            shard
          );

          shards.push({ shard, center, occlusion });
          if (occlusion) {
            numRenderedOccluders.value += occlusion.occluder?.size() ?? 0;
            occlusionDebugMeshWriter.update(sharder, step++);
            return occlusion.occluder;
          }
          return undefined;
        });
        occlusionDebugMeshWriter.update(sharder, Infinity);
      }
    );

    // Since toArray() is called frequently, precompute it here.
    const defaultBlockMaterial: Partial<BlocksUniforms> = {
      destroyPos: [Infinity, Infinity, Infinity],
      shapePos: [Infinity, Infinity, Infinity],
      light: sky.sunDirection.toArray(),
    };

    const defaultGlassMaterial: Partial<GlassUniforms> = {
      destroyPos: [Infinity, Infinity, Infinity],
      shapePos: [Infinity, Infinity, Infinity],
      light: sky.sunDirection.toArray(),
      sunDirection: sky.sunDirection.toArray(),
      sunColor: [sky.sunColor.r, sky.sunColor.g, sky.sunColor.b],
      skyGroundOffset: sky.groundOffset,
      skyHeightScale: sky.heightScale,
      inWater: env.inWater ? 1 : 0,
      muckyness: env.muckyness.get(),
      cameraPosition: camera.three.position.toArray(),
    };

    const defaultFloraMaterial: Partial<FloraUniforms> = {
      time: this.time,
      light: sky.sunDirection.toArray(),
    };

    const DEFAULT_WATER_REFLECTION_STEPS = 30;

    const waterMaterial: Partial<WaterUniforms> = {
      time: this.time,
      light: sky.sunDirection.toArray(),
      inWater: env.inWater ? 1 : 0,
      numReflectionSteps: enableWaterReflection
        ? DEFAULT_WATER_REFLECTION_STEPS
        : 0,
      ...tweaks.water,
      normalOctaveStrength1: 1.0,
      normalOctaveStrength2: 1.0,
      useReflection: 0.3,
      muckRate: 0.05,
    };

    const blockMeshes: BlockMesh[] = [];
    const floraMeshes: FloraMesh[] = [];
    const glassMeshes: GlassMesh[] = [];
    const waterMeshes: WaterMesh[] = [];

    numRenderedBlockShards.value = 0;
    numRenderedGlassShards.value = 0;
    numRenderedFloraShards.value = 0;
    numRenderedWaterShards.value = 0;
    shards.map(({ shard: id, center, occlusion }, i) => {
      if (occlusion) {
        const shardDistance = distSq(camera.three.position.toArray(), center);

        // Don't throttle shards adjacent to the player, we want to make sure
        // they're always up-to-date, especially for edit latency.
        const priority = priorityForPosition(camera, center);

        const combinedMesh = throttledResources.cached(
          priority,
          "/terrain/combined_mesh",
          id
        );
        if (!combinedMesh) {
          return;
        }
        const [blockMesh, glassMesh, floraMesh, waterMesh] = combinedMesh;

        const destructionUniforms = this.destructionUniforms(id);
        // Render the block mesh.
        if (blockMesh) {
          updateBlocksMaterial(blockMesh.material, {
            ...defaultBlockMaterial,
            ...destructionUniforms,
          });
          blockMesh.material.wireframe = tweaks.showWireframe;
          ++numRenderedBlockShards.value;

          if (
            !tweaks.showStaleBlockShards ||
            !this.highlightOutOfDateShard("/terrain/block/mesh", id, scenes)
          ) {
            blockMeshes.push(blockMesh);
          }
        }

        // Render the glass mesh
        if (glassMesh) {
          updateGlassMaterial(glassMesh.material, {
            ...defaultGlassMaterial,
            ...destructionUniforms,
          });
          glassMesh.material.wireframe = tweaks.showWireframe;
          ++numRenderedGlassShards.value;

          if (
            !tweaks.showStaleGlassShards ||
            !this.highlightOutOfDateShard("/terrain/glass/mesh", id, scenes)
          ) {
            glassMeshes.push(glassMesh);
          }
        }

        // Render the flora mesh.
        if (floraMesh) {
          updateFloraMaterial(floraMesh.material, defaultFloraMaterial);
          if (settings.floraQuality === "low") {
            floraMesh.material.vertexShader =
              FloraLowQualityShaders.vertexShader;
          } else {
            floraMesh.material.vertexShader = FloraShaders.vertexShader;
          }
          floraMesh.material.wireframe = tweaks.showWireframe;
          ++numRenderedFloraShards.value;

          if (
            !tweaks.showStaleFloraShards ||
            !this.highlightOutOfDateShard("/terrain/flora/mesh", id, scenes)
          ) {
            floraMeshes.push(floraMesh);
          }
        }

        // Render the water mesh.
        if (waterMesh) {
          updateWaterMaterial(waterMesh.material, waterMaterial);
          waterMesh.material.wireframe = tweaks.showWireframe;
          waterMesh.renderOrder = shardDistance;
          waterMeshes.push(waterMesh);
          ++numRenderedWaterShards.value;
        }
      }

      // Render debug meshes if enabled.
      if (tweaks.showCollisionBoxes) {
        const boxes = this.resources.cached("/terrain/boxes_mesh", id);
        if (boxes) {
          addToScenes(scenes, boxes);
        }
      }
      if (tweaks.showShardBoundaries) {
        const shard = this.resources.cached("/terrain/shard_mesh", id);
        if (shard) {
          addToScenes(scenes, shard);
        }
      }
      if (tweaks.showOcclusionMask) {
        addToScenes(scenes, occlusionDebugMeshWriter.occlusionMesh.mesh);
      }
      if (tweaks.showOccluderMesh && i <= tweaks.occlusionMeshStep) {
        const mesh = this.resources.cached("/terrain/occluder_mesh", id);
        if (mesh) {
          addToScenes(scenes, mesh);
        }
      }
      if (
        tweaks.showEditedVoxels &&
        this.authManager.currentUser.hasSpecialRole("admin")
      ) {
        const boxes = this.resources.cached("/terrain/edits_debug_mesh", id);
        if (boxes) {
          addToScenes(scenes, boxes);
        }
      }
      if (
        tweaks.showPlacerVoxels &&
        this.authManager.currentUser.hasSpecialRole("admin")
      ) {
        const boxes = this.resources.cached("/terrain/placer_debug_mesh", id);
        if (boxes) {
          addToScenes(scenes, boxes);
        }
      }
      if (
        tweaks.showDanglingOccupancy &&
        this.authManager.currentUser.hasSpecialRole("admin")
      ) {
        const boxes = this.resources.cached(
          "/terrain/dangling_occupancy_mesh",
          id
        );
        if (boxes) {
          addToScenes(scenes, boxes);
        }
      }
      if (tweaks.showWaterSources) {
        const shard = this.resources.cached("/water/debug", id);
        if (shard) {
          addToScenes(scenes, shard);
        }
      }
    });

    // Render all of each type so that similar materials are rendered
    // consecutively to improve performance.
    for (const blockMesh of blockMeshes) {
      addToScene(scenes.base, blockMesh);
    }
    for (const floraMesh of floraMeshes) {
      addToScene(scenes.base, floraMesh);
    }
    for (const glassMesh of glassMeshes) {
      addToScene(scenes.translucent, glassMesh);
    }
    for (const waterMesh of waterMeshes) {
      addToScene(scenes.water, waterMesh);
    }
  }

  private destructionUniforms(
    shardId: ShardId
  ): Partial<BlocksUniforms & GlassUniforms> | undefined {
    const player = this.resources.get("/scene/local_player");
    const destroyShard = player.destroyInfo
      ? voxelShard(...player.destroyInfo.pos)
      : undefined;

    const destroyingMaterial = this.resources.cached(
      "/materials/destroying_material"
    );
    const shapingMaterial = this.resources.cached(
      "/materials/shaping_material"
    );

    // Populate the destruction animation uniforms.
    if (
      player.destroyInfo &&
      destroyShard &&
      destroyShard === shardId &&
      !player.destroyInfo.groupId &&
      destroyingMaterial &&
      shapingMaterial
    ) {
      let percentage = player.destroyInfo.percentage ?? 0;
      if (player.destroyInfo.finished) {
        if (player.destroyInfo.activeAction.action === "destroy") {
          percentage = 1.0;
        } else {
          percentage = 0.0;
        }
      }

      const ret = {
        ...getDestructionAnimationUniforms(
          player.destroyInfo.pos as Vec3,
          player.destroyInfo.activeAction.action === "destroy" &&
            player.destroyInfo.canDestroy
            ? percentage
            : -1,
          destroyingMaterial.numFrames
        ),

        ...getShapingAnimationUniforms(
          player.destroyInfo.pos as Vec3,
          player.destroyInfo.activeAction.action === "shape" ||
            player.destroyInfo.activeAction.action === "till"
            ? percentage
            : -1,
          shapingMaterial.numFrames
        ),
      };
      return ret;
    }
  }

  private highlightOutOfDateShard(
    path: Key<ClientResourcePaths>,
    id: ShardId,
    scenes: Scenes
  ) {
    if (
      this.resources.cachedVersion(path, id) == this.resources.version(path, id)
    ) {
      return false;
    }

    const shardMesh = this.resources.cached("/terrain/shard_mesh", id);
    if (shardMesh) {
      addToScenes(scenes, shardMesh);
    }
    return true;
  }
}

function getDestructionAnimationUniforms(
  pos: ReadonlyVec3,
  completion: number,
  frames: number
) {
  const frame =
    completion > 0 ? Math.floor(clamp(frames * completion, 0, frames - 1)) : -1;
  return {
    destroyPos: pos as Vec3,
    destroyTextureFrame: frame,
  };
}

function getShapingAnimationUniforms(
  pos: ReadonlyVec3,
  completion: number,
  frames: number
) {
  const frame =
    completion > 0 ? Math.floor(clamp(frames * completion, 0, frames - 1)) : -1;
  return {
    shapePos: pos as Vec3,
    shapeTextureFrame: frame,
  };
}
