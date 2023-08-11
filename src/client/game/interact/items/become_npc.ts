import { AttackDestroyInteractionError } from "@/client/game/interact/errors";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import type { ClientResources } from "@/client/game/resources/types";
import {
  revertBecomeTheNPC,
  stopBecomingTheNPC,
} from "@/client/game/scripts/become_npc";
import type { BiomesId } from "@/shared/ids";
import { pitchAndYaw, sub } from "@/shared/math/linear";
import type { Vec2 } from "@/shared/math/types";
import { fireAndForget } from "@/shared/util/async";

export class BecomeNPCItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly deps: InteractContext<
      | "resources"
      | "permissionsManager"
      | "events"
      | "gardenHose"
      | "userId"
      | "table"
    >
  ) {}

  onPrimaryDown(_itemInfo: ClickableItemInfo) {
    const becomeTheNPC = this.deps.resources.get("/scene/npc/become_npc");
    if (becomeTheNPC.kind === "active") {
      const robotComponent = this.deps.resources.get(
        "/ecs/c/robot_component",
        becomeTheNPC.entityId
      );

      if (robotComponent && becomeTheNPC.cannotPlaceReason) {
        throw new AttackDestroyInteractionError({
          kind: "message",
          message: becomeTheNPC.cannotPlaceReason,
        });
      }

      const orientationOverride = robotComponent
        ? getPlayerFacingOrientation(this.deps.resources, becomeTheNPC.entityId)
        : undefined;

      fireAndForget(stopBecomingTheNPC(this.deps, orientationOverride));
      return true;
    }

    return false;
  }

  onSecondaryDown() {
    const becomeNpc = this.deps.resources.get("/scene/npc/become_npc");
    if (becomeNpc.kind !== "active") {
      return false;
    }

    void revertBecomeTheNPC(this.deps);

    return true;
  }
}

function getPlayerFacingOrientation(
  resources: ClientResources,
  entityId: BiomesId
): Vec2 | undefined {
  const localPlayerId = resources.get("/scene/local_player").id;
  const playerPosition = resources.get("/ecs/c/position", localPlayerId);
  const robotPosition = resources.get("/ecs/c/position", entityId);

  if (!playerPosition || !robotPosition) {
    return undefined;
  }

  const towardsPlayer = sub(playerPosition.v, robotPosition.v);

  return pitchAndYaw(towardsPlayer);
}
