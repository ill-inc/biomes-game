import { zSimpleRaceSettings } from "@/server/shared/minigames/simple_race/types";

import { SimpleRaceClientScript } from "@/server/shared/minigames/simple_race/client_script";
import type { ClientMod } from "@/server/shared/minigames/types";
import { ALL_ACTIONS } from "@/shared/acl_types";
import { RestartSimpleRaceMinigameEvent } from "@/shared/ecs/gen/events";
import type { AclAction } from "@/shared/ecs/gen/types";
import type { ReadonlyIndexedAcl } from "@/shared/game/acls_base";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { filterSet } from "@/shared/util/collections";

const SIMPLE_RACE_ACL: ReadonlyIndexedAcl = {
  id: 15156345 as BiomesId,
  entities: new Map(),
  roles: new Map(),
  everyone: new Set(
    filterSet(
      ALL_ACTIONS,
      (e) => !(<AclAction[]>["apply_buffs", "warp_from"]).includes(e)
    )
  ),
  teams: new Map(),
  creator: undefined,
  creatorTeam: undefined,
};

export const simpleRaceClientMod: ClientMod<"simple_race"> = {
  kind: "simple_race",
  settingsType: zSimpleRaceSettings,
  makeClientScript(deps, minigameId, minigameInstanceId) {
    return new SimpleRaceClientScript(deps, minigameId, minigameInstanceId);
  },
  escapeActions: (deps, minigameId, minigameInstanceId) => {
    const label = deps.resources.get("/ecs/c/label", minigameId);
    return [
      {
        name: label ? `Retry ${label.text}` : "Retry Race",
        onClick: () => {
          fireAndForget(
            deps.events.publish(
              new RestartSimpleRaceMinigameEvent({
                id: deps.userId,
                minigame_id: minigameId,
                minigame_instance_id: minigameInstanceId,
              })
            )
          );
        },
      },
    ];
  },
  buildMinigameRuleset(
    _deps,
    base,
    _minigameComponent,
    _minigameInstance,
    _minigameInstanceId
  ) {
    return {
      ...base,
      name: "simple_race",
      playerCollisionFilter: (hit, entity) => {
        if (entity?.player_status) {
          return true;
        }
        const filtered = base.playerCollisionFilter(hit, entity);
        return filtered;
      },
      aclsForPosition(position) {
        return [...base.aclsForPosition(position), SIMPLE_RACE_ACL];
      },
      flying: () => {
        return false;
      },
      death: {
        type: "autospawn",
        destination: {
          kind: "minigame",
        },
      },
    };
  },
};
