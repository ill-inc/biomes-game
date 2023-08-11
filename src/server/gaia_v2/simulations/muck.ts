import { Simulation } from "@/server/gaia_v2/simulations/api";
import { shardAndNeighbors } from "@/server/gaia_v2/simulations/utils";
import type { GaiaReplica, TerrainShard } from "@/server/gaia_v2/table";
import { changeFromMuck } from "@/server/gaia_v2/terrain/emitter";
import { makeWorldMap } from "@/server/gaia_v2/terrain/world_map";
import { using } from "@/shared/deletable";
import type { Change } from "@/shared/ecs/change";
import type { ReadonlyEntityWith } from "@/shared/ecs/gen/entities";
import { Entity } from "@/shared/ecs/gen/entities";
import { UnmuckSourceSelector } from "@/shared/ecs/gen/selectors";
import type { ShardId } from "@/shared/game/shard";
import { SHARD_SHAPE, shardCenter, voxelShard } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import {
  add,
  centerAABB,
  dist,
  nearestGridPosition,
} from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import { compact } from "lodash";

const MAX_UNMUCKER_COUNT = 4;
const MAX_UNMUCKER_DISTANCE = 512;

export class MuckSimulation extends Simulation {
  private readonly unmuckers = new Map<BiomesId, ShardId>();

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica
  ) {
    super("muck");
    this.unmuckers = new Map(
      Array.from(
        this.replica.table.scan(UnmuckSourceSelector.query.all()),
        ({ id, position: { v } }) => [id, voxelShard(...v)]
      )
    );
  }

  invalidate(change: Change): ShardId[] {
    if (change.kind === "delete") {
      const unmucker = this.unmuckers.get(change.id);
      if (unmucker) {
        // It was a change to an umucker, so invalidate the shard it was in.
        this.unmuckers.delete(change.id);
        return [unmucker];
      }
      return [];
    }

    // If unmucker has been modified, invalidate the shard containing it.
    if (
      change.entity.unmuck !== undefined ||
      change.entity.position !== undefined
    ) {
      const entity = this.replica.table.get(change.entity.id);
      if (Entity.has(entity, "unmuck", "position")) {
        const shard = voxelShard(...entity.position.v);
        this.unmuckers.set(change.entity.id, shard);
        return [shard];
      } else {
        const lastKnownShard = this.unmuckers.get(change.entity.id);
        if (lastKnownShard) {
          this.unmuckers.delete(change.entity.id);
          return [lastKnownShard];
        }
      }
    } else if (change.entity.shard_muck) {
      const entity = this.replica.table.get(change.entity.id);
      if (Entity.has(entity, "box")) {
        // If a shard has been modified, invalidate it and its neighbors.
        return shardAndNeighbors(entity.box.v0);
      }
    }
    return [];
  }

  async update(shard: TerrainShard) {
    const shardId = voxelShard(...shard.box.v0);

    // Fetch all nearby muck-clearing entities.
    const unmucks = Array.from(
      this.replica.table.scan(
        UnmuckSourceSelector.query.spatial.inSphere(
          {
            center: centerAABB([shard.box.v0, shard.box.v1]),
            radius: MAX_UNMUCKER_DISTANCE,
          },
          {
            approx: true,
          }
        )
      )
    );

    // Filter to the nearest unmucks (based on field impact).
    const center = shardCenter(shardId);
    unmucks.sort((l, r) => {
      return impactDistance(center, l) - impactDistance(center, r);
    });
    unmucks.splice(MAX_UNMUCKER_COUNT);

    // Update the muck field for each unmuck entity.
    const muck = using(
      Tensor.make(this.voxeloo, SHARD_SHAPE, "U8"),
      (tensor) => {
        tensor.load(shard.shard_muck?.buffer);
        return makeWorldMap(this.voxeloo, tensor, shard.box.v0);
      }
    );
    try {
      const grad = Tensor.make(this.voxeloo, SHARD_SHAPE, "I32");
      grad.fill(CONFIG.gaiaV2MuckSimStepSize);
      try {
        for (const {
          position,
          unmuck: { volume, snapToGrid },
        } of unmucks) {
          const unmuckPos = nearestGridPosition(
            add(position.v, [0, 0.5, 0]),
            volume.kind === "box"
              ? volume.box
              : [volume.radius * 2, volume.radius * 2, volume.radius * 2],
            snapToGrid ?? 1
          );
          switch (volume.kind) {
            case "sphere":
              this.voxeloo.updateMuckGradientWithSphere(
                grad.cpp,
                muck,
                unmuckPos,
                volume.radius,
                CONFIG.gaiaV2MuckSimStepSize
              );
              break;
            case "box":
              this.voxeloo.updateMuckGradientWithAabb(
                grad.cpp,
                muck,
                unmuckPos,
                volume.box,
                CONFIG.gaiaV2MuckSimStepSize
              );
              break;
          }
        }
        this.voxeloo.applyMuckGradient(muck, grad.cpp);
      } finally {
        grad.delete();
      }

      // TODO: Remove the need to do this transformation here.
      return {
        changes: compact([changeFromMuck(this.voxeloo, this.replica, muck)]),
      };
    } finally {
      muck.delete();
    }
  }
}

function impactDistance(
  source: Vec3,
  { position, unmuck }: ReadonlyEntityWith<"position" | "unmuck">
) {
  switch (unmuck.volume.kind) {
    case "sphere":
      return dist(source, position.v) - unmuck.volume.radius;
    case "box":
      return Math.max(
        Math.abs(source[0] - position.v[0]) - 0.5 * unmuck.volume.box[0],
        Math.abs(source[1] - position.v[1]) - 0.5 * unmuck.volume.box[1],
        Math.abs(source[2] - position.v[2]) - 0.5 * unmuck.volume.box[2]
      );
  }
}
