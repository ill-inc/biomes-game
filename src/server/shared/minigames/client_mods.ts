import type { ClientMod } from "@/server/shared/minigames/types";
import type { MinigameType } from "@/shared/ecs/gen/types";

export type ClientMods = ClientMod[];
export function clientModFor(
  modules: ClientMods,
  minigameKind: MinigameType
): ClientMod {
  for (const mod of modules) {
    if (mod.kind === minigameKind) {
      return mod;
    }
  }

  throw new Error(
    `Unsupported module ${minigameKind}... did you add it to client bootstrap?`
  );
}
