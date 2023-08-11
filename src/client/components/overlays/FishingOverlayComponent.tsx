import { BubbleParticles } from "@/client/components/Particles";
import { prettyFishLength } from "@/client/components/chat/CatchMessageView";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { InventoryCellContents } from "@/client/components/inventory/InventoryCellContents";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import {
  getOwnedItems,
  useOwnedItems,
} from "@/client/components/inventory/helpers";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { SegmentedProgressBar } from "@/client/components/system/SegmentedProgressBar";
import {
  ClickIcon,
  ShortcutText,
  getClickIcon,
} from "@/client/components/system/ShortcutText";
import type { FishRecord } from "@/client/game/util/fishing/helpers";
import {
  canCast,
  fetchLeaderboardInfoForCatch,
} from "@/client/game/util/fishing/helpers";
import type {
  BiteFishingInfo,
  CastingFishingInfo,
  CatchGameFishingInfo,
  CaughtFishingInfo,
  CaughtReelingInFishingInfo,
  ChargingCastFishingInfo,
  FailedFishingInfo,
  FishingInfo,
  ReadyToCastFishingInfo,
  WaitingForBiteFishingInfo,
} from "@/client/game/util/fishing/state_machine";
import { useEffectAsync } from "@/client/util/hooks";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import { ordinalize } from "@/client/util/text_helpers";
import { BikkieIds } from "@/shared/bikkie/ids";
import {
  FishingCaughtEvent,
  FishingClaimEvent,
  FishingConsumeBaitEvent,
  FishingFailedEvent,
} from "@/shared/ecs/gen/events";
import {
  OwnedItemReferencesEqual,
  canInventoryAcceptBag,
  getSlotByRef,
  itemRefsWhereTruthy,
  matchingItemRefs,
  maybeGetSlotByRef,
} from "@/shared/game/inventory";
import { anItem } from "@/shared/game/item";
import { fishingBagTransform } from "@/shared/game/items";
import { fireAndForget } from "@/shared/util/async";
import { anyMapValue, onlyMapValue } from "@/shared/util/collections";
import { assertNever } from "@/shared/util/type_helpers";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { capitalize, clamp, isEqual, trim } from "lodash";
import { useEffect, useState } from "react";

const FishingReadyToCastOverlayComponent: React.FunctionComponent<{
  readyToCastInfo: ReadyToCastFishingInfo | FailedFishingInfo;
}> = ({ readyToCastInfo }) => {
  const { reactResources, userId, events } = useClientContext();
  const ownedItems = useOwnedItems(reactResources, userId);
  const localPlayer = reactResources.get("/scene/local_player");
  const selection = reactResources.use("/hotbar/selection");
  const selectionIdx = reactResources.use("/hotbar/index");
  const rod = selection.item;
  const acceptsBait = rod && rod.acceptsBait;
  const baits = itemRefsWhereTruthy(ownedItems, "isBait");

  // eslint-disable-next-line prefer-const
  let [baitIndex, setBaitIndex] = useState(
    readyToCastInfo.baitItemRef
      ? baits.findIndex((e) =>
          OwnedItemReferencesEqual(e, readyToCastInfo.baitItemRef!)
        )
      : -1
  );
  baitIndex = clamp(baitIndex, -1, baits.length);

  const currentBaitRef = baitIndex >= 0 ? baits[baitIndex] : undefined;
  const currentBait = currentBaitRef
    ? getSlotByRef(ownedItems, currentBaitRef)
    : undefined;

  const fishingInfo = localPlayer.fishingInfo;
  if (fishingInfo) {
    fishingInfo.baitItemRef = acceptsBait ? currentBaitRef : undefined;
    fishingInfo.rodItemRef = { kind: "hotbar", idx: selectionIdx.value };
  }

  useEffect(() => {
    localPlayer.player.eagerCancelEmote(events);
  }, []);

  return (
    <div className="selection-inspect-overlay click-message cast-overlay w-full">
      <div className="inspect w-full justify-stretch">
        <div
          className={`flex flex-1 ${
            acceptsBait ? "justify-end" : "justify-center"
          }`}
        >
          <ShortcutText shortcut={<img src={getClickIcon("primary")} />}>
            <ClickIcon type="primary" /> to Cast
          </ShortcutText>
        </div>

        {acceptsBait && (
          <div className="flex-1">
            <ShortcutText
              shortcut="F"
              keyCode="KeyF"
              onKeyDown={() => {
                setBaitIndex(
                  baitIndex === baits.length - 1 ? -1 : baitIndex + 1
                );
              }}
            >
              <div className="flex flex-col">
                {currentBait ? currentBait?.item.displayName : "Switch Bait"}
              </div>
              <div className="cell">
                <InventoryCellContents slot={currentBait} />
              </div>
            </ShortcutText>
          </div>
        )}
      </div>
    </div>
  );
};

