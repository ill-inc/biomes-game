import type { LazyChange } from "@/server/shared/ecs/lazy";
import { BaseSpatialIndex } from "@/shared/ecs/spatial/base_spatial_index";

// Similar to SpatialIndex, but never uses full entities (and thus also
// cannot hve a check filter.
export class LazySpatialIndex extends BaseSpatialIndex {
  apply(change: LazyChange) {
    if (change.kind === "delete") {
      this.delete(change.id);
      return;
    }

    const id = change.entity.id;
    if (change.entity.box()) {
      const box = change.entity.box()!;
      this.updateVolume(id, [box.v0, box.v1]);
    } else if (change.entity.position()) {
      this.updatePosition(id, change.entity.position()!.v);
    }
  }
}
