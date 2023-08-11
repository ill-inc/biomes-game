import {
  CharacterPreview,
  makePreviewSlot,
} from "@/client/components/character/CharacterPreview";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { SlotClickHandler } from "@/client/components/inventory/InventoryControllerContext";
import type { DisableSlotPredicate } from "@/client/components/inventory/types";
import { WearableCells } from "@/client/components/inventory/WearableCells";
import type { ThreeObjectPreview } from "@/client/components/ThreeObjectPreview";
import type { LoadedPlayerMesh } from "@/client/game/resources/player_mesh";
import type { BiomesId } from "@/shared/ids";
import type { PropsWithChildren } from "react";
import React from "react";

export const AvatarWearables: React.FunctionComponent<
  PropsWithChildren<{
    entityId: BiomesId;
    onSlotClick?: SlotClickHandler;
    onAvatarClick?: () => unknown;
    onMeshChange?: (
      mesh: LoadedPlayerMesh,
      renderer: ThreeObjectPreview
    ) => unknown;
    disableSlotPredicate?: DisableSlotPredicate;
  }>
> = ({
  entityId,
  onSlotClick,
  onAvatarClick,
  onMeshChange,
  disableSlotPredicate,
  children,
}) => {
  const { userId } = useClientContext();
  return (
    <WearableCells
      onSlotClick={onSlotClick}
      entityId={entityId}
      disableSlotPredicate={disableSlotPredicate}
    >
      <div className="avatar-viewer-wrap">
        <CharacterPreview
          previewSlot={makePreviewSlot("inventory", entityId)}
          entityId={entityId}
          onMeshChange={onMeshChange}
          onClick={onAvatarClick}
          canShowWearableHint={userId === entityId}
        />
        {children}
      </div>
    </WearableCells>
  );
};
