import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  ClickIcon,
  getClickIcon,
  ShortcutText,
} from "@/client/components/system/ShortcutText";
import { STARTER_AREA_NAME } from "@/shared/constants";
import { chargeRemaining } from "@/shared/game/expiration";

export const HomestoneOverlay: React.FunctionComponent = () => {
  const { reactResources } = useClientContext();
  const [localPlayer, selection, clock] = reactResources.useAll(
    ["/scene/local_player"],
    ["/hotbar/selection"],
    ["/clock"]
  );

  const action = selection.item?.action;

  if (action !== "warpHome") {
    return <></>;
  }

  const percentage = (localPlayer.pressAndHoldItemInfo?.percentage ?? 0) * 100;
  const charge = chargeRemaining(selection.item, clock.time) ?? 0;

  return (
    <div className="selection-inspect-overlay click-message">
      <div className="inspect">
        <ShortcutText
          shortcut={<img src={getClickIcon("primary")} />}
          progressPercent={percentage}
        >
          {charge === 100 && (
            <div>
              {percentage < 100 ? (
                <>
                  Hold <ClickIcon type="primary" /> to Warp
                </>
              ) : (
                <>Warping to {STARTER_AREA_NAME} </>
              )}
            </div>
          )}
          {charge < 100 && <>Charging &bull; {charge.toFixed(0)}%</>}
        </ShortcutText>
      </div>
    </div>
  );
};
