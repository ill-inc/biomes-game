import {
  minigameStashEntityIdForPlayerId,
  removePlayerFromMinigameInstance,
} from "@/server/shared/minigames/util";
import type { SimpleSideEffectContext } from "@/server/sidefx/simple_side_effect";
import { SimpleSideEffect } from "@/server/sidefx/simple_side_effect";
import type { SideFxTable } from "@/server/sidefx/table";
import type { Change } from "@/shared/ecs/change";
import type { Delta } from "@/shared/ecs/gen/delta";
import type { BiomesId } from "@/shared/ids";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";

export class IcedSideEffect extends SimpleSideEffect {
  constructor(voxeloo: VoxelooModule, table: SideFxTable) {
    super("iced", voxeloo, table, ["iced"]);
  }

  override isChangeRelevant(change: Change): boolean {
    return change.kind !== "delete" && !!change.entity.iced;
  }

  handleChange(
    context: SimpleSideEffectContext,
    _id: BiomesId,
    entity: Delta | undefined
  ) {
    if (!entity?.remoteConnection() || !entity?.playingMinigame()) {
      // Not a player in a minigame.
      return;
    }
    const minigame = context.get(entity.playingMinigame()!.minigame_id);
    const minigameInstance = context.get(
      entity.playingMinigame()!.minigame_instance_id
    );
    if (
      !minigame?.has("minigame_component") ||
      !minigameInstance?.has("minigame_instance")
    ) {
      entity.clearPlayingMinigame();
      return;
    }
    const stashId = minigameStashEntityIdForPlayerId(
      minigameInstance.minigameInstance(),
      entity.id
    );
    const stashEntity = stashId && context.get(stashId);
    ok(stashEntity?.has("stashed"));
    removePlayerFromMinigameInstance(
      entity,
      stashEntity,
      minigame,
      minigameInstance,
      context
    );
  }
}
