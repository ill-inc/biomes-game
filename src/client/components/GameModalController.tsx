import { BiomesTabbedPauseModal } from "@/client/components/BiomesTabbedPauseMenu";
import { GraphicsPreviewSettingsModal } from "@/client/components/GraphicsSettings";
import { TextSignConfigureModal } from "@/client/components/TextSignConfigureModal";
import { TalkToNPCScreen } from "@/client/components/challenges/TalkToNPCScreen";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { usePointerLockManager } from "@/client/components/contexts/PointerLockContext";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { TreasureRevealModal } from "@/client/components/inventory/TreasureRevealModal";
import { MinigamePlaceableConfigureModal } from "@/client/components/minigames/MinigamePlaceableConfigureModal";
import { DeathModal } from "@/client/components/modals/DeathModal";
import { HomestoneModal } from "@/client/components/modals/HomestoneModal";
import { PushNotificationFlow } from "@/client/components/modals/PushNotificationFlow";
import { StaleSessionModal } from "@/client/components/modals/StaleSessionModal";
import {
  ImmersiveSignModal,
  TalkToRobotModal,
} from "@/client/components/modals/robot/TalkToRobotModal";
import { ReportFlow } from "@/client/components/social/ReportFlow";
import { GenericMiniPhone } from "@/client/components/system/GenericMiniPhone";
import { HUDModal } from "@/client/components/system/HUDModal";
import { MiniPhoneAsyncTaskController } from "@/client/components/system/tasks/MiniPhoneAsyncTaskController";
import { throwInventoryItem } from "@/client/game/helpers/inventory";
import type { LocalKeyCode } from "@/client/game/util/keyboard";
import { cleanListener } from "@/client/util/helpers";
import { fireAndForget } from "@/shared/util/async";
import { makeCvalHook } from "@/shared/util/cvals";
import { assertNever } from "@/shared/util/type_helpers";
import React, { useCallback, useEffect, useRef } from "react";

