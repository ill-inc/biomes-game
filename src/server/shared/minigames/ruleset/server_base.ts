import type { ServerRuleset } from "@/server/shared/minigames/ruleset/server_types";
import { blockPos } from "@/shared/game/shard";

export function buildMetagameServerRuleset(): ServerRuleset {
  return {
    name: "metagame",

    overrideAcl() {
      return undefined;
    },

    canDropAt(terrain, worldPos) {
      const shardPos = blockPos(...worldPos);
      return !terrain.farming.get(...shardPos);
    },
  };
}

export function baseMinigameServerRuleset(base: ServerRuleset): ServerRuleset {
  return {
    ...base,
    name: "minigame",
  };
}
