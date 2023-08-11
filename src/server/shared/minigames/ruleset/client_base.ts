import type { ClientContextSubset } from "@/client/game/context";
import type { ClientRuleSet } from "@/server/shared/minigames/ruleset/client_types";
import type { TweakableConfig } from "@/server/shared/minigames/ruleset/tweaks";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { lazy } from "@/shared/util/lazy";

export function buildMetagameRuleset(
  deps: ClientContextSubset<"userId" | "permissionsManager" | "resources">,
  tweaks: TweakableConfig
): ClientRuleSet {
  // Bit of a hack to keep a reference to the object around, it's safe as when the resource
  // is updated the object remains the same. This allows us to avoid a get() in the collision
  // filter.
  const localPlayer = lazy(() => deps.resources.get("/scene/local_player"));
  return {
    name: "metagame",
    tweaks,
    death: {
      type: "modal",
    },

    allowsBlockPickup: true,

    aclsForPosition(position: ReadonlyVec3) {
      return deps.permissionsManager.protectionAclsForPosition(position);
    },
    flying: (deps) => {
      const playerModifiers = deps.resources.get("/player/modifiers");
      const flyBuffEnabled = playerModifiers.fly.enabled;
      return (
        localPlayer().adminNoClip || localPlayer().adminFlying || flyBuffEnabled
      );
    },

    canUseItem: () => true,
    nameAugmentation: () => undefined,

    playerCollisionFilter: () => localPlayer().adminNoClip,
    canAttackPlayer: (aclAllows) => aclAllows,
    canInspectPlayer: () => true,
    playerShowsAsObserver: () => false,
  };
}

export function baseMinigameRuleset(base: ClientRuleSet): ClientRuleSet {
  return {
    ...base,
    name: "minigame",
    disabledHuds: ["challenges", "nux", "locationName"],
  };
}
