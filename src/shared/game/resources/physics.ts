import { using } from "@/shared/deletable";
import { makeDisposable } from "@/shared/disposable";
import type { BlockResourcePaths } from "@/shared/game/resources/blocks";
import type { FloraResourcePaths } from "@/shared/game/resources/florae";
import type { GlassResourcePaths } from "@/shared/game/resources/glass";
import type { ShardId } from "@/shared/game/shard";
import { worldPos } from "@/shared/game/shard";
import { timeCode } from "@/shared/metrics/performance_timing";
import type { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { PathDef } from "@/shared/resources/path_map";
import type {
  TypedResourceDeps,
  TypedResources,
} from "@/shared/resources/types";
import type { Optional } from "@/shared/util/type_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { BoxDict } from "@/shared/wasm/types/galois";

interface PhysicsOnlyResourcePaths {
  "/physics/boxes": PathDef<[ShardId], Optional<BoxDict>>;
}

export type PhysicsResourcePaths = PhysicsOnlyResourcePaths &
  BlockResourcePaths &
  GlassResourcePaths &
  FloraResourcePaths;
export type PhysicsResourceDeps = TypedResourceDeps<PhysicsResourcePaths>;

function genBoxes(
  voxeloo: VoxelooModule,
  deps: PhysicsResourceDeps,
  shardId: ShardId
) {
  // If the terrain isn't yet loaded for this shard, we immediately return an
  // undefined value. This allows us to stall physics for this shard until the
  // data is loaded and the collision structures are ready.
  if (!deps.get("/ecs/terrain", shardId)) {
    return;
  }

  const ret = using(new voxeloo.BoxList(), (out) => {
    const shapeIndex = deps.get("/terrain/shape/index");
    const floraIndex = deps.get("/terrain/flora/index");

    const pos = worldPos(shardId);

    // Add the colliding florae into the box structure.
    const florae = deps.get("/terrain/flora/tensor", shardId);
    if (florae) {
      timeCode("physics:toFloraBlockList", () => {
        using(voxeloo.toFloraBoxList(floraIndex, florae.cpp, pos), (boxes) => {
          out.merge(boxes);
        });
      });
    }

    // Add the shaped blocks into the box structure.
    const blockShapes = deps.get("/terrain/block/isomorphisms", shardId);
    if (blockShapes) {
      timeCode("physics:blocks:toIsomorphismBlockList", () => {
        using(
          voxeloo.toIsomorphismBoxList(shapeIndex, blockShapes.cpp, pos),
          (boxes) => {
            out.merge(boxes);
          }
        );
      });
    }

    // Add the shaped glass into the box structure.
    const glassShapes = deps.get("/terrain/glass/isomorphisms", shardId);
    if (glassShapes) {
      timeCode("physics:glass:toIsomorphismBlockList", () => {
        using(
          voxeloo.toIsomorphismBoxList(shapeIndex, glassShapes, pos),
          (boxes) => {
            out.merge(boxes);
          }
        );
      });
    }

    return timeCode("physics:toDict", () => {
      return out.toDict();
    });
  });

  return makeDisposable(ret, () => ret.delete());
}

export type PhysicsResources = TypedResources<PhysicsResourcePaths>;
type PhysicsResourcesBuilder = BiomesResourcesBuilder<PhysicsResourcePaths>;

export function addSharedPhysicsResources(
  voxeloo: VoxelooModule,
  builder: PhysicsResourcesBuilder
) {
  builder.add("/physics/boxes", (deps, shard) =>
    genBoxes(voxeloo, deps, shard)
  );
}
