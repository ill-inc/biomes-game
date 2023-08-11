import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useInventoryControllerContext } from "@/client/components/inventory/InventoryControllerContext";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import { ItemTooltip } from "@/client/components/inventory/ItemTooltip";
import { NormalSlotWithTooltip } from "@/client/components/inventory/NormalSlotWithTooltip";
import { SelfInventoryRightPane } from "@/client/components/inventory/SelfInventoryScreen";
import { iconUrl } from "@/client/components/inventory/icons";
import { RobotBatteryIcon } from "@/client/components/map/pannable/PlayerRow";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogInputWithButton } from "@/client/components/system/DialogInputWithButton";
import type { MoreMenuItem } from "@/client/components/system/MoreMenu";
import { MoreMenu } from "@/client/components/system/MoreMenu";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { MiniPhoneMoreItem } from "@/client/components/system/mini_phone/MiniPhoneMoreItem";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { RightBarItem } from "@/client/components/system/mini_phone/split_pane/RightBarItem";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { becomeTheNPC } from "@/client/game/scripts/become_npc";
import { isInventoryDragItem } from "@/client/util/drag_helpers";
import { BikkieIds } from "@/shared/bikkie/ids";
import {
  ROBOT_ITEM_SLOTS,
  ROBOT_MINIMUM_FILL_S,
  ROBOT_SECONDS_PER_BLING,
} from "@/shared/constants";
import {
  FeedRobotEvent,
  PickUpRobotEvent,
  UpdateProjectedRestorationEvent,
  UpdateRobotNameEvent,
} from "@/shared/ecs/gen/events";
import type { ItemAndCount } from "@/shared/ecs/gen/types";
import { currencyBalance } from "@/shared/game/inventory";
import { anItem } from "@/shared/game/item";
import {
  computeRobotBatterySpace,
  isValidRobotInventoryItem,
} from "@/shared/game/robot";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { shortTimeString } from "@/shared/util/helpers";
import { clamp } from "lodash";
import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

const FEED_ROBOT_BASE_AMOUNT = 10;

const restoreDelaySettings = [
  { label: "10 secs", value: 10 },
  { label: "10 mins", value: 10 * 60 },
  { label: "30 mins", value: 30 * 60 },
  { label: "1 hour", value: 60 * 60 },
  { label: "1 day", value: 60 * 60 * 24 },
  { label: "Never", value: Number.POSITIVE_INFINITY },
];
const restoreDelayIndexByValue = new Map(
  restoreDelaySettings.map((setting, index) => [setting.value, index])
);

