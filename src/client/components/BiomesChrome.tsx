import { NotificationPopups } from "@/client/components/activity/NotificationPopups";
import { AnonUpsell } from "@/client/components/AnonUpsell";
import { BuffsHUD } from "@/client/components/BuffsHUD";
import { CanvasEffects } from "@/client/components/CanvasEffects";
import { ChatHUD } from "@/client/components/ChatHUD";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { usePointerLockStatus } from "@/client/components/contexts/PointerLockContext";
import { Crosshair } from "@/client/components/Crosshair";
import { CSS3DContainer } from "@/client/components/css3d/CSS3DContainer";
import { EscGameMenu } from "@/client/components/EscGameMenu";
import { GameErrorOverlay } from "@/client/components/GameErrorOverlay";
import { PureGameModalController } from "@/client/components/GameModalController";
import { GameOutOfDateOverlay } from "@/client/components/GameOutOfDateOverlay";
import { InGameAdminHUD } from "@/client/components/InGameAdminHUD";
import { HotBar } from "@/client/components/inventory/HotBar";
import { InventoryController } from "@/client/components/inventory/InventoryController";
import { MaybeJoystickInput } from "@/client/components/JoystickInput";
import { NavigationAidCircle } from "@/client/components/map/NavigationAidCircle";
import {
  CenterHUD,
  TopLeftHUD,
} from "@/client/components/minigames/MinigamesHUD";
import { NetworkErrorHUD } from "@/client/components/NetworkErrorHUD";
import { NUXHUD } from "@/client/components/NUXHUD";
import { LocationNameOverlayComponent } from "@/client/components/overlays/LocationNameOverlayComponent";
import { OverlayView } from "@/client/components/overlays/OverlayView";
import { QuestsAndMiniMapHUD } from "@/client/components/QuestAndMinimapHUD";
import { QuestSideEffects } from "@/client/components/QuestSideEffects";
import { RulesetToggleable } from "@/client/components/RulsetToggleable";
import { inInputElement, ShortcutsHUD } from "@/client/components/ShortcutsHUD";
import { SpatialMediaPlayers } from "@/client/components/SpatialMediaPlayer";
import { ToastsHUD } from "@/client/components/toast/ToastsHUD";
import { UnsupportedBrowserHUD } from "@/client/components/UnsupportedBrowserHUD";
import { WakeUpScreen } from "@/client/components/WakeUpScreen";
import type { GameModal } from "@/client/game/resources/game_modal";
import type { GlobalKeyCode } from "@/client/game/util/keyboard";
import { MovementKeys } from "@/client/game/util/keyboard";
import { cleanListener } from "@/client/util/helpers";
import {
  useHistoryObserverSwitches,
  useIsObserving,
} from "@/client/util/observer";
import { useTypedStorageItem } from "@/client/util/typed_local_storage";
import { IdleChangeEvent } from "@/shared/ecs/gen/events";
import { fireAndForget } from "@/shared/util/async";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { PropsWithChildren } from "react";
import React, { useEffect, useState } from "react";

const TopRightHUD: React.FunctionComponent<{}> = ({}) => {
  const [showPerformanceHUD] = useTypedStorageItem(
    "settings.hud.showPerformance",
    true
  );

  return (
    <div className="perf-hud">
      {showPerformanceHUD && (
        <>
          <PerformanceStats defaultPanel={0} />
          <ReportButton />
        </>
      )}
    </div>
  );
};

const ReportButton: React.FunctionComponent<{}> = ({}) => {
  const { reactResources } = useClientContext();
  return (
    <>
      <div
        className="report-button-hud"
        onClick={() => {
          reactResources.set("/game_modal", {
            kind: "report_bug",
          });
        }}
      >
        Report Issue
      </div>
    </>
  );
};

const PerformanceStats = dynamic(
  () => import("@/client/components/PerformanceStats"),
  {
    ssr: false,
  }
);

const InGameCameraHUD = dynamic(
  () => import("@/client/components/InGameCameraHUD"),
  {
    ssr: false,
  }
);

const HideWhenUnlocked: React.FunctionComponent<
  PropsWithChildren<{ override?: boolean | null }>
> = React.memo(({ override, children }) => {
  const [locked] = usePointerLockStatus();
  const hide = !locked && !override;
  return <div className={hide ? "hidden" : ""}>{children}</div>;
});

const HideWhenChromelessModalShowing: React.FunctionComponent<
  PropsWithChildren<{}>
> = React.memo(({ children }) => {
  const { reactResources } = useClientContext();
  const gameModal = reactResources.use("/game_modal");
  const allowedKinds: GameModal["kind"][] = [
    "death",
    "talk_to_npc",
    "treasure_reveal",
    "staleSession",
    "talk_to_robot",
  ];
  const hide = allowedKinds.includes(gameModal.kind);
  return <div className={hide ? "hidden" : ""}>{children}</div>;
});

const NonObserverOnly: React.FunctionComponent<PropsWithChildren<{}>> =
  React.memo(({ children }) => {
    const observing = useIsObserving();
    return !observing ? <>{children}</> : <></>;
  });

