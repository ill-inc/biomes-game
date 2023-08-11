import { deathMatchServerMod } from "@/server/shared/minigames/deathmatch/server_mod";
import type { ServerMods } from "@/server/shared/minigames/server_mods";
import { ALL_SERVER_MODS } from "@/server/shared/minigames/server_mods";
import { simpleRaceServerMod } from "@/server/shared/minigames/simple_race/server_mod";
import { spleefServerMod } from "@/server/shared/minigames/spleef/server_mod";
import { log } from "@/shared/logging";

export function bootstrapServerMods(): ServerMods {
  if (ALL_SERVER_MODS.length === 0) {
    log.debug("Bootstrapping server mods...");
    ALL_SERVER_MODS.push(
      deathMatchServerMod,
      simpleRaceServerMod,
      spleefServerMod
    );
  }

  return ALL_SERVER_MODS;
}

// This modifies a global because server handlers currently do not support dependency injection
export async function registerServerMods() {
  return bootstrapServerMods();
}