export function GameModalController() {
  const pointerLockManager = usePointerLockManager();
  const context = useClientContext();
  const gameModal = context.reactResources.use("/game_modal");
  const gameModalVersion = context.reactResources.version("/game_modal");
  const lastVisibilityTime = useRef(0);
  const lastRelevantKeydownTime = useRef(0);
  const { dragItem, setDragItem } = useInventoryDraggerContext();
  const lastModal = useRef<typeof gameModal>({ ...gameModal });

  useEffect(() => {
    if (context.pushManager.shouldPromptForPermission()) {
      context.reactResources.set("/game_modal", {
        kind: "push_permissions",
      });
    }

    if (context.pushManager.shouldRegisterPermission()) {
      fireAndForget(context.pushManager.registerPushPermission());
    }
  }, []);

  // When modal closes / opens / changes
  useEffect(() => {
    if (gameModal.kind !== "empty") {
      pointerLockManager.unlock();
      lastModal.current = { ...gameModal };
    } else {
      if (lastModal.current.onClose) {
        lastModal.current.onClose();
      }

      if (lastModal.current.kind === "inventory") {
        context.audioManager.playSound("inventory_close");
      }
      setDragItem(null);
      if (gameModal.returnPointerLock ?? true) {
        pointerLockManager.focusAndLock();
      }

      context.reactResources.set("/game_modal/active_tab", {
        kind: "empty",
      });

      lastModal.current = { ...gameModal };
    }
  }, [gameModalVersion]);

  useEffect(() => {
    return cleanListener(window, {
      keydown: (e) => {
        if (e.altKey || e.metaKey) {
          lastRelevantKeydownTime.current = performance.now();
        }
      },
      keyup: (e) => {
        if (e.altKey || e.metaKey) {
          lastRelevantKeydownTime.current = performance.now();
        }
      },
    });
  }, []);

  useEffect(() => {
    makeCvalHook({
      path: ["game", "visibilityState"],
      help: "Current document visibilityState.",
      collect: () => document.visibilityState,
    });

    const isActive = () => {
      return (
        pointerLockManager.isLocked() ||
        pointerLockManager.isEntering ||
        document.visibilityState === "visible"
      );
    };

    let inactiveTimeout: NodeJS.Timeout | undefined;
    const updateInactiveTimeout = () => {
      if (isActive()) {
        if (inactiveTimeout) {
          clearTimeout(inactiveTimeout);
          inactiveTimeout = undefined;
        }
      } else if (!inactiveTimeout) {
        inactiveTimeout = setTimeout(() => {
          inactiveTimeout = undefined;
          if (isActive()) {
            return;
          }
          context.reactResources.set("/game_modal", {
            kind: "staleSession",
          });
        }, 1 * 60 * 60 * 1000); // 1 hour.
      }
    };

    const listnersCleanup = cleanListener(document, {
      visibilitychange: () => {
        lastVisibilityTime.current = performance.now();
        updateInactiveTimeout();
      },
      pointerlockchange: () => {
        // You can get into a race condition if you tear down these listeners too often
        const gameModal = context.reactResources.get("/game_modal");
        if (
          !pointerLockManager.isLocked() &&
          !pointerLockManager.isEntering &&
          gameModal.kind === "empty" &&
          document.visibilityState === "visible" &&
          performance.now() - lastVisibilityTime.current > 200 &&
          performance.now() - lastRelevantKeydownTime.current > 2000
        ) {
          context.reactResources.set("/game_modal", {
            kind: "tabbed_pause",
          });
        } else if (
          pointerLockManager.isLocked() &&
          gameModal.kind !== "empty"
        ) {
          close();
        }
        updateInactiveTimeout();
      },
    });
    return () => {
      listnersCleanup();
      if (inactiveTimeout) {
        clearTimeout(inactiveTimeout);
      }
    };
  }, []);

  const close = useCallback(() => {
    context.reactResources.set("/game_modal", {
      kind: "empty",
    });
  }, []);

  const handlePoofAreaClick = useCallback(() => {
    if (!dragItem || dragItem.kind != "inventory_drag") {
      setDragItem(null);
      // Return false to note that we did not handle this event
      return false;
    }
    fireAndForget(
      throwInventoryItem(
        context,
        dragItem.entityId,
        dragItem.slotReference,
        dragItem.quantity
      )
    );
    setDragItem(null);
    return true;
  }, [dragItem]);

  const handleDismiss = useCallback(() => {
    if (!handlePoofAreaClick()) {
      close();
    }
  }, [close, handlePoofAreaClick]);

  if (!gameModal || gameModal.kind === "empty") {
    return <></>;
  }

  let child: JSX.Element;
  let dismissKeyCode: LocalKeyCode | undefined;
  let allowClickToDismiss = true;
  switch (gameModal.kind) {
    case "generic_miniphone":
      child = (
        <GenericMiniPhone
          onClose={close}
          rootPayload={gameModal.rootPayload}
          key={gameModalVersion}
        />
      );
      allowClickToDismiss = gameModal.allowClickToDismiss ?? true;
      break;
    case "push_permissions":
      child = <PushNotificationFlow onCancel={close} key={gameModalVersion} />;
      break;
    case "challenges":
      child = (
        <BiomesTabbedPauseModal
          onClose={close}
          defaultOverrideVersion={gameModalVersion}
          defaultTab="map"
        />
      );
      break;
    case "chat":
      child = <BiomesTabbedPauseModal onClose={close} key={gameModalVersion} />;
      break;
    case "inbox":
      child = (
        <BiomesTabbedPauseModal
          onClose={close}
          defaultOverrideVersion={gameModalVersion}
          defaultTab="inbox"
        />
      );
      break;
    case "report_bug":
      child = (
        <ReportFlow
          target={{
            kind: "bug",
          }}
          onClose={close}
          key={gameModalVersion}
        />
      );
      break;
    case "crafting":
      child = (
        <BiomesTabbedPauseModal
          onClose={close}
          defaultOverrideVersion={gameModalVersion}
          defaultTab="crafting"
          craftingPayload={gameModal.payload}
        />
      );
      break;

    case "collections":
      child = (
        <BiomesTabbedPauseModal
          onClose={close}
          defaultOverrideVersion={gameModalVersion}
          defaultTab="collections"
        />
      );
      break;

    case "game_settings":
      child = (
        <BiomesTabbedPauseModal
          onClose={close}
          defaultOverrideVersion={gameModalVersion}
          defaultTab="settings"
        />
      );
      break;
    case "inventory":
      child = (
        <BiomesTabbedPauseModal
          onClose={close}
          defaultOverrideVersion={gameModalVersion}
          defaultTab={"inventory"}
        />
      );
      break;
    case "async_task":
      child = (
        <MiniPhoneAsyncTaskController
          rootScreen={{
            kind: "async_task",
            task: gameModal.task,
          }}
          onClose={() => {
            close();
          }}
          key={gameModalVersion}
        />
      );
      break;
    case "map":
      child = (
        <BiomesTabbedPauseModal
          onClose={close}
          defaultOverrideVersion={gameModalVersion}
          defaultTab="map"
        />
      );
      break;
    case "tabbed_pause":
      child = (
        <BiomesTabbedPauseModal
          onClose={close}
          defaultOverrideVersion={gameModalVersion}
        />
      );
      break;
    case "death":
      child = <DeathModal onClose={() => {}} />;
      allowClickToDismiss = false;
      break;
    case "staleSession":
      child = <StaleSessionModal />;
      allowClickToDismiss = false;
      break;
    case "homestone":
      child = <HomestoneModal onClose={close} />;
      allowClickToDismiss = false;
      break;
    case "graphics_preview":
      child = (
        <GraphicsPreviewSettingsModal
          onClose={close}
          lastModal={gameModal.lastModal}
        />
      );
      allowClickToDismiss = false;
      break;
    case "talk_to_npc":
      child = (
        <TalkToNPCScreen
          talkingToNPCId={gameModal.talkingToNPCId}
          onClose={close}
        />
      );
      break;
    case "treasure_reveal":
      child = (
        <TreasureRevealModal ownedItemRef={gameModal.ref} onClose={close} />
      );
      break;
    case "immersive_sign":
      child = <ImmersiveSignModal entityId={gameModal.entityId} />;
      break;
    case "talk_to_robot":
      child = (
        <TalkToRobotModal entityId={gameModal.entityId} onClose={close} />
      );
      break;
    case "minigame_placeable_configure":
      child = (
        <MinigamePlaceableConfigureModal
          onClose={close}
          placeableId={gameModal.placeableId}
        />
      );
      allowClickToDismiss = false;
      break;
    case "text_sign_configure_modal":
      child = (
        <TextSignConfigureModal
          onClose={close}
          placeableId={gameModal.placeableId}
        />
      );
      allowClickToDismiss = false;
      break;
    default:
      assertNever(gameModal);
      throw new Error(`Unsupported modal type '${gameModal}'!`);
  }

  return (
    <HUDModal
      onDismissal={handleDismiss}
      dismissKeyCode={dismissKeyCode}
      allowClickToDismiss={allowClickToDismiss}
    >
      {child}
    </HUDModal>
  );
}

export const PureGameModalController = React.memo(GameModalController);
