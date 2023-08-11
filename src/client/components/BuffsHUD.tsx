import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import { ItemTooltip } from "@/client/components/inventory/ItemTooltip";
import { useAnimation } from "@/client/util/animation";
import { RemoveBuffEvent } from "@/shared/ecs/gen/events";
import type { Buff } from "@/shared/ecs/gen/types";
import {
  buffDescription,
  buffTimeRemaining,
  buffType,
} from "@/shared/game/buffs";
import { anItem } from "@/shared/game/item";
import { fireAndForget } from "@/shared/util/async";
import { shortTimeString } from "@/shared/util/helpers";
import { motion } from "framer-motion";
import { isEqual } from "lodash";
import type { MouseEvent } from "react";
import React, { useRef } from "react";

export const BuffIcon: React.FunctionComponent<{
  buff: Buff;
}> = ({ buff }) => {
  return (
    <div className={`buff-icon-wrapper`}>
      <ItemIcon item={anItem(buff.item_id)} />
    </div>
  );
};

const BuffHUDIcon: React.FunctionComponent<{
  buff: Buff;
  showTime?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => any;
}> = React.memo(({ buff, showTime, onClick }) => {
  const { reactResources } = useClientContext();
  const overlayRef = useRef<HTMLDivElement>(null);

  useAnimation(() => {
    if (!overlayRef.current || !showTime) {
      return;
    }

    const clock = reactResources.get("/clock");
    const timeRemaining = buffTimeRemaining(buff, clock.time);
    overlayRef.current.textContent = shortTimeString(timeRemaining);
  });

  if (buff.is_disabled) return <></>;
  const item = anItem(buff.item_id);
  if (item.isHidden) return <></>;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`buff ${buffType(buff)}`}
      onContextMenu={onClick}
    >
      <BuffIcon buff={buff} />
      {showTime && <div className="time-overlay" ref={overlayRef} />}
    </motion.div>
  );
}, isEqual);

export const BuffsHUD: React.FunctionComponent<{}> = ({}) => {
  const { reactResources, events } = useClientContext();
  const playerId = reactResources.get("/scene/local_player").id;
  const buffs = reactResources.use("/player/applicable_buffs").buffs;

  if (!buffs.length) {
    return <></>;
  }

  const removeBuff = (buff: Buff) => {
    fireAndForget(events.publish(new RemoveBuffEvent({ id: playerId, buff })));
  };

  return (
    <div className="buffs-container absolute left-1/2 top-0.8 z-10 flex translate-x-[-50%] items-start justify-center gap-0.4">
      {buffs.map((buff) => {
        const type = buffType(buff);
        const isBuffFromConsumable = anItem(buff.from_id)?.isConsumable;
        const canRemove = type !== "debuff" && isBuffFromConsumable;

        const tooltip = (
          <>
            <div className={`cell-tooltip`} key="buff-description">
              {buffDescription(buff.item_id)}
            </div>
            {canRemove && (
              <div className="wearable-label">Right-click to remove</div>
            )}
          </>
        );
        return (
          <ItemTooltip tooltip={tooltip} key={`${buff.item_id}`}>
            <BuffHUDIcon
              buff={buff}
              showTime={isBuffFromConsumable}
              onClick={(e) => {
                if (canRemove && e.button === 2) {
                  e.preventDefault();
                  removeBuff(buff);
                }
              }}
            />
          </ItemTooltip>
        );
      })}
    </div>
  );
};
