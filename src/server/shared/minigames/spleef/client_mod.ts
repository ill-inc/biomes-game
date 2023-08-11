import { SpleefClientScript } from "@/server/shared/minigames/spleef/client_script";
import { zSpleefSettings } from "@/server/shared/minigames/spleef/types";
import { parseMinigameSettings } from "@/server/shared/minigames/type_utils";
import type { ClientMod } from "@/server/shared/minigames/types";
import type { ReadonlyMinigameInstance } from "@/shared/ecs/gen/components";
import type { AclAction } from "@/shared/ecs/gen/types";
import type { ReadonlyIndexedAcl } from "@/shared/game/acls_base";
import { boxToAabb } from "@/shared/game/group";
import type { BiomesId } from "@/shared/ids";
import { inclusiveContainsAABB } from "@/shared/math/linear";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";

function isObserver(
  state: ReadonlyMinigameInstance["state"],
  playerId: BiomesId
) {
  ok(state.kind === "spleef");
  let isObserver: boolean;
  switch (state.instance_state.kind) {
    case "round_countdown":
      isObserver = true;
      break;

    case "waiting_for_players":
      isObserver = true;
      break;

    case "playing_round":
      isObserver = !state.instance_state.alive_round_players.has(playerId);
      break;

    default:
      assertNever(state.instance_state);
      throw new Error("Bad");
  }

  return isObserver;
}

const SPLEEF_GAME_ACL: ReadonlyIndexedAcl = {
  id: 15156345 as BiomesId,
  teams: new Map(),
  entities: new Map(),
  roles: new Map(),
  everyone: new Set<AclAction>(["destroy", "place", "interact", "apply_buffs"]),
  creator: undefined,
  creatorTeam: undefined,
};

export const spleefClientMod: ClientMod<"spleef"> = {
  kind: "spleef",
  settingsType: zSpleefSettings,
  makeClientScript(deps, minigameId, minigameInstanceId) {
    return new SpleefClientScript(deps, minigameId, minigameInstanceId);
  },
  buildMinigameRuleset(
    deps,
    base,
    minigameComponent,
    minigameInstance,
    minigameInstanceId
  ) {
    ok(minigameComponent.metadata.kind === "spleef");
    ok(minigameInstance.state.kind === minigameComponent.metadata.kind);

    const settings = parseMinigameSettings(
      minigameComponent.minigame_settings,
      zSpleefSettings
    );

    const regionAABB =
      minigameInstance.space_clipboard &&
      boxToAabb(minigameInstance.space_clipboard.region.box);

    return {
      ...base,
      name: "spleef",
      death: {
        type: "autospawn",
        destination: {
          kind: "minigame",
        },
      },

      aclsForPosition(position) {
        if (isObserver(minigameInstance.state, deps.userId)) {
          return [];
        }

        if (regionAABB) {
          if (inclusiveContainsAABB(regionAABB, position)) {
            return [SPLEEF_GAME_ACL];
          } else {
            return [];
          }
        }

        return base.aclsForPosition(position);
      },

      nameAugmentation(player) {
        if (!player?.player_status) {
          return base.nameAugmentation(player);
        }

        if (isObserver(minigameInstance.state, player.id)) {
          return "Observer";
        }

        if (
          player.playing_minigame?.minigame_instance_id !== minigameInstanceId
        ) {
          return "Non-player";
        }

        return base.nameAugmentation(player);
      },

      playerCollisionFilter: (hit, entity) => {
        const filtered = base.playerCollisionFilter(hit, entity);
        if (filtered) {
          return true;
        }

        if (!entity?.player_status) {
          return false;
        }

        if (
          (!settings.allowPlayerCollision && settings.gameMode !== "tag") ||
          isObserver(minigameInstance.state, deps.userId) ||
          isObserver(minigameInstance.state, entity.id)
        ) {
          return true;
        }

        return false;
      },

      canInspectPlayer: () => {
        return isObserver(minigameInstance.state, deps.userId);
      },

      playerShowsAsObserver: (player) => {
        if (
          player.playing_minigame?.minigame_instance_id === minigameInstanceId
        ) {
          return isObserver(minigameInstance.state, player.id);
        }

        return true;
      },

      allowsBlockPickup: false,

      canUseItem: (item) => {
        if (isObserver(minigameInstance.state, deps.userId)) {
          return item?.action === "photo";
        }
        return base.canUseItem(item);
      },

      flying: () => {
        return isObserver(minigameInstance.state, deps.userId);
      },
    };
  },
};
