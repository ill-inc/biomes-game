import type { ClientMods } from "@/server/shared/minigames/client_mods";
import { deathmatchClientMod } from "@/server/shared/minigames/deathmatch/client_mod";
import { simpleRaceClientMod } from "@/server/shared/minigames/simple_race/client_mod";
import { spleefClientMod } from "@/server/shared/minigames/spleef/client_mod";

export async function loadClientMods(): Promise<ClientMods> {
  return [deathmatchClientMod, simpleRaceClientMod, spleefClientMod];
}
