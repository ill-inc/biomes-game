import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useOutfit } from "@/client/components/hooks/outfit";
import { InventoryAndHotbarDisplay } from "@/client/components/inventory/InventoryAndHotbarDisplay";
import { useInventoryControllerContext } from "@/client/components/inventory/InventoryControllerContext";
import type { DisableSlotPredicate } from "@/client/components/inventory/types";
import { AvatarWearables } from "@/client/components/social/AvatarWearables";
import { DialogButton } from "@/client/components/system/DialogButton";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import type { OwnedItemReference } from "@/shared/ecs/gen/types";
import type { ItemAndCount } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";

const disableSlotPredicate: DisableSlotPredicate = (
  itemAndCount: ItemAndCount | undefined,
  _ref: OwnedItemReference
) => {
  if (!itemAndCount) {
    return false;
  }
  return itemAndCount.item.isWearable !== true;
};

const OutfitScreenRightPane: React.FC<{}> = () => {
  const { userId } = useClientContext();
  const { handleInventorySlotClick } = useInventoryControllerContext();

  return (
    <PaneLayout type="center_both" extraClassName="inventory-right-pane">
      <div className="bg-image" />
      <AvatarWearables
        entityId={userId}
        onSlotClick={handleInventorySlotClick}
        disableSlotPredicate={disableSlotPredicate}
      />
      <InventoryAndHotbarDisplay disableSlotPredicate={disableSlotPredicate} />
    </PaneLayout>
  );
};

const OutfitScreenLeftPane: React.FC<{ outfitId: BiomesId }> = ({
  outfitId,
}) => {
  const { canUseOutfit, equipOutfit } = useOutfit({ outfitId });
  const { handleInventorySlotClick } = useInventoryControllerContext();

  return (
    <PaneLayout type="center_both" extraClassName="inventory-left-pane p-0">
      <div className="outfit-stand-left-pane">
        <AvatarWearables
          entityId={outfitId}
          onSlotClick={handleInventorySlotClick}
          disableSlotPredicate={disableSlotPredicate}
        />
      </div>
      <DialogButton
        disabled={!canUseOutfit}
        type={"primary"}
        name="Swap Outfit"
        onClick={equipOutfit}
      />
    </PaneLayout>
  );
};

export const OutfitStandScreen: React.FC<{ outfitId: BiomesId }> = ({
  outfitId,
}) => {
  return (
    <SplitPaneScreen
      extraClassName="profile"
      leftPaneExtraClassName="biomes-box"
      rightPaneExtraClassName="biomes-box"
    >
      <ScreenTitleBar title="Outfit Stand" divider={false} />
      <RawLeftPane>
        <OutfitScreenLeftPane outfitId={outfitId} />
      </RawLeftPane>
      <RawRightPane>
        <OutfitScreenRightPane />
      </RawRightPane>
    </SplitPaneScreen>
  );
};
