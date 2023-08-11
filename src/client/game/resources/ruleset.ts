import type { ClientContext, ClientContextSubset } from "@/client/game/context";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type { TweaksReadResponse } from "@/pages/api/tweaks";
import { clientModFor } from "@/server/shared/minigames/client_mods";
import {
  baseMinigameRuleset,
  buildMetagameRuleset,
} from "@/server/shared/minigames/ruleset/client_base";
import type { ClientRuleSet } from "@/server/shared/minigames/ruleset/client_types";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { jsonFetch } from "@/shared/util/fetch_helpers";

export function genCurrentRuleset(
  loaderDeps: ClientContextSubset<"userId" | "clientMods">,
  deps: ClientResourceDeps
): ClientRuleSet {
  const { userId, clientMods } = loaderDeps;
  const metagameRuleset = deps.get("/ruleset/metagame");
  const activeMinigame = deps.get("/ecs/c/playing_minigame", userId);
  if (activeMinigame) {
    const minigameInstance = deps.get(
      "/ecs/c/minigame_instance",
      activeMinigame.minigame_instance_id
    );
    const minigameMetadata = deps.get(
      "/ecs/c/minigame_component",
      activeMinigame.minigame_id
    );

    if (!minigameInstance || !minigameMetadata) {
      log.warn(
        "Player has an active minigame but metadata / instance not synced! Defaulting to metagame rules",
        {
          minigameId: activeMinigame.minigame_id,
        }
      );
      return metagameRuleset;
    }

    return clientModFor(
      clientMods,
      minigameInstance.state.kind
    ).buildMinigameRuleset(
      loaderDeps,
      baseMinigameRuleset(metagameRuleset),
      minigameMetadata,
      minigameInstance,
      activeMinigame.minigame_instance_id
    );
  }

  return metagameRuleset;
}

export function genTweaks(deps: ClientResourceDeps) {
  const currentRuleset = deps.get("/ruleset/current");
  return currentRuleset.tweaks;
}

const clientReadTweakableConfig = async () => {
  const res = await jsonFetch<TweaksReadResponse>("/api/tweaks");
  return res.tweaks;
};

export async function addRulesetResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  const metaTweaks = await clientReadTweakableConfig();
  builder.addGlobal(
    "/ruleset/metagame",
    loader.provide(buildMetagameRuleset)(metaTweaks)
  );
  builder.add("/ruleset/current", loader.provide(genCurrentRuleset));
  builder.add("/tweaks", genTweaks);
}
