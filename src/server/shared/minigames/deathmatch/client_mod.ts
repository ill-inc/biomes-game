import { zDeathmatchSettings } from "@/server/shared/minigames/deathmatch/types";
import type { ClientMod } from "@/server/shared/minigames/types";
import { ok } from "assert";

export const deathmatchClientMod: ClientMod<"deathmatch"> = {
  kind: "deathmatch",
  settingsType: zDeathmatchSettings,
  buildMinigameRuleset(
    _deps,
    base,
    minigameComponent,
    minigameInstance,
    minigameInstanceId
  ) {
    ok(minigameComponent.metadata.kind === "deathmatch");
    ok(minigameInstance.state.kind === minigameComponent.metadata.kind);
    return {
      ...base,
      name: "deathmatch",
      death: {
        type: "autospawn",
        destination: {
          kind: "minigame",
        },
      },
      flying: () => {
        return false;
      },
      canAttackPlayer: (aclAllows, source, target) => {
        if (
          source.playing_minigame &&
          source.playing_minigame.minigame_instance_id === minigameInstanceId &&
          source.playing_minigame.minigame_instance_id ===
            target.playing_minigame?.minigame_instance_id
        ) {
          ok(minigameInstance.state.kind === "deathmatch");
          ok(minigameInstance.state.kind === minigameComponent.metadata.kind);
          return minigameInstance.state.instance_state?.kind === "playing";
        }

        return aclAllows;
      },
    };
  },
};