const ObserverModeOnly: React.FunctionComponent<PropsWithChildren<{}>> =
  React.memo(({ children }) => {
    const observing = useIsObserving();
    return observing ? <>{children}</> : <></>;
  });

const HideWhenModalShowing: React.FunctionComponent<PropsWithChildren<{}>> =
  React.memo(({ children }) => {
    const { reactResources } = useClientContext();
    const [gameModal, activeTab] = reactResources.useAll(
      ["/game_modal"],
      ["/game_modal/active_tab"]
    );

    let hide = false;
    if (gameModal.kind === "tabbed_pause") {
      hide =
        activeTab.kind === "tabbed_pause" && activeTab.activeTab !== undefined;
    } else {
      hide = gameModal.kind !== "empty";
    }

    return <div className={hide ? "hidden" : ""}>{children}</div>;
  });

const HidesForChromeHidden: React.FunctionComponent<PropsWithChildren<{}>> = ({
  children,
}) => {
  const { clientConfig, reactResources } = useClientContext();
  const [userHidChrome, setUserHidChrome] = useState(clientConfig.hideChrome);
  const effectVal = reactResources.use("/canvas_effects/hide_chrome");
  useEffect(
    () =>
      cleanListener(window, {
        keydown: (event: KeyboardEvent) => {
          const lk = event.code as GlobalKeyCode;
          if (event.repeat) return;
          if (event.altKey || event.ctrlKey || event.metaKey) return;

          if (inInputElement(event)) {
            setUserHidChrome(false);
            return;
          }

          if (lk === "Period") {
            setUserHidChrome(!userHidChrome);
          } else if (!MovementKeys.includes(lk)) {
            setUserHidChrome(false);
          }
        },
      }),
    [userHidChrome]
  );

  const effectHidChrome = effectVal.value;
  const hide = userHidChrome || effectHidChrome;
  const disableAnimation = Boolean(effectVal?.disableAnimation);

  return (
    <motion.div
      animate={{ opacity: hide ? 0 : 1 }}
      transition={{ duration: disableAnimation ? 0 : 0.2 }}
      className="select-none"
    >
      {children}
    </motion.div>
  );
};

const HistorySideEffects: React.FunctionComponent<{}> = () => {
  const { io } = useClientContext();
  useHistoryObserverSwitches(io);

  return <></>;
};

const NonObserverDocumentSideEffects: React.FunctionComponent<{}> = () => {
  const { events, userId } = useClientContext();
  useEffect(
    () =>
      cleanListener(document, {
        visibilitychange: () => {
          fireAndForget(
            events.publish(
              new IdleChangeEvent({
                id: userId,
                idle: document.visibilityState !== "visible",
              })
            )
          );
        },
      }),
    []
  );
  return <></>;
};

export const BiomesChrome: React.FunctionComponent<{}> = React.memo(({}) => {
  const [keepOverlaysVisible] = useTypedStorageItem(
    "settings.hud.keepOverlaysVisible",
    null
  );

  return (
    <>
      <HistorySideEffects />
      <MaybeJoystickInput />
      <SpatialMediaPlayers />
      <CanvasEffects />
      <CSS3DContainer />
      <WakeUpScreen />

      <NonObserverOnly>
        <NonObserverDocumentSideEffects />
      </NonObserverOnly>

      <HidesForChromeHidden>
        <HideWhenUnlocked>
          <Crosshair />
          <RulesetToggleable name="challenges">
            <NavigationAidCircle />
          </RulesetToggleable>
        </HideWhenUnlocked>

        <NonObserverOnly>
          <HideWhenUnlocked override={keepOverlaysVisible}>
            <HideWhenModalShowing>
              <OverlayView />
            </HideWhenModalShowing>
          </HideWhenUnlocked>
          <InventoryController>
            <PureGameModalController />
          </InventoryController>
          <InGameCameraHUD />
        </NonObserverOnly>

        <UnsupportedBrowserHUD />
        <NetworkErrorHUD />
        <GameErrorOverlay />
        <GameOutOfDateOverlay />

        <NonObserverOnly>
          <HideWhenModalShowing>
            <TopRightHUD />
            <TopLeftHUD />
            <CenterHUD />
            <RulesetToggleable name="locationName">
              <LocationNameOverlayComponent />
            </RulesetToggleable>
            <EscGameMenu />
            <QuestsAndMiniMapHUD />
          </HideWhenModalShowing>
          <HideWhenChromelessModalShowing>
            <BuffsHUD />
            <NotificationPopups />
            <RulesetToggleable name="nux">
              <NUXHUD />
            </RulesetToggleable>
            <ChatHUD />
            <ToastsHUD />
          </HideWhenChromelessModalShowing>

          <QuestSideEffects />

          <HotBar />
          <ShortcutsHUD />
          <InGameAdminHUD />
        </NonObserverOnly>

        <ObserverModeOnly>
          <AnonUpsell />
        </ObserverModeOnly>
      </HidesForChromeHidden>
    </>
  );
});
