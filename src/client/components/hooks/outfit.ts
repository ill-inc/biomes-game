import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { AddToOutfitEvent, EquipOutfitEvent } from "@/shared/ecs/gen/events";
import type { OwnedItemReference } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { useState } from "react";

export interface OutfitHookProps {
  outfitId: BiomesId;
}

export const useOutfit = ({ outfitId }: OutfitHookProps) => {
  const [modifyingOutfit, setModifyingOutfit] = useState(false);
  const { reactResources, events } = useClientContext();
  const creatorId = reactResources.use("/ecs/c/placed_by", outfitId)?.id;
  const localPlayerId = reactResources.use("/scene/local_player").id;

  const modifyOutfit = (fn: () => Promise<any>) => {
    if (modifyingOutfit) {
      return;
    }
    setModifyingOutfit(true);
    fn().finally(() => setModifyingOutfit(false));
  };

  const addToOutfit = (itemRef: OwnedItemReference) => {
    modifyOutfit(async () => {
      await events.publish(
        new AddToOutfitEvent({
          id: outfitId,
          player_id: localPlayerId,
          src: itemRef,
        })
      );
    });
  };

  const equipOutfit = () => {
    modifyOutfit(async () => {
      await events.publish(
        new EquipOutfitEvent({
          id: outfitId,
          player_id: localPlayerId,
        })
      );
    });
  };

  const canUseOutfit = (): boolean => {
    return creatorId === localPlayerId;
  };

  return {
    canUseOutfit,
    addToOutfit,
    equipOutfit,
  };
};

export type UseOutfitHook = ReturnType<typeof useOutfit>;
