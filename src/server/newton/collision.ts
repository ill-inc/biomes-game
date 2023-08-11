import type { NewtonReplica } from "@/server/newton/table";
import { DeletableScope, using } from "@/shared/deletable";
import type { ReadonlyChanges } from "@/shared/ecs/change";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { TerrainShardSelector } from "@/shared/ecs/gen/selectors";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { ListenerKey } from "@/shared/events";
import type { Boxes } from "@/shared/game/collision";
import { CollisionHelper } from "@/shared/game/collision";
import { toIsomorphismId } from "@/shared/game/ids";
import { loadFloraIndex } from "@/shared/game/resources/florae";
import { loadShapeIndex } from "@/shared/game/resources/isomorphisms";
import type { ShardId } from "@/shared/game/shard";
import { voxelShard, worldPos } from "@/shared/game/shard";
import { loadTerrain } from "@/shared/game/terrain";
import type { BiomesId } from "@/shared/ids";
import { centerAABB } from "@/shared/math/linear";
import type { AABB } from "@/shared/math/types";
import type { CollisionIndex, HitFn } from "@/shared/physics/types";
import type { RegistryLoader } from "@/shared/registry";
import { ShadowMap } from "@/shared/util/shadow_map";
import { loadBlockWrapper } from "@/shared/wasm/biomes";
import type { VoxelooModule } from "@/shared/wasm/types";
import type {
  BoxDict,
  FloraIndex,
  ShapeIndex,
} from "@/shared/wasm/types/galois";

function shardForTerrainEntity(entity: ReadonlyEntity): ShardId {
  return voxelShard(...centerAABB([entity.box!.v0, entity.box!.v1]));
}

// Simplified version of the resource system from the client that only
// keeps the leaf output (the collision info per-shard) to save on
// overall memory.
export class ServerCollisionSpace {
  private listenerKey?: ListenerKey;
  private shapeIndex?: ShapeIndex;
  private floraIndex?: FloraIndex;
  private readonly boxesByShard = new ShadowMap<ShardId, BoxDict>();

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: NewtonReplica
  ) {}

  async start() {
    [this.shapeIndex, this.floraIndex] = await Promise.all([
      loadShapeIndex(this.voxeloo),
      loadFloraIndex(this.voxeloo),
    ]);
    this.listenerKey = this.replica.on("tick", this.onTick.bind(this));
  }

  private onTick(changes: ReadonlyChanges) {
    for (const change of changes) {
      if (change.kind === "delete") {
        continue;
      }
      const entity = this.replica.table.get(change.entity.id);
      if (!entity?.shard_seed) {
        continue;
      }
      const shardId = shardForTerrainEntity(entity);
      const [existing, ok] = this.boxesByShard.get(shardId);
      if (ok) {
        this.boxesByShard.delete(shardId);
        if (existing) {
          existing.delete();
        }
      }
    }
  }

  stop() {
    if (this.listenerKey) {
      this.replica.off("tick", this.listenerKey);
    }
  }

  private boxesForTerrainEntity(
    shardId: ShardId,
    entity: ReadonlyEntity
  ): BoxDict | undefined {
    const scope = new DeletableScope();
    try {
      const tensor = scope.use(loadTerrain(this.voxeloo, entity));
      if (!tensor) {
        return;
      }

      const floraTensor = scope.use(this.voxeloo.toFloraTensor(tensor.cpp));
      const blockTensor = scope.use(this.voxeloo.toBlockTensor(tensor.cpp));

      const shapeTensor = scope.new(this.voxeloo.SparseBlock_U32);
      loadBlockWrapper(this.voxeloo, shapeTensor, entity.shard_shapes);

      const isomorphismTensor = scope.use(
        this.voxeloo.toIsomorphismTensor(shapeTensor)
      );

      const isomorphisms = scope.use(
        this.voxeloo.toMergedIsomorphismTensor(
          blockTensor,
          isomorphismTensor,
          toIsomorphismId(1, 0)
        )
      );

      const pos = worldPos(shardId);

      return using(new this.voxeloo.BoxList(), (boxes) => {
        if (this.floraIndex) {
          using(
            this.voxeloo.toFloraBoxList(this.floraIndex, floraTensor, pos),
            (floraBoxes) => boxes.merge(floraBoxes)
          );
        }
        if (this.shapeIndex) {
          using(
            this.voxeloo.toIsomorphismBoxList(
              this.shapeIndex,
              isomorphisms,
              pos
            ),
            (shapeBoxes) => boxes.merge(shapeBoxes)
          );
        }
        return boxes.toDict();
      });
    } finally {
      scope.delete();
    }
  }

  private getBoxes(shardId: ShardId): Boxes | undefined {
    const [existing, ok] = this.boxesByShard.get(shardId);
    if (ok) {
      return existing;
    }
    const entity = this.replica.table.get(
      TerrainShardSelector.query.key(shardId)
    );
    if (!entity) {
      return;
    }
    const boxes = this.boxesForTerrainEntity(shardId, entity);
    this.boxesByShard.set(shardId, boxes);
    return boxes;
  }

  forPhysics(id: BiomesId): CollisionIndex {
    return (aabb: AABB, fn: HitFn) => {
      return CollisionHelper.intersect(
        (id) => this.getBoxes(id),
        this.replica.table,
        this.replica.table.get(WorldMetadataId)!.world_metadata!,
        aabb,
        (hit: AABB, entity?: ReadonlyEntity) => {
          // Avoid self-intersections.
          if (!entity || entity.id !== id) {
            return fn(hit);
          }
        }
      );
    };
  }
}

export async function registerCollisionSpace<
  C extends { newtonReplica: NewtonReplica; voxeloo: VoxelooModule }
>(loader: RegistryLoader<C>) {
  const [voxeloo, newtonReplica] = await Promise.all([
    loader.get("voxeloo"),
    loader.get("newtonReplica"),
  ]);
  return new ServerCollisionSpace(voxeloo, newtonReplica);
}
