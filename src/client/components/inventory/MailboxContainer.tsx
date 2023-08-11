import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useInventoryControllerContext } from "@/client/components/inventory/InventoryControllerContext";
import { NormalSlotWithTooltip } from "@/client/components/inventory/NormalSlotWithTooltip";
import { SelfInventoryRightPane } from "@/client/components/inventory/SelfInventoryScreen";
import type { OpenContainer } from "@/client/components/inventory/types";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { anItem, resolveItemAttributeId } from "@/shared/game/item";
import type { ItemAndCount } from "@/shared/game/types";
import { rowMajorIdx, shortTimeString } from "@/shared/util/helpers";
import { range } from "lodash";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import { useCallback } from "react";
import React from "react";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { useCachedUsername } from "@/client/util/social_manager_hooks";
import { useUserCanAction } from "@/client/util/permissions_manager_hooks";
import { GiveGiftEvent, GiveMailboxItemEvent } from "@/shared/ecs/gen/events";
import { resetGiveGiftDate } from "@/shared/game/gifts";
import {
  secondsSinceEpoch,
  secondsSinceEpochToDate,
} from "@/shared/ecs/config";
import { DAILY_GIFTS } from "@/shared/constants";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { BikkieIds } from "@/shared/bikkie/ids";
import { motion } from "framer-motion";
import { iconUrl } from "@/client/components/inventory/icons";
import type { OwnedItemReference, ItemSlot } from "@/shared/ecs/gen/types";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";

export const GiveGiftComponent: React.FunctionComponent<{
  openContainer: OpenContainer;
}> = ({ openContainer }) => {
  const { reactResources, permissionsManager, events, userId } =
    useClientContext();
  const entityPos = reactResources.use(
    "/ecs/c/position",
    openContainer.containerId
  )?.v;
  const robotId =
    (entityPos && permissionsManager.robotIdAt(reactResources, entityPos)) ??
    INVALID_BIOMES_ID;
  const giftGiver = reactResources.use("/ecs/c/gift_giver", userId);
  const creatorId = permissionsManager.robotOwnerIdAt(
    reactResources,
    entityPos
  );
  const creatorName = useCachedUsername(creatorId ?? INVALID_BIOMES_ID);
  const canAccess = useUserCanAction(openContainer.containerId, "destroy");

  const giveGift = useCallback(() => {
    void events.publish(
      new GiveGiftEvent({
        target: openContainer.containerId,
        target_robot: robotId,
        id: userId,
      })
    );
  }, [openContainer.containerId, robotId, userId, events]);

  const resetDate = resetGiveGiftDate(giftGiver?.last_gift_time);
  const curDate = secondsSinceEpochToDate(secondsSinceEpoch());
  const reset = curDate > resetDate;
  const giftsGiven = reset ? 0 : giftGiver?.gift_targets.length ?? 0;

  const cannotGiveGiftReason = useMemo(() => {
    if (creatorId === userId) {
      return "You cannot give gifts to yourself.";
    }
    if (canAccess) {
      return "You cannot give gifts to a mailbox you can access.";
    }
    if (reset) {
      return;
    }
    if (giftsGiven >= DAILY_GIFTS) {
      return "You have already given all your gifts today.";
    }
    if (!creatorId) {
      return "This mailbox is not protected by a robot.";
    }
    if (giftGiver?.gift_targets.includes(creatorId)) {
      return `You have already given a gift to ${creatorName} today.`;
    }
  }, [creatorId, creatorName, giftGiver?.gift_targets, giftsGiven, reset]);

  return (
    <div className="text-center">
      <div className="my-1">
        You have given{" "}
        <span className={giftsGiven < DAILY_GIFTS ? "text-green" : "text-red"}>
          {giftsGiven}/{DAILY_GIFTS}
        </span>{" "}
        gifts today.
      </div>
      {!reset && (
        <div className="my-1 text-secondary-gray">
          (Gifts reset in{" "}
          {shortTimeString((resetDate.getTime() - curDate.getTime()) / 1000)})
        </div>
      )}
      <Tooltipped tooltip={cannotGiveGiftReason}>
        <button
          onClick={giveGift}
          className={`${
            cannotGiveGiftReason ? "bg-red opacity-50" : "bg-green"
          } button dialog-button relative`}
        >
          <motion.img
            whileHover={{ scale: 1.2 }}
            src={iconUrl(anItem(BikkieIds.playerGift))}
            draggable={false}
            className="absolute mx-auto h-8 w-8 opacity-50"
          />
          <span className="text-shadow absolute text-marge">
            Give Gift to {creatorName}
          </span>
        </button>
      </Tooltipped>
    </div>
  );
};

