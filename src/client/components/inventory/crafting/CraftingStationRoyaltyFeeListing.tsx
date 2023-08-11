import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { BikkieIds } from "@/shared/bikkie/ids";
import { calculateCraftingStationRoyalty } from "@/shared/game/crafting";
import { currencyBalance } from "@/shared/game/inventory";
import type { BiomesId } from "@/shared/ids";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { formatCurrency } from "@/shared/util/view_helpers";
import React from "react";

export const CraftingStationRoyaltyFeeListing: React.FunctionComponent<{
  stationEntityId: BiomesId;
}> = ({ stationEntityId }) => {
  const { resources, reactResources, userId } = useClientContext();
  const inventory = reactResources.use("/ecs/c/inventory", userId);
  const [createdBy] = useLatestAvailableComponents(
    stationEntityId,
    "created_by"
  );
  const [ownerLabel] = useLatestAvailableComponents(createdBy?.id, "label");
  const stationItem = relevantBiscuitForEntityId(resources, stationEntityId);
  const cost = calculateCraftingStationRoyalty(
    userId,
    createdBy?.id,
    stationItem
  )?.count;

  if (!cost) {
    return <></>;
  }

  const canAfford = currencyBalance(inventory!, BikkieIds.bling) >= cost;

  return (
    <ul className="fees">
      <li>
        <label>
          <Tooltipped
            tooltip={`${ownerLabel?.text} charges a fee for using this station`}
          >
            <span className="helper-label">[?]</span>
          </Tooltipped>
          Station royalty fee:
        </label>
        <div className={`quantity fee ${canAfford ? "" : "too-much"}`}>
          {formatCurrency(BikkieIds.bling, cost)} Bling
        </div>
      </li>
      <li>
        <label>Your balance:</label>
        <div className="quantity">
          {formatCurrency(
            BikkieIds.bling,
            currencyBalance(inventory!, BikkieIds.bling)
          )}{" "}
          {` `}
          Bling
        </div>
      </li>
    </ul>
  );
};
