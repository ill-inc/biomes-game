import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  hasPreviewHologram,
  inventorySelectionName,
} from "@/client/components/inventory/helpers";
import { BecomeNpcOverlayComponent } from "@/client/components/overlays/BecomeNpcOverlayComponent";
import { BikkieOverlay } from "@/client/components/overlays/BikkieOverlay";
import { ChargeOverlayComponent } from "@/client/components/overlays/ChargeOverlayComponent";
import { ConsumptionOverlay } from "@/client/components/overlays/ConsumptionOverlay";
import { FishingHotBarComponent } from "@/client/components/overlays/FishingOverlayComponent";
import { GroupPlaceObjectOverlay } from "@/client/components/overlays/GroupPlaceObjectOverlay";
import { HomestoneOverlay } from "@/client/components/overlays/HomestoneOverlay";
import { NegaWandOverlay } from "@/client/components/overlays/NegaWandOverlay";
import { SpaceClipboardWandOverlay } from "@/client/components/overlays/SpaceClipboardWandOverlay";
import { WaypointCamOverlayComponent } from "@/client/components/overlays/WaypointCamOverlayComponent";
import { usePlayerHasPermissionFoItemAction } from "@/client/util/permissions_manager_hooks";
import { motion } from "framer-motion";

export const SelectionNameOverlay: React.FunctionComponent<{}> = ({}) => {
  const { reactResources } = useClientContext();

  const [selection, becomeNpc] = reactResources.useAll(
    ["/hotbar/selection"],
    ["/scene/npc/become_npc"]
  );

  const disabled = !usePlayerHasPermissionFoItemAction(selection?.item);
  const selectedItemName = inventorySelectionName(selection);

  const action = selection.item?.action;
  const showGroupPlaceOverlay = hasPreviewHologram(selection.item);

  const gameModal = reactResources.get("/game_modal");
  if (gameModal.kind !== "empty") return <></>;

  return (
    <>
      <div
        key={selectedItemName}
        className="absolute bottom-[10vh] left-1/2 z-10 flex w-full -translate-x-1/2 flex-col items-center gap-0.6 text-white text-shadow-bordered"
      >
        {selectedItemName && (
          <motion.div
            animate={{ opacity: [1, 1, 1, 0] }}
            transition={{ duration: 2 }}
            className={`text-xl font-semibold ${disabled ? "opacity/30" : ""} `}
          >
            {selectedItemName}
          </motion.div>
        )}
        {selection.item?.isChargeable && action !== "warpHome" && (
          <ChargeOverlayComponent />
        )}
        {action === "warpHome" && <HomestoneOverlay />}
        {action === "fish" && <FishingHotBarComponent />}
        {action === "bikkie" && <BikkieOverlay />}
        {action === "spaceClipboard" && <SpaceClipboardWandOverlay />}
        {action === "negaWand" && <NegaWandOverlay />}
        {action === "waypointCam" && <WaypointCamOverlayComponent />}
        {(action === "eat" || action === "drink") && <ConsumptionOverlay />}
        {showGroupPlaceOverlay && <GroupPlaceObjectOverlay />}
        {becomeNpc.kind === "active" && <BecomeNpcOverlayComponent />}
      </div>
    </>
  );
};