export const RobotSettingsLeftPaneContent: React.FunctionComponent<{
  entityId: BiomesId;
}> = ({ entityId }) => {
  const SHOW_RESTORATION = false;
  const { handleInventorySlotClick } = useInventoryControllerContext();
  const { dragItem } = useInventoryDraggerContext();
  const clientContext = useClientContext();
  const { reactResources, userId, events } = clientContext;
  const [inventory, robotComponent, robotParams, localInventory, clock] =
    reactResources.useAll(
      ["/ecs/c/container_inventory", entityId],
      ["/ecs/c/robot_component", entityId],
      ["/robots/params", entityId],
      ["/ecs/c/inventory", userId],
      ["/clock"]
    );

  const label = reactResources.use("/ecs/c/label", entityId);
  const [robotName, setRobotName] = useState(label?.text ?? "");
  const batteryCapacity = robotParams?.battery.capacity ?? Infinity;

  const protection = reactResources.use("/ecs/c/projects_protection", entityId);
  const existingIndex = useMemo(
    () =>
      restoreDelayIndexByValue.get(
        protection?.restoration?.restore_delay_s ?? 0
      ) ?? 0,
    [protection?.restoration?.restore_delay_s]
  );

  const [restoreDelayIndex, setRestoreDelayIndex] = useState(existingIndex);

  const disableSlotPredicate = (item: ItemAndCount | undefined) => {
    return isValidRobotInventoryItem(item) === false;
  };

  const saveRobotName = useCallback(async () => {
    if (robotName.trim().length === 0) {
      return;
    }
    fireAndForget(
      events.publish(
        new UpdateRobotNameEvent({
          id: userId,
          player_id: userId,
          entity_id: entityId,
          name: robotName,
        })
      )
    );
  }, [robotName]);

  const saveRobotRestore = useCallback(async () => {
    fireAndForget(
      events.publish(
        new UpdateProjectedRestorationEvent({
          id: userId,
          player_id: userId,
          entity_id: entityId,
          restore_delay_s: restoreDelaySettings[restoreDelayIndex].value,
        })
      )
    );
  }, [restoreDelayIndex]);

  useEffect(() => {
    void saveRobotRestore();
  }, [restoreDelayIndex]);

  function reasonCannotFeedRobot(
    notEnoughBling: boolean,
    robotIsFull: boolean
  ): string | undefined {
    if (notEnoughBling) {
      return "Not enough Bling";
    } else if (robotIsFull) {
      return "Robot is Full";
    }
  }

  function robotUIState(): {
    discharges: boolean;
    feedAmount: bigint;
    timeRemaining: number;
    canFeed: boolean;
    cannotFeedReason: string | undefined;
  } {
    const robotDischarges = !!robotComponent?.trigger_at;
    const robotBatterySpace =
      robotComponent && robotParams
        ? computeRobotBatterySpace(robotComponent, robotParams)
        : 0;

    // Only allow feeding the robot up until max charge.
    const feedAmount = Math.min(
      Math.ceil((robotBatterySpace ?? 0) / ROBOT_SECONDS_PER_BLING),
      FEED_ROBOT_BASE_AMOUNT
    );
    const timeRemaining = robotComponent?.trigger_at
      ? clamp(robotComponent?.trigger_at - clock.time, 0, batteryCapacity)
      : 0;

    const blingBalance = localInventory
      ? currencyBalance(localInventory, BikkieIds.bling)
      : 0n;
    const notEnoughBling = blingBalance < BigInt(feedAmount);
    const robotIsFull =
      robotBatterySpace !== undefined &&
      robotBatterySpace < ROBOT_MINIMUM_FILL_S;

    return {
      discharges: robotDischarges,
      feedAmount: BigInt(feedAmount),
      timeRemaining,
      canFeed: !notEnoughBling && !robotIsFull,
      cannotFeedReason: reasonCannotFeedRobot(notEnoughBling, robotIsFull),
    };
  }

  const chipImageUrl = iconUrl(anItem(BikkieIds.robotModule));
  const { discharges, feedAmount, timeRemaining, canFeed, cannotFeedReason } =
    robotUIState();

  const inventoryCellAdditionalClass = (index: number): string => {
    if (index === 0) {
      return "rounded-bl-inner";
    } else if (index === ROBOT_ITEM_SLOTS - 1) {
      return "rounded-br-inner";
    } else {
      return "";
    }
  };
  let draggedItem: ItemAndCount | undefined = undefined;
  if (dragItem && isInventoryDragItem(dragItem)) {
    draggedItem = dragItem.slot;
  }
  return (
    <PaneLayout extraClassName="inventory-left-pane">
      <div className="padded-view form">
        <div>
          <div className="flex aspect-[4/3] items-center justify-center rounded-tl-inner rounded-tr-inner bg-cell-bg shadow-cell-inset">
            <ItemIcon
              item={anItem(BikkieIds.biomesRobot)}
              className="container-icon"
            />
          </div>
          <div className="flex flex-row justify-between pt-[3px]">
            {inventory?.items.map((slot, idx) => (
              <ItemTooltip
                slotType="inventory"
                item={slot?.item}
                key={`item-${idx}`}
              >
                <NormalSlotWithTooltip
                  extraClassName={`robot-inventory ${inventoryCellAdditionalClass(
                    idx
                  )}`}
                  emptyImg={chipImageUrl}
                  disabled={disableSlotPredicate(draggedItem)}
                  entityId={entityId}
                  slot={slot}
                  slotReference={{
                    kind: "item",
                    idx,
                  }}
                  onClick={handleInventorySlotClick}
                />
              </ItemTooltip>
            ))}
          </div>
        </div>
        <section className="w-full">
          <label>Name</label>

          <DialogInputWithButton
            onSubmit={async () => {
              void saveRobotName();
            }}
            value={robotName}
            onChange={(e) => setRobotName(e.target.value)}
            buttonText={"Save"}
            inputProps={{
              placeholder: "Robot Name",
              size: 20,
              maxLength: 20,
              spellCheck: false,
            }}
            showSaveButton={robotName.trim() !== label?.text}
          />
        </section>

        {SHOW_RESTORATION && (
          <section className="w-full">
            <label>Restoration Time</label>
            <div className="flex flex-row gap-1">
              <select
                value={restoreDelayIndex}
                onChange={(v) => {
                  setRestoreDelayIndex(Number(v.target.value));
                }}
              >
                {restoreDelaySettings.map((option, i) => (
                  <option key={i} value={i} selected={restoreDelayIndex === i}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        {discharges && (
          <section className="w-full">
            <label>Robot Charge</label>
            <div className="flex items-center">
              <div className="flex flex-grow gap-0.4">
                <div>
                  {`${shortTimeString(timeRemaining)}/${shortTimeString(
                    batteryCapacity
                  )} remaining`}
                </div>
                <RobotBatteryIcon
                  expiresAt={robotComponent!.trigger_at}
                  batteryCapacity={batteryCapacity}
                />
              </div>
            </div>
          </section>
        )}
      </div>
      <PaneBottomDock>
        <div className="horizontal-button-group">
          <Tooltipped
            tooltip={cannotFeedReason ?? "10 Bling / Day"}
            wrapperExtraClass="w-full"
          >
            <DialogButton
              disabled={!canFeed}
              onClick={() => {
                fireAndForget(
                  events.publish(
                    new FeedRobotEvent({
                      id: entityId,
                      user_id: userId,
                      amount: feedAmount,
                    })
                  )
                );
              }}
            >
              Fill Battery
            </DialogButton>
          </Tooltipped>
          <DialogButton
            onClick={() => {
              reactResources.set("/game_modal", { kind: "empty" });
              void becomeTheNPC(clientContext, entityId);
            }}
          >
            Move Robot
          </DialogButton>
        </div>
      </PaneBottomDock>
    </PaneLayout>
  );
};

export const RobotSettingsScreen: React.FunctionComponent<
  PropsWithChildren<{
    entityId: BiomesId;
  }>
> = ({ entityId, children }) => {
  const deps = useClientContext();
  const { reactResources, userId, events } = deps;
  const label = reactResources.use("/ecs/c/label", entityId);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const moreItems: MoreMenuItem[] = [];

  moreItems.push({
    label: "Place Robot in Inventory",
    onClick: () => {
      reactResources.set("/game_modal", { kind: "empty" });
      fireAndForget(
        events.publish(
          new PickUpRobotEvent({
            id: userId,
            player_id: userId,
            entity_id: entityId,
          })
        )
      );
    },
  });

  return (
    <SplitPaneScreen>
      <ScreenTitleBar title={label?.text ?? "Robot"}>
        <RightBarItem>
          <MiniPhoneMoreItem onClick={() => setShowMoreMenu(true)} />
        </RightBarItem>
        <MoreMenu
          items={moreItems}
          showing={showMoreMenu}
          setShowing={setShowMoreMenu}
        />
      </ScreenTitleBar>
      <RawLeftPane>
        <RobotSettingsLeftPaneContent entityId={entityId} />
      </RawLeftPane>
      <RawRightPane>
        <SelfInventoryRightPane>{children}</SelfInventoryRightPane>
      </RawRightPane>
    </SplitPaneScreen>
  );
};
