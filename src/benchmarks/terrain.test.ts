import { Camera } from "@/client/game/resources/camera";
import type { ClientResourcePaths } from "@/client/game/resources/types";
import type { TweakableConfig } from "@/server/shared/minigames/ruleset/tweaks";
import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import { BiomesResourcesBuilder } from "@/shared/resources/biomes";

describe("terrain benchmarks", () => {
  it("TerrainRenderer draw", async function () {
    const builder = new BiomesResourcesBuilder<
      ClientResourcePaths & TerrainResourcePaths
    >();

    // Mock the global window object which is assumed to exist by the Camera
    // constructor.
    global.window = { innerWidth: 1920, innerHeight: 1080 } as any;

    builder.addGlobal("/scene/camera", new Camera());

    // Don't enable some conditional debug logic inside of the draw() function
    // implementation.
    builder.addGlobal("/tweaks", {
      showCollisionBoxes: false,
      showShardBoundaries: false,
    } as any as TweakableConfig);

    // Generate a mock mesh for all shards. To cover the core logic of the
    // terrain draw() call we really just need any valid mesh, so create the
    // simplest possible mesh.
    // TODO: ADD THIS BENCHMARK BACK FOR THE BLOCK MESH CODE.
    /*
    builder.add(
      "/terrain/block/mesh",
      async function (_deps: ClientResourceDeps, shardId: string) {
        // Use the input shardId parameter a little bit so that we have the
        // results depend a little bit on the input parameters.
        const geometry = new THREE.BoxGeometry(shardId.length, 1, 1);
        const material = new THREE.RawShaderMaterial({
          uniforms: {
            time: { value: 1.0 },
          },
        });
        return {
          mesh: undefined, // The draw call doesn't need this field.
          three: new THREE.Mesh(geometry, material),
        } as any as TerrainMesh;
      }
    );

    const resources = builder.build();

    // This frustum sharder just returns the same set of shard ids every time
    // it's called.
    class MockFrustumSharder {
      constructor() {}

      get(
        _cameraPos: THREE.Vector3Tuple,
        _viewProj: THREE.Matrix4Tuple
      ): string[] {
        // The TerrainRenderer.draw call uses this value to determine how many
        // meshes to query for and "draw". The size of the returned array will
        // affect how many meshes are processed by each draw call.
        return [...Array(NUM_TERRAIN_SHARDS).keys()].map((x) =>
          (100000000 - x).toString()
        );
      }
    }
    const frustumSharder = new MockFrustumSharder();
    const shardIds = frustumSharder.get(
      resources.get("/scene/camera").pos(),
      resources.get("/scene/camera").viewProj()
    );

    // Warm up the terrain generation so that we're not benchmarking the
    // execution of the mesh creation.
    for (let i = 0; i < shardIds.length; ++i) {
      await resources.get("/scene/terrain/mesh", (100000000 - i).toString());
    }

    // Construct a TerrainRenderer with the minimal amount of initialization
    // necessary to run its draw() function.
    const terrainRenderer = new TerrainRenderer(
      undefined as any,
      resources,
      frustumSharder as any
    );

    // Gather many samples for each call to draw().
    const NUM_BENCHMARK_ITERATIONS = 10000;
    for (let i = 0; i < NUM_BENCHMARK_ITERATIONS; ++i) {
      const scene = new THREE.Scene();
      terrainRenderer.draw(scene);
      assert.equal(scene.children.length, NUM_TERRAIN_SHARDS);
    }
    */
  });
});
