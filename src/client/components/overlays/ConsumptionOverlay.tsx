import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  ClickIcon,
  getClickIcon,
  ShortcutText,
} from "@/client/components/system/ShortcutText";
import {
  buffType,
  itemBuffSuspicious,
  itemBuffType,
} from "@/shared/game/buffs";
import { startCase } from "lodash";
import { useEffect, useState } from "react";

export const ConsumptionOverlay: React.FunctionComponent = () => {
  const [matchesType, setMatchesType] = useState(false);
  const [suspicious, setSuspicious] = useState(false);

  const { reactResources } = useClientContext();
  const [localPlayer, selection, clock] = reactResources.useAll(
    ["/scene/local_player"],
    ["/hotbar/selection"],
    ["/clock"]
  );

  const action = selection.item?.action;
  const percentage = (localPlayer.pressAndHoldItemInfo?.percentage ?? 0) * 100;
  const type = selection.item ? itemBuffType(selection.item) : undefined;

  useEffect(() => {
    setMatchesType(
      !!type &&
        !!localPlayer.buffs.find(
          (buff) =>
            (buffType(buff) === "debuff" && type === "debuff") ||
            buff.item_id === selection.item?.id
        )
    );
    setSuspicious(!!selection.item && itemBuffSuspicious(selection.item));
  }, [Math.floor(clock.time), type]);

  if (action !== "eat" && action !== "drink") {
    return <></>;
  }

  return (
    <div className="selection-inspect-overlay click-message">
      <div className="inspect">
        <ShortcutText
          shortcut={<img src={getClickIcon("primary")} />}
          progressPercent={percentage}
        >
          <div className="column-container">
            <div>
              <>
                Hold <ClickIcon type="primary" /> to{" "}
                {matchesType && !suspicious
                  ? `Replace Active ${startCase(type)}`
                  : `${startCase(action)}`}
              </>
            </div>
          </div>
        </ShortcutText>
      </div>
    </div>
  );
};
