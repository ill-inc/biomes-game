import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { BikkieIds } from "@/shared/bikkie/ids";
import { currencyBalance } from "@/shared/game/inventory";
import { formatCurrency } from "@/shared/util/view_helpers";
import React from "react";

export const DialogFeeListing: React.FunctionComponent<{
  cost: bigint;
  tooltip: string;
}> = ({ cost, tooltip }) => {
  const { reactResources, userId } = useClientContext();
  const inventory = reactResources.use("/ecs/c/inventory", userId);

  const canAfford = currencyBalance(inventory!, BikkieIds.bling) >= cost;

  return (
    <ul className="fees">
      <li>
        <label>
          <Tooltipped tooltip={tooltip}>
            <span className="helper-label">[?]</span>
          </Tooltipped>
          Service fee:
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
