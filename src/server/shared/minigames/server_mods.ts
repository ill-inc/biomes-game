import type { ServerMod } from "@/server/shared/minigames/types";
import type { MinigameType } from "@/shared/ecs/gen/types";

export type ServerMods = ServerMod[];

// To avoid circular deps, bootstrap.ts for population of this
export const ALL_SERVER_MODS: ServerMods = [];

export function serverModFor(
  minigameKind: MinigameType,
  mods = ALL_SERVER_MODS
): ServerMod {
  for (const mod of mods) {
    if (mod.kind === minigameKind) {
      return mod;
    }
  }

  throw new Error(
    `Unsupported module ${minigameKind}... did you run bootstrap or forget to add the handler?`
  );
}
