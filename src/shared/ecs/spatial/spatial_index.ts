import type { Create, Update } from "@/shared/ecs/change";
import type { Entity } from "@/shared/ecs/gen/entities";
import type { IndexQuery } from "@/shared/ecs/selectors/selector";
import { BaseSpatialIndex } from "@/shared/ecs/spatial/base_spatial_index";
import type {
  SpatialQueryOptions,
  SpatialQueryParams,
} from "@/shared/ecs/spatial/types";

import {
  changeMayAffectSize,
  getAabbForEntity,
} from "@/shared/game/entity_sizes";
import type { BiomesId } from "@/shared/ids";

export class SpatialIndex extends BaseSpatialIndex {
  constructor(
    private readonly check: (entity: Entity) => boolean = () => true,
    explicitTotalScanThreshold?: number
  ) {
    super(explicitTotalScanThreshold);
  }

  // Make it public for the index API.
  delete(id: BiomesId) {
    super.delete(id);
  }

  update(entity: Entity, change: Readonly<Create | Update> | undefined) {
    if (!this.check(entity)) {
      this.delete(entity.id);
      return;
    }

    if (entity.box && (!change || change.entity.box)) {
      this.updateVolume(entity.id, [entity.box.v0, entity.box.v1]);
    } else if (entity.position && (!change || changeMayAffectSize(change))) {
      const aabb = getAabbForEntity(entity, { extentsType: "collidable" });
      if (aabb) {
        this.updateVolume(entity.id, aabb);
      } else {
        this.updatePosition(entity.id, entity.position.v);
      }
    }
  }
}

export class SpatialIndexQuery<
  I extends string,
  C extends keyof Entity,
  MetaIndex extends { [K in I]: SpatialIndex } = {
    [K in I]: SpatialIndex;
  }
> implements IndexQuery<MetaIndex, C>
{
  readonly kind = "index";
  readonly components?: C;
  constructor(
    private readonly index: I,
    private readonly params: SpatialQueryParams,
    private readonly options?: SpatialQueryOptions
  ) {}

  *run(metaIndex: MetaIndex) {
    switch (this.params.kind) {
      case "all":
        yield* metaIndex[this.index].scanAll();
        break;
      case "aabb":
        yield* metaIndex[this.index].scanAabb(this.params.shape, this.options);
        break;
      case "sphere":
        yield* metaIndex[this.index].scanSphere(
          this.params.shape,
          this.options
        );
        break;
      case "point":
        yield* metaIndex[this.index].scanPoint(this.params.shape, this.options);
        break;
    }
  }

  size(metaIndex: MetaIndex) {
    return metaIndex[this.index].size;
  }
}
