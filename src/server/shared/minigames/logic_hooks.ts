import { serverModFor } from "@/server/shared/minigames/server_mods";
import type { Delta } from "@/shared/ecs/gen/delta";
import type {
  OptionalDamageSource,
  WarpHomeReason,
} from "@/shared/ecs/gen/types";

export function onWarpHomeHook(
  player: Delta,
  activeMinigameInstance: Delta | undefined,
  reason: WarpHomeReason
) {
  const instanceState = activeMinigameInstance?.minigameInstance();
  if (!activeMinigameInstance || !instanceState) {
    return;
  }

  const mod = serverModFor(instanceState.state.kind);
  mod.logicHooks.onWarpHome?.({
    player,
    activeMinigameInstance,
    reason,
  });
}

export function onPlayerDeathHook(
  player: Delta,
  activeMinigame: Delta | undefined,
  activeMinigameInstance: Delta | undefined,
  damageSource: OptionalDamageSource
) {
  const instanceState = activeMinigameInstance?.minigameInstance();
  if (!activeMinigameInstance || !activeMinigame || !instanceState) {
    return;
  }

  const mod = serverModFor(instanceState.state.kind);
  mod.logicHooks.onPlayerDeath?.({
    player,
    activeMinigame,
    activeMinigameInstance,
    damageSource,
  });
}
