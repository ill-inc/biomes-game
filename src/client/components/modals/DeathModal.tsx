import {
  removeCanvasEffectOfId,
  setCanvasEffect,
} from "@/client/components/canvas_effects";
import { makeDeathReason } from "@/client/components/chat/DeathMessageView";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { ChromelessModal } from "@/client/components/modals/ChromelessModal";

import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import type { WarpHomeLocationDisplay } from "@/client/game/util/death";
import { useValidResurrectionLocations } from "@/client/game/util/death";
import { respawn } from "@/client/game/util/warping";
import { BikkieIds } from "@/shared/bikkie/ids";
import { convertDamageSourceToDeathReason } from "@/shared/chat/death_message";
import { anItem } from "@/shared/game/item";
import { bagCount } from "@/shared/game/items";
import { formatCurrency } from "@/shared/util/view_helpers";
import { animate } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

const autoRespawnDurationSeconds = 15;

export const DeathModal: React.FunctionComponent<{
  onClose: () => any;
}> = ({ onClose }) => {
  const clientContext = useClientContext();
  const { reactResources, table, userId, resources } = clientContext;
  const [respawningAtName, setRespawningAtName] = useState<
    string | undefined
  >();
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [error, setError] = useError();

  const playerHealth = reactResources.use("/ecs/c/health", userId);

  const deathMessage =
    playerHealth?.lastDamageSource &&
    makeDeathReason(
      convertDamageSourceToDeathReason(playerHealth.lastDamageSource, (id) =>
        reactResources.get("/ecs/entity", id)
      ),
      true
    );

  const deathRawCost = playerHealth?.lastDamageInventoryConsequence
    ? bagCount(
        playerHealth.lastDamageInventoryConsequence,
        anItem(BikkieIds.bling)
      )
    : 0n;

  const locations = useValidResurrectionLocations({
    userId,
    reactResources,
    table,
  });

  useEffect(() => {
    const id = setCanvasEffect(resources, {
      kind: "bw",
    });

    return () => {
      removeCanvasEffectOfId(resources, id);
    };
  }, []);

  useEffect(() => {
    if (playerHealth && playerHealth.hp > 0) {
      reactResources.set("/game_modal", {
        kind: "empty",
      });
    }
  }, [playerHealth]);

  const doRespawn = useCallback(async (location: WarpHomeLocationDisplay) => {
    try {
      setRespawningAtName(location.name);
      await respawn(clientContext, location.location);
    } catch (error: any) {
      setError(error);
    } finally {
      setRespawningAtName(undefined);
    }
  }, []);

  useEffect(() => {
    if (locations.length === 0 || respawningAtName) {
      return;
    }

    const a = animate(0, 1, {
      duration: autoRespawnDurationSeconds,
      delay: 2,
      ease: "linear",
      onUpdate: (latest) => setProgress(latest),
      onComplete: () => {
        if (locations.length > 0) {
          void doRespawn(locations[0]);
        }
      },
    });
    return () => {
      a.stop();
    };
  }, [respawningAtName]);

  return (
    <ChromelessModal extraClassNames="death-modal" onClose={onClose}>
      <MaybeError error={error} />
      <div className="death-explanation">
        <div className="explanation">You {deathMessage}...</div>
        <div className="consequence">
          and lost {` `}
          {formatCurrency(BikkieIds.bling, deathRawCost, "locale")} Bling
        </div>
      </div>

      <div className="actions">
        {locations.map((e, i) => {
          return (
            <DialogButton
              key={e.name}
              onClick={() => {
                void doRespawn(e);
              }}
              type={i === 0 ? "primary" : undefined}
              size="large"
              progress={i === 0 && !respawningAtName ? progress : undefined}
            >
              Resurrect at {e.name}
            </DialogButton>
          );
        })}
      </div>
    </ChromelessModal>
  );
};
