import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";

import { chargeRemaining } from "@/shared/game/expiration";

export const ChargeOverlayComponent: React.FunctionComponent = () => {
  const { reactResources } = useClientContext();
  const [selection, clock] = reactResources.useAll(
    ["/hotbar/selection"],
    ["/clock"]
  );

  const charge = chargeRemaining(selection.item, clock.time) ?? 0;

  return (
    <div className="selection-inspect-overlay click-message">
      <div className="inspect">
        {charge < 100 && <>Charging &bull; {charge.toFixed(0)}%</>}
      </div>
    </div>
  );
};
