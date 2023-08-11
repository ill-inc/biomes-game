import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type {
  LootEvent,
  LootEventOverlay,
} from "@/client/game/resources/overlays";
import { formatItemCount } from "@/shared/util/view_helpers";
import { clamp, compact, sortBy } from "lodash";
import { useMemo } from "react";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";

export const LootEventElement: React.FunctionComponent<{
  lootEvent: LootEvent;
}> = ({ lootEvent }) => {
  const amount = formatItemCount(lootEvent.item);
  const name = lootEvent.item.item.displayName;
  if (name === "") {
    return <></>;
  }
  const lootText = `${amount !== "1" ? `x${amount} ` : ""}${name}`;
  return (
    <div key={lootEvent.item.item.id} className="loot-event">
      <ItemIcon item={lootEvent.item.item} className="loot-icon" />
      <span className="loot-text">{lootText}</span>
    </div>
  );
};

export const LootEventOverlayComponent: React.FunctionComponent<{
  overlay: LootEventOverlay;
}> = ({ overlay }) => {
  const { reactResources } = useClientContext();
  const lootEvents = reactResources.use("/overlays/loot");

  const lootEventDisplay = useMemo(() => {
    return sortBy(compact(lootEvents.events), (evt) => -evt.time).map((evt) => (
      <LootEventElement key={evt.entityId} lootEvent={evt} />
    ));
  }, [lootEvents.version]);

  // posX is the position of the leftmost part of the player AABB
  // if it's too far over us, move the overlay
  const rightOffset = clamp(
    window.innerWidth - overlay.posX,
    window.innerWidth / 2 + 200,
    window.innerWidth - 200
  );

  return (
    <div
      className="loot-overlay"
      style={{
        right: `${rightOffset}px`,
      }}
    >
      {overlay.displayFullMessage && (
        <div className="loot-full-message">Inventory Full</div>
      )}
      {lootEventDisplay}
    </div>
  );
};
