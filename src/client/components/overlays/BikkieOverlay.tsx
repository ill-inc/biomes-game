import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { anItem } from "@/shared/game/item";

export const BikkieOverlay: React.FunctionComponent = () => {
  const { reactResources } = useClientContext();
  const [selection, currentBiscuit] = reactResources.useAll(
    ["/hotbar/selection"],
    ["/admin/current_biscuit"]
  );
  const action = selection.item?.action;
  if (action !== "bikkie") {
    return <></>;
  }
  const biscuit = anItem(currentBiscuit.id);
  return (
    <div className="selection-inspect-overlay click-message">
      <div className="inspect">
        {biscuit?.name ?? "Unknown"}/{currentBiscuit.id}
      </div>
    </div>
  );
};
