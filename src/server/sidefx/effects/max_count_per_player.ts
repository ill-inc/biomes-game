import { GameEvent } from "@/server/shared/api/game_event";
import type { LogicApi } from "@/server/shared/api/logic";
import type { SimpleSideEffectContext } from "@/server/sidefx/simple_side_effect";
import { SimpleSideEffect } from "@/server/sidefx/simple_side_effect";
import type { SideFxReplica } from "@/server/sidefx/table";
import type { Change } from "@/shared/ecs/change";
import type { Delta } from "@/shared/ecs/gen/delta";
import { DestroyPlaceableEvent } from "@/shared/ecs/gen/events";
import { PlaceablesByCreatorIdSelector } from "@/shared/ecs/gen/selectors";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { filterIterable } from "@/shared/util/collections";
import type { VoxelooModule } from "@/shared/wasm/types";

export class MaxCountPerPlayerSideEffect extends SimpleSideEffect {
  deletedEntities = new Set<BiomesId>();
  constructor(
    voxeloo: VoxelooModule,
    private readonly replica: SideFxReplica,
    private readonly logicApi: LogicApi
  ) {
    super("maxCountPerPlayer", voxeloo, replica.table, ["placeable_component"]);
  }

  override isChangeRelevant(change: Change): boolean {
    if (change.kind !== "create") {
      return false;
    }
    const item = anItem(change.entity.placeable_component?.item_id);
    return !!item?.maxCountPerPlayer;
  }

  handleChange(
    _context: SimpleSideEffectContext,
    id: BiomesId,
    entity: Delta | undefined
  ) {
    const item = anItem(entity?.placeableComponent()?.item_id);
    if (!item || !item.maxCountPerPlayer) {
      return;
    }
    const itemId = item.id;
    const creatorId = entity?.createdBy()?.id;
    const otherPlaceables = [
      ...filterIterable(
        this.replica.table.scan(
          PlaceablesByCreatorIdSelector.query.key(creatorId)
        ),
        (placeable) =>
          placeable.placeable_component.item_id === itemId &&
          placeable.id !== id &&
          !this.deletedEntities.has(placeable.id) &&
          placeable.iced === undefined
      ),
    ];
    const placeablesToDelete =
      item.maxCountPerPlayer === 1
        ? otherPlaceables
        : otherPlaceables
            .sort((a, b) => a.created_by.created_at - b.created_by.created_at)
            .slice(0, otherPlaceables.length - item.maxCountPerPlayer + 1);
    const deletedIds: BiomesId[] = [];
    const events = placeablesToDelete.map((placeable) => {
      deletedIds.push(placeable.id);
      return new GameEvent(
        entity?.createdBy()?.id || INVALID_BIOMES_ID,
        new DestroyPlaceableEvent({
          id: placeable.id,
          user_id: creatorId,
          expired: true,
        })
      );
    });

    for (const id of deletedIds) {
      this.deletedEntities.add(id);
    }
    void this.logicApi.publish(...events).then(() => {
      for (const id of deletedIds) {
        this.deletedEntities.delete(id);
      }
    });
  }
}