const FishingChargingCastComponent: React.FunctionComponent<{
  chargingCastInfo: ChargingCastFishingInfo;
}> = ({ chargingCastInfo }) => {
  const { reactResources, resources, events } = useClientContext();
  const player = reactResources.use("/scene/local_player");

  if (player.player.emoteInfo?.emoteType !== "fishingCastPull") {
    player.player.eagerEmote(events, resources, "fishingCastPull");
  }

  return (
    <div className="fishing-casting">
      <SegmentedProgressBar percentage={chargingCastInfo.powerPct} />
    </div>
  );
};

const FishingCastingComponent: React.FunctionComponent<{
  castingInfo: CastingFishingInfo;
}> = ({ castingInfo }) => {
  const { reactResources, resources, events, audioManager, userId } =
    useClientContext();
  const player = reactResources.use("/scene/local_player");

  useEffect(() => {
    if (player.player.emoteInfo?.emoteType !== "fishingCastRelease") {
      audioManager.playSound("fish_cast");
      const ownedItems = getOwnedItems(resources, userId);
      const bait = maybeGetSlotByRef(ownedItems, castingInfo.baitItemRef);
      player.player.eagerEmote(events, resources, "fishingCastRelease", {
        item_override: undefined,
        throw_info: undefined,
        fishing_info: {
          line_end_position: {
            kind: "physics",
            start: castingInfo.hookStart,
            velocity: castingInfo.hookInitialVelocity,
            gravity: castingInfo.hookGravity,
          },
          line_end_item: bait?.item,
        },
      });
    }
  }, []);

  return <></>;
};

const WaitingForBiteComponent: React.FunctionComponent<{
  waitingForBiteInfo: WaitingForBiteFishingInfo;
}> = ({ waitingForBiteInfo }) => {
  const { reactResources, resources, events, audioManager } =
    useClientContext();
  const player = reactResources.use("/scene/local_player");

  useEffect(() => {
    if (player.player.emoteInfo?.emoteType !== "fishingIdle") {
      audioManager.playSound("fish_cast_land_water");
      player.player.eagerEmote(events, resources, "fishingIdle", {
        item_override: undefined,
        throw_info: undefined,
        fishing_info: {
          line_end_position: {
            kind: "fixed",
            pos: waitingForBiteInfo.surfacePosition,
          },
          line_end_item: undefined,
        },
      });
    }
  }, []);
  return <></>;
};

const BiteComponent: React.FunctionComponent<{
  biteInfo: BiteFishingInfo;
}> = ({ biteInfo }) => {
  const { resources, events, userId } = useClientContext();

  useEffect(() => {
    return () => {
      const ownedItems = getOwnedItems(resources, userId);
      const bait = maybeGetSlotByRef(ownedItems, biteInfo.baitItemRef);
      if (bait) {
        fireAndForget(
          events.publish(
            new FishingConsumeBaitEvent({
              id: userId,
              item_id: bait.item.id,
              ref: biteInfo.baitItemRef,
            })
          )
        );
      }
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0 }}
        animate={{
          scale: [1, 1.1],
          transition: {
            repeat: Infinity,
            type: "spring",
            bounce: 1,
            duration: 0.25,
          },
        }}
        exit={{ scale: 1, opacity: 0 }}
        className="fishing-bite"
      >
        <img src={getClickIcon("primary")} />
      </motion.div>
    </AnimatePresence>
  );
};

const CatchGameIcon: React.FunctionComponent<{
  catchingInfo: CatchGameFishingInfo;
}> = ({ catchingInfo }) => {
  switch (catchingInfo.catchType) {
    case "treasure":
      return <ItemIcon item={anItem(BikkieIds.treasureChest)} />;
    default:
      return <ItemIcon item={anItem(BikkieIds.mackerel)} />;
  }
};

