import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import { DyingCraftingStationScreen } from "@/client/components/inventory/crafting/DyingCraftingStationScreen";
import { GeneralCraftingStationScreen } from "@/client/components/inventory/crafting/GeneralCraftingStationScreen";
import { UnorderedCraftingStationScreen } from "@/client/components/inventory/crafting/UnorderedCraftingStationScreen";
import type { CraftingStationType } from "@/shared/bikkie/schema/types";
import {
  InventoryCompostEvent,
  InventoryCookEvent,
} from "@/shared/ecs/gen/events";
import type { InventoryAssignmentPattern } from "@/shared/game/inventory";
import type { BiomesId } from "@/shared/ids";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { assertNever } from "@/shared/util/type_helpers";
import { useCallback } from "react";

export const CraftingStationScreen: React.FunctionComponent<{
  stationEntityId?: BiomesId;
}> = ({ stationEntityId }) => {
  const { events, userId, resources } = useClientContext();
  const handleCook = useCallback(
    async (src: InventoryAssignmentPattern) => {
      if (src.length < 2) {
        return;
      }
      await events.publish(
        new InventoryCookEvent({ id: userId, src, stationEntityId })
      );
    },
    [events, stationEntityId, userId]
  );

  const handleCompost = useCallback(
    async (src: InventoryAssignmentPattern) => {
      if (src.length < 1) {
        return;
      }
      await events.publish(
        new InventoryCompostEvent({ id: userId, src, stationEntityId })
      );
    },
    [events, stationEntityId, userId]
  );

  const [stationLabel] = useLatestAvailableComponents(stationEntityId, "label");
  const stationItem = relevantBiscuitForEntityId(resources, stationEntityId);
  const stationName = stationLabel?.text ?? stationItem?.displayName;
  const stationType: CraftingStationType =
    stationItem?.craftingStationType ?? "general";
  switch (stationType) {
    case "general":
      return <GeneralCraftingStationScreen stationEntityId={stationEntityId} />;
    case "dying":
      return <DyingCraftingStationScreen stationEntityId={stationEntityId} />;
    case "cooking":
      return (
        <UnorderedCraftingStationScreen
          slots={3}
          stationEntityId={stationEntityId!}
          title={stationName}
          extraClassName="kitchen"
          craftVerb="Cook"
          onCraft={handleCook}
          minItems={3}
        />
      );
    case "composting":
      return (
        <UnorderedCraftingStationScreen
          stationEntityId={stationEntityId!}
          slots={3}
          title={stationName}
          extraClassName="composter"
          craftVerb="Compost"
          onCraft={handleCompost}
          multiItemSlot={true}
        />
      );
    default:
      assertNever(stationType);
      return <></>;
  }
};
