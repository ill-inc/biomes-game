import { Simulation } from "@/server/gaia_v2/simulations/api";
import {
  receptiveField,
  shardAndNeighbors,
} from "@/server/gaia_v2/simulations/utils";
import type { GaiaReplica, TerrainShard } from "@/server/gaia_v2/table";
import { changeFromIrradiance } from "@/server/gaia_v2/terrain/emitter";
import { DeletableScope } from "@/shared/deletable";
import type { Change } from "@/shared/ecs/change";
import { Entity } from "@/shared/ecs/gen/entities";
import { LightSourceSelector } from "@/shared/ecs/gen/selectors";
import type { ShardId } from "@/shared/game/shard";
import { SHARD_SHAPE } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { rgbaToNumber } from "@/shared/math/colors";
import { add, containsAABB, floor, scale, sub } from "@/shared/math/linear";
import type { AABB, ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { Tensor, TensorUpdate } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { GaiaTerrainMapV2 } from "@/shared/wasm/types/gaia";
import { compact } from "lodash";

const RECEPTIVE_FIELD: ReadonlyVec3 = [16, 16, 16];
const DOMAIN_SHAPE = add(scale(2, RECEPTIVE_FIELD), SHARD_SHAPE);

export class IrradianceSimulation extends Simulation {
  private sources: Map<BiomesId, Vec3> = new Map();

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: GaiaReplica,
    private readonly map: GaiaTerrainMapV2
  ) {
    super("irradiance");
    this.sources = new Map(
      Array.from(
        this.replica.table.scan(LightSourceSelector.query.all()),
        ({ id, position: { v } }) => [id, [...v]]
      )
    );
  }

  invalidate(change: Change): ShardId[] {
    // Only relevant deletions are deleted irradiance sources.
    if (change.kind === "delete") {
      const source = this.sources.get(change.id);
      if (source) {
        this.sources.delete(change.id);
        return receptiveField(source, RECEPTIVE_FIELD);
      } else {
        return [];
      }
    }

    // Handle updated terrain shards over light-affecting components.
    // TODO(tg): We can substantially optimize this invalidation code here by
    // identifying the individual positions that have been updated. Doing so
    // would reduce the receptive field from 27 shards to at most 8.
    if (
      change.entity.shard_seed ||
      change.entity.shard_diff ||
      change.entity.shard_shapes ||
      change.entity.shard_dye ||
      change.entity.shard_growth
    ) {
      const entity = this.replica.table.get(change.entity.id);
      if (Entity.has(entity, "box")) {
        return shardAndNeighbors(entity.box.v0);
      } else {
        return [];
      }
    }

    // Handle updated or added irradiance sources.
    const ret = new Set<ShardId>();

    // Push shards pertaining to the previous location.
    const source = this.sources.get(change.entity.id);
    if (source) {
      receptiveField(source, RECEPTIVE_FIELD).forEach((id) => ret.add(id));
    }

    // Push shards pertaining to the current location.
    const entity = this.replica.table.get(change.entity.id);
    if (Entity.has(entity, "position", "irradiance", "locked_in_place")) {
      this.sources.set(entity.id, [...entity.position.v]);
      receptiveField(entity.position.v, RECEPTIVE_FIELD).forEach((id) =>
        ret.add(id)
      );
    }

    return Array.from(ret);
  }

  async update(shard: TerrainShard) {
    // Define an AABB over the causal domain for this shard.
    const domain: AABB = [
      sub(shard.box.v0, RECEPTIVE_FIELD),
      add(shard.box.v1, RECEPTIVE_FIELD),
    ];

    // Fetch all nearby entities with irradiance.
    const sources = Array.from(
      this.replica.table.scan(LightSourceSelector.query.spatial.inAabb(domain))
    );

    const scope = new DeletableScope();
    try {
      const sourcesTensor = scope.use(
        Tensor.make(this.voxeloo, DOMAIN_SHAPE, "U32")
      );

      // Write the light sources into the tensor.
      const update = new TensorUpdate(sourcesTensor);
      for (const { position, irradiance } of sources) {
        if (containsAABB(domain, position.v)) {
          update.set(
            floor(sub(position.v, domain[0])),
            rgbaToNumber([...irradiance.color, irradiance.intensity])
          );
        }
      }
      update.apply();

      // Generate the output irradiance tensor.
      const map = scope.use(
        this.voxeloo.updateIrradiance(this.map, shard.box.v0, sourcesTensor.cpp)
      );
      return {
        changes: compact([
          changeFromIrradiance(this.voxeloo, this.replica, map),
        ]),
      };
    } finally {
      scope.delete();
    }
  }
}