export const MailboxLeftPaneContent: React.FunctionComponent<{
  openContainer: OpenContainer;
}> = ({ openContainer }) => {
  const { handleInventorySlotClick } = useInventoryControllerContext();
  const { reactResources, permissionsManager, events } = useClientContext();
  const { dragItem, setDragItem } = useInventoryDraggerContext();
  const entityPos = reactResources.use(
    "/ecs/c/position",
    openContainer.containerId
  )?.v;
  const robotId =
    (entityPos && permissionsManager.robotIdAt(reactResources, entityPos)) ??
    INVALID_BIOMES_ID;
  const robotName = reactResources.use("/ecs/c/label", robotId)?.text;
  const canAccess = useUserCanAction(openContainer.containerId, "destroy");
  const robotOwner = reactResources.use("/ecs/c/created_by", robotId)?.id;

  const containerInventory = reactResources.use(
    "/ecs/c/container_inventory",
    openContainer.containerId
  );

  const numItems = containerInventory?.items.length ?? 0;
  const numCols = anItem(openContainer.itemId).numCols || 1;

  const derivedNumRows = Math.ceil(numItems / numCols);

  const handleMailboxItemClick = useCallback(
    (
      entityId: BiomesId,
      slotReference: OwnedItemReference,
      slot: ItemSlot,
      ev: React.MouseEvent,
      disabled: boolean
    ) => {
      if (canAccess) {
        return handleInventorySlotClick(
          entityId,
          slotReference,
          slot,
          ev,
          disabled
        );
      }
      if (!dragItem || dragItem.kind !== "inventory_drag") {
        return;
      }
      if (slot) {
        // Can't gift into a slot that already has an item
        return;
      }
      void events.publish(
        new GiveMailboxItemEvent({
          player_id: dragItem.entityId,
          src_id: dragItem.entityId,
          src: dragItem.slotReference,
          count: dragItem.quantity,
          dst_id: openContainer.containerId,
          dst: slotReference,
          target_player_id: robotOwner,
        })
      );
      setDragItem(null);
      // TODO: Eager changes
    },
    [canAccess, dragItem, handleInventorySlotClick]
  );

  return (
    <PaneLayout extraClassName="inventory-left-pane">
      <div className="padded-view padded-view-inventory">
        <ItemIcon
          item={anItem(openContainer.itemId)}
          className="container-icon"
        />
        <div className="m-1">
          {robotName ? (
            <div>Protected by {robotName}</div>
          ) : (
            <div className="text-sm">
              (Unprotected. Place near robot to protect)
            </div>
          )}
          {!canAccess && (
            <ul>
              <li>
                You <span className="text-light-green">may place items</span>
              </li>
              <li>
                You <span className="text-light-red">may not take items</span>
              </li>
            </ul>
          )}
        </div>
        <div className="inventory-cells">
          {range(derivedNumRows).map((row) => (
            <React.Fragment key={`row${row}`}>
              {range(numCols).map((col) => {
                const slotIdx = rowMajorIdx(numCols, row, col);
                const item = containerInventory?.items[slotIdx];
                return (
                  <NormalSlotWithTooltip
                    key={`row${row}-item-${col}`}
                    slotType="inventory"
                    entityId={openContainer.containerId}
                    slot={containerInventory?.items[slotIdx]}
                    slotReference={{
                      kind: "item",
                      idx: slotIdx,
                    }}
                    onClick={handleMailboxItemClick}
                    disabled={item && !canAccess}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <GiveGiftComponent openContainer={openContainer} />
      </div>
    </PaneLayout>
  );
};

export const MailboxScreen: React.FunctionComponent<
  PropsWithChildren<{
    openContainer: OpenContainer;
  }>
> = ({ openContainer, children }) => {
  const { reactResources, permissionsManager } = useClientContext();
  const entityPos = reactResources.use(
    "/ecs/c/position",
    openContainer.containerId
  )?.v;
  const creatorId = permissionsManager.robotOwnerIdAt(
    reactResources,
    entityPos
  );
  const creatorName = useCachedUsername(creatorId);
  const containerItem = anItem(openContainer.itemId);

  const disableSlotPredicate = (item: ItemAndCount | undefined) => {
    if (containerItem.compatibleItemPredicates === undefined) {
      return false;
    }

    if (!item) {
      return true;
    }

    for (const attributeId of containerItem.compatibleItemPredicates) {
      if (resolveItemAttributeId(item.item, attributeId)) {
        return false;
      }
    }
    return true;
  };

  return (
    <SplitPaneScreen
      extraClassName="profile"
      leftPaneExtraClassName="biomes-box"
      rightPaneExtraClassName="biomes-box"
    >
      <ScreenTitleBar
        title={`${creatorName ? `${creatorName}'s ` : ""}Mailbox`}
      />
      <RawLeftPane>
        <MailboxLeftPaneContent openContainer={openContainer} />
      </RawLeftPane>
      <RawRightPane>
        <SelfInventoryRightPane disableSlotPredicate={disableSlotPredicate}>
          {children}
        </SelfInventoryRightPane>
      </RawRightPane>
    </SplitPaneScreen>
  );
};