const CatchGameComponent: React.FunctionComponent<{
  catchingInfo: CatchGameFishingInfo;
}> = ({ catchingInfo }) => {
  const { input, reactResources, resources, events, audioManager } =
    useClientContext();
  const player = reactResources.use("/scene/local_player");

  if (input.motion("primary_hold")) {
    audioManager.playSound("fish_reel", {
      idempotent: true,
    });
  }

  if (player.player.emoteInfo?.emoteType !== "fishingReel") {
    player.player.eagerEmote(events, resources, "fishingReel", {
      item_override: undefined,
      throw_info: undefined,
      fishing_info: {
        line_end_position: {
          kind: "fixed",
          pos: catchingInfo.surfacePosition,
        },
        line_end_item: undefined,
      },
    });
  }

  const inZone =
    catchingInfo.fishPosition >=
      catchingInfo.catchBarPosition - catchingInfo.catchBarSize / 2 &&
    catchingInfo.fishPosition <=
      catchingInfo.catchBarPosition + catchingInfo.catchBarSize / 2;

  const catchMeterProgress = useMotionValue(0);

  useEffect(() => {
    catchMeterProgress.set(catchingInfo.catchMeterPercentage);
  }, [catchingInfo.catchMeterPercentage]);

  const backgroundColor = useTransform(
    catchMeterProgress,
    [0, 0.33, 0.66],
    ["#f0545b", "#f4d027", "#67ab2b"]
  );

  return (
    <div
      className="fish-minigame
        bar biomes-box"
    >
      <div className="catch-progress-container">
        <motion.div
          className="catch-progress"
          style={{
            backgroundColor,
            width: `${catchingInfo.catchMeterPercentage * 100}%`,
          }}
        />
      </div>
      <div
        className={`catch-bar ${inZone ? "in" : ""} ${
          catchingInfo.inMuck ? "muck" : ""
        }
                  ${catchingInfo.inCave ? "cave" : ""}
            `}
      >
        <BubbleParticles />
        <div
          className="catch-line"
          style={{
            height: `${
              (1 -
                catchingInfo.catchBarPosition -
                catchingInfo.catchBarSize / 2.0) *
              100
            }%`,
          }}
        />
        <div
          className="catch-zone"
          style={{
            height: `${catchingInfo.catchBarSize * 100}%`,
            bottom: `${
              (catchingInfo.catchBarPosition -
                catchingInfo.catchBarSize / 2.0) *
              100
            }%`,
          }}
        />

        <motion.div
          className="fish"
          style={{
            bottom: `${catchingInfo.fishPosition * 100}%`,
          }}
          initial={{ y: "50%" }}
          animate={{
            x: ["-55%", "-50%", "-45%", "-50%", "-51%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: "mirror",
          }}
        >
          <CatchGameIcon catchingInfo={catchingInfo} />
        </motion.div>
      </div>
    </div>
  );
};

const CaughtReelingInComponent: React.FunctionComponent<{
  reelingInInfo: CaughtReelingInFishingInfo;
}> = ({ reelingInInfo }) => {
  const { reactResources, resources, events, userId } = useClientContext();
  const player = reactResources.use("/scene/local_player");

  const heroItem = anyMapValue(reelingInInfo.contents);

  useEffect(() => {
    if (player.player.emoteInfo?.emoteType !== "fishingCastPull") {
      const ownedItems = getOwnedItems(resources, userId);
      const bait = maybeGetSlotByRef(ownedItems, reelingInInfo.baitItemRef);

      player.player.eagerEmote(events, resources, "fishingCastPull", {
        item_override: undefined,
        throw_info: undefined,
        fishing_info: {
          line_end_position: {
            kind: "reel_in",
            start: reelingInInfo.surfacePosition,
            duration: 1.0,
          },
          line_end_item: heroItem?.item ?? bait?.item,
        },
      });
    }

    return () => {
      if (!heroItem) {
        // Next state is empty, so cancel emote
        player.player.eagerCancelEmote(events);
      }
    };
  }, []);

  return <></>;
};

const RenderFishRecord: React.FunctionComponent<{
  fishRecord: FishRecord;
}> = ({ fishRecord }) => {
  const { socialManager } = useClientContext();
  const nextUser = useCachedUserInfo(
    socialManager,
    fishRecord.kind === "leaderboard_pos" ? fishRecord.nextUserId : undefined
  );
  switch (fishRecord.kind) {
    case "leaderboard_pos":
      const fishName = fishRecord.scopedToId
        ? anItem(fishRecord.scopedToId).displayName
        : undefined;
      const posString = capitalize(
        trim(
          `${
            fishRecord.rank === 0 ? "" : ordinalize(fishRecord.rank + 1)
          } largest ${fishName ? fishName : "catch"} ${
            fishRecord.window === "all_time" ? "ever" : "this week"
          }!`
        )
      );

      return (
        <div>
          {posString}{" "}
          {nextUser && (
            <span>
              You beat {nextUser.user.username}&rsquo;s{" "}
              {prettyFishLength(fishRecord.nextValue ?? 0)}
            </span>
          )}{" "}
        </div>
      );
    case "personal_record":
      return <div className="fish-personal-record">Personal record!</div>;
    default:
      assertNever(fishRecord);
      return <></>;
  }
};

const CaughtComponent: React.FunctionComponent<{
  caughtInfo: CaughtFishingInfo;
  fishRecord?: FishRecord[];
}> = ({ caughtInfo, fishRecord }) => {
  const { userId, reactResources, resources, events, socialManager } =
    useClientContext();
  const player = reactResources.use("/scene/local_player");
  const inventory = reactResources.use("/ecs/c/inventory", userId);
  const heroItem = anyMapValue(caughtInfo.contents)!;
  const [claiming, setClaiming] = useState(false);

  const inventoryFull = !canInventoryAcceptBag({
    inventory,
    itemBag: fishingBagTransform(caughtInfo.contents),
  });

  useEffect(() => {
    socialManager.eagerInvalidateLeaderboard(userId, {
      kind: "fished_length",
      id: heroItem.item.id,
    });
    socialManager.eagerInvalidateLeaderboard(userId, {
      kind: "fished_length",
    });

    if (player.player.emoteInfo?.emoteType !== "fishingShow") {
      player.player.eagerEmote(events, resources, "fishingShow", {
        item_override: heroItem.item,
        throw_info: undefined,
        fishing_info: {
          line_end_position: undefined,
          line_end_item: undefined,
        },
      });
    }

    fireAndForget(
      events.publish(
        new FishingCaughtEvent({
          id: userId,
          bag: caughtInfo.contents,
        })
      )
    );
  }, []);

  const heroLength = heroItem.item.fishLength ?? 0;
  const heroName = heroItem.item.displayName;

  const title = `${
    heroLength > 0 && caughtInfo.catchType !== "treasure"
      ? prettyFishLength(heroLength)
      : ""
  } ${heroName}`;

  // Reset to the ready to cast state, carrying over rod and bait used.
  function resetToReadyToCast() {
    player.fishingInfo = {
      state: "ready_to_cast",
      rodItemRef: caughtInfo.rodItemRef,
      baitItemRef: caughtInfo.baitItemRef,
      start: 0,
    };
    player.player.eagerCancelEmote(events);
  }

  function claimFishAndPrepareCast() {
    if (claiming || inventoryFull) {
      return;
    }

    setClaiming(true);

    fireAndForget(
      events.publish(
        new FishingClaimEvent({
          id: userId,
          bag: caughtInfo.contents,
          tool_ref: caughtInfo.rodItemRef,
          catch_time: caughtInfo.catchTime,
        })
      )
    );

    if (caughtInfo.catchType === "treasure") {
      const treasure = onlyMapValue(caughtInfo.contents);
      const start = performance.now();
      const handle = setInterval(() => {
        if (performance.now() - start > 15 * 1000) {
          setClaiming(false);
          clearInterval(handle);
          return;
        }

        const ownedItems = getOwnedItems(reactResources, userId);
        const resolvedRef = matchingItemRefs(ownedItems, (e) =>
          Boolean(e && isEqual(e.item, treasure.item))
        );

        if (resolvedRef.length > 0) {
          clearInterval(handle);
          setClaiming(false);
          reactResources.set("/game_modal", {
            kind: "treasure_reveal",
            ref: resolvedRef[0],
          });

          resetToReadyToCast();
        }
      }, 100);
    } else {
      resetToReadyToCast();
    }
  }

  const shortcuts: InspectShortcuts = [];
  shortcuts.push({
    title: inventoryFull ? "Inventory full — free space to claim" : "Keep",
    disabled: inventoryFull,
    onKeyDown: () => claimFishAndPrepareCast(),
  });

  if (inventoryFull) {
    shortcuts.push({
      title: "Release",
      onKeyDown: () => resetToReadyToCast(),
    });
  }

  return (
    <CursorInspectionComponent
      customHeader={
        <div className="fish-records">
          {fishRecord?.map((e) => (
            <RenderFishRecord
              key={`${e.kind}-${e.window}-${e.scopedToId}`}
              fishRecord={e}
            />
          ))}
        </div>
      }
      title={title}
      shortcuts={shortcuts}
    />
  );
};

const FailedComponent: React.FunctionComponent<{
  failedInfo: FailedFishingInfo;
}> = ({ failedInfo }) => {
  const { reactResources, events, userId } = useClientContext();
  const player = reactResources.use("/scene/local_player");

  useEffect(() => {
    fireAndForget(
      events.publish(
        new FishingFailedEvent({
          id: userId,
          tool_ref: failedInfo.rodItemRef,
          catch_time: failedInfo.catchTime,
        })
      )
    );
    // Pull the rod out of the water.
    player.player.eagerCancelEmote(events);
  }, []);
  return (
    <div className="inspect-overlay click-message">
      <motion.div
        animate={{ opacity: [1, 1, 1, 0], y: ["0%", "-20%"] }}
        transition={{ duration: 2 }}
        className="inspect"
      >
        It got away!
      </motion.div>
    </div>
  );
};

function extractLeaderboardableCatch(fishingInfo?: FishingInfo) {
  if (!fishingInfo) {
    return undefined;
  }

  switch (fishingInfo.state) {
    case "catching":
    case "caught_reeling_in":
    case "caught":
      if (fishingInfo.catchType === "normal") {
        return anyMapValue(fishingInfo.contents);
      }
      return undefined;

    default:
      return undefined;
  }
}

export const FishingHotBarComponent: React.FunctionComponent<{}> = ({}) => {
  const { resources, reactResources } = useClientContext();
  const player = reactResources.use("/scene/local_player");
  if (!player.fishingInfo) {
    return <></>;
  }

  if (
    (player.fishingInfo.state === "failed" &&
      canCast(resources, player.fishingInfo)) ||
    player.fishingInfo.state === "ready_to_cast"
  ) {
    return (
      <FishingReadyToCastOverlayComponent
        readyToCastInfo={player.fishingInfo}
      />
    );
  } else {
    return <></>;
  }
};

export const FishingOverlayComponent: React.FunctionComponent<{}> = ({}) => {
  const { userId, reactResources } = useClientContext();
  const player = reactResources.use("/scene/local_player");
  const [leaderboardInfo, setLeaderboardInfo] = useState<
    FishRecord[] | undefined
  >();
  const heroCatch = extractLeaderboardableCatch(player.fishingInfo);
  useEffectAsync(async () => {
    if (!heroCatch) {
      setLeaderboardInfo(undefined);
    } else {
      setLeaderboardInfo(
        await fetchLeaderboardInfoForCatch(userId, heroCatch.item)
      );
    }
  }, [heroCatch?.item?.id, heroCatch?.item?.payload]);

  if (!player.fishingInfo) {
    return <></>;
  }

  switch (player.fishingInfo.state) {
    case "charging_cast":
      return (
        <FishingChargingCastComponent chargingCastInfo={player.fishingInfo} />
      );
    case "casting":
      return <FishingCastingComponent castingInfo={player.fishingInfo} />;
    case "waiting_for_bite":
      return (
        <WaitingForBiteComponent waitingForBiteInfo={player.fishingInfo} />
      );
    case "bite":
      return <BiteComponent biteInfo={player.fishingInfo} />;
    case "catching":
      return <CatchGameComponent catchingInfo={player.fishingInfo} />;
    case "caught":
      return (
        <CaughtComponent
          caughtInfo={player.fishingInfo}
          fishRecord={leaderboardInfo}
        />
      );
    case "caught_reeling_in":
      return <CaughtReelingInComponent reelingInInfo={player.fishingInfo} />;
    case "failed":
      return <FailedComponent failedInfo={player.fishingInfo} />;
    case "ready_to_cast":
      return <></>;
    default:
      assertNever(player.fishingInfo);
      return <></>;
  }
};
