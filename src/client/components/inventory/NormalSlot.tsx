import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { InventoryCellContents } from "@/client/components/inventory/InventoryCellContents";
import type {
  SlotClickHandler,
  SlotKeyPressHandler,
  SlotMouseOverHandler,
} from "@/client/components/inventory/InventoryControllerContext";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { useInventoryOverrideContext } from "@/client/components/inventory/InventoryOverrideContext";
import { Img } from "@/client/components/system/Img";
import { shouldHideOriginalCellItem } from "@/client/util/drag_helpers";
import { cleanListener } from "@/client/util/helpers";
import type { ItemSlot, OwnedItemReference } from "@/shared/ecs/gen/types";
import { chargeRemaining } from "@/shared/game/expiration";
import { OwnedItemReferencesEqual } from "@/shared/game/inventory";
import { durabilityRemaining, waterLevelRemaining } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import type { HTMLMotionProps } from "framer-motion";
import { motion } from "framer-motion";
import { isEqual, uniqueId } from "lodash";
import type { PropsWithChildren } from "react";
import React, { useEffect, useRef, useState } from "react";

export interface NormalSlotProps {
  entityId: BiomesId;
  slot: ItemSlot;
  slotReference: OwnedItemReference;
  selected?: boolean;
  emptyImg?: string;
  label?: string;
  onMouseOver?: SlotMouseOverHandler;
  onKeyPress?: SlotKeyPressHandler;
  onClick?: SlotClickHandler;
  disabled?: boolean;
  animateDisabled?: boolean;
  extraClassName?: string;
}

export const NormalSlot: React.FunctionComponent<
  PropsWithChildren<NormalSlotProps>
> = ({
  entityId,
  slot,
  selected,
  slotReference,
  emptyImg,
  label,
  onMouseOver,
  onKeyPress,
  onClick,
  extraClassName,
  disabled,
  animateDisabled,
  children,
}) => {
  const { reactResources } = useClientContext();
  useInventoryOverrideContext(); // must invalidate with overrides, otherwise drag item may ghost
  const draggerContext = useInventoryDraggerContext();
  const dragRef = useRef<HTMLDivElement>(null);
  const dragElementId = uniqueId();
  const [mouseOver, setMouseOver] = useState(false);
  const [mouseDown, setMousedown] = useState(false);
  const [mouseStartPosition, setMouseStartPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const classNames = ["cell"];
  if (selected) {
    classNames.push("selected");
  }

  if (extraClassName) {
    classNames.push(extraClassName);
  }

  useEffect(() => {
    return cleanListener(window, {
      keydown: (e) => {
        if (mouseOver) {
          onKeyPress?.(entityId, slotReference, slot, e);
        }
      },
    });
  }, [mouseOver]);

  let showEmpty = !slot && !!emptyImg;
  if (
    draggerContext.dragItem &&
    draggerContext.dragItem.kind === "inventory_drag" &&
    draggerContext.dragItem.entityId === entityId &&
    shouldHideOriginalCellItem(draggerContext.dragItem) &&
    OwnedItemReferencesEqual(
      draggerContext.dragItem.slotReference,
      slotReference
    )
  ) {
    showEmpty = true;
    classNames.push("being-dragged");
  }
  if (!slot) {
    classNames.push("empty");
  }
  const waterLevel = waterLevelRemaining(slot?.item);
  const durability = durabilityRemaining(slot?.item);
  const clock = reactResources.get("/clock");
  const charge = chargeRemaining(slot?.item, clock.time);
  const statusClass =
    waterLevel !== undefined || durability !== undefined
      ? "durability"
      : "charge";
  const durabilityOrCharge = waterLevel ?? durability ?? charge;

  const index = slotReference.kind === "hotbar" ? slotReference.idx : 0;

  const shouldAnimateDisabled = disabled && animateDisabled;

  const motionDivProps: HTMLMotionProps<"div"> =
    disabled && !shouldAnimateDisabled
      ? {
          animate: {
            opacity: 0.25,
            scale: 0.8,
          },
          style: { filter: `grayscale` },
        }
      : {
          animate: {
            opacity: shouldAnimateDisabled ? 0.25 : 1,
            scale: shouldAnimateDisabled ? 0.8 : 1,
          },
          style: { filter: `grayscale(${shouldAnimateDisabled ? 1 : 0})` },
          transition: { delay: index * 0.05 },
        };

  return (
    <div
      id={dragElementId}
      ref={dragRef}
      draggable={false}
      className={classNames.join(" ")}
      onMouseEnter={(_ev) => setMouseOver(true)}
      onMouseLeave={(_ev) => setMouseOver(false)}
      onMouseOver={(ev) => {
        onMouseOver?.(entityId, slotReference, slot, ev);
      }}
      onMouseMove={(ev) => {
        const xMovement = Math.abs(mouseStartPosition.x - ev.clientX);
        const yMovement = Math.abs(mouseStartPosition.y - ev.clientY);
        if (mouseDown && (xMovement > 5 || yMovement > 5)) {
          onClick?.(entityId, slotReference, slot, ev, Boolean(disabled));
          setMousedown(false);
        }
      }}
      onMouseDown={(ev) => {
        if (disabled) {
          return;
        }
        setMousedown(true);
        setMouseStartPosition({ x: ev.clientX, y: ev.clientY });
      }}
      onMouseUp={(ev) => {
        onClick?.(entityId, slotReference, slot, ev, Boolean(disabled));
        setMousedown(false);
      }}
      onContextMenu={(ev) => {
        ev.preventDefault();
      }}
    >
      {!showEmpty ? (
        <motion.div className="absolute inset-0" {...motionDivProps}>
          <InventoryCellContents
            slot={slot}
            overrideCount={
              slot &&
              draggerContext.dragItem &&
              draggerContext.dragItem.kind === "inventory_drag" &&
              draggerContext.dragItem.entityId === entityId &&
              isEqual(draggerContext.dragItem.slotReference, slotReference)
                ? slot.count - (draggerContext?.dragItem?.quantity ?? 0n)
                : undefined
            }
          />
          {durabilityOrCharge !== undefined && (
            <div className="status-container">
              <div
                className={
                  "status-track " +
                  statusClass +
                  (durabilityOrCharge < 20 ? " critical" : "")
                }
                style={{ width: `${durabilityOrCharge}%` }}
              />
            </div>
          )}
        </motion.div>
      ) : emptyImg ? (
        <Img className="w-[60%] opacity-[0.15]" src={emptyImg} alt="" />
      ) : (
        <></>
      )}
      {label && <div className="label-overlay">{label}</div>}
      {children}
    </div>
  );
};
