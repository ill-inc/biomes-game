import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { usePointerLockManager } from "@/client/components/contexts/PointerLockContext";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import type { GameModal } from "@/client/game/resources/game_modal";
import type { GlobalKeyCode } from "@/client/game/util/keyboard";
import { cleanListener } from "@/client/util/helpers";
import type { Inventory, Label } from "@/shared/ecs/gen/components";
import { includes } from "lodash";
import React, { useCallback, useEffect, useRef } from "react";

export function inInputElement(event: KeyboardEvent) {
  const target = event.target as HTMLDivElement;
  return target && includes(["TEXTAREA", "INPUT"], target.tagName);
}

export const ShortcutsHUD: React.FunctionComponent<{}> = ({}) => {
  const { userId, reactResources, audioManager } = useClientContext();

  const pointerLockManager = usePointerLockManager();
  const returnPointerLock = useRef<boolean>();
  const lastInputKeydown = useRef(performance.now());
  const [gameModal] = reactResources.useAll(
    ["/game_modal"],
    ["/ecs/c/label", userId],
    ["/ecs/c/inventory", userId]
  ) as [GameModal, Label, Inventory];

  const { setDragItem } = useInventoryDraggerContext();

  useEffect(
    () =>
      cleanListener(window, {
        keydown: (event: KeyboardEvent) => {
          const lk = event.code as GlobalKeyCode;
          if (event.repeat) return;
          if (event.altKey || event.ctrlKey || event.metaKey) return;

          const inInputEl = inInputElement(event);
          if (inInputEl) {
            lastInputKeydown.current = performance.now();
          } else {
            if (
              (lk == "KeyW" || lk == "KeyA" || lk == "KeyS" || lk == "KeyD") &&
              gameModal.kind === "tabbed_pause"
            ) {
              pointerLockManager.focusAndLock();
            }

            switch (lk) {
              case "KeyE":
              case "KeyI":
                toggleInventoryModal();
                break;
              case "KeyR":
                toggleCraftingModal();
                break;
              case "KeyV":
                toggleInboxModal();
                break;
              case "KeyC":
                toggleCollectionsModal();
                break;
              case "KeyQ":
                toggleMapModal();
                break;
              case "KeyM":
                toggleMapModal();
                break;
              case "KeyO":
                toggleSettingsModal();
                break;
            }
          }
        },

        keyup: (event: KeyboardEvent) => {
          const lk = event.code as GlobalKeyCode;
          if (lk === "Escape") {
            returnPointerLock.current = true;
            doCloseModal();
          }
        },
      }),
    []
  );

  const doCloseModal = () => {
    reactResources.set("/game_modal", {
      kind: "empty",
      returnPointerLock: returnPointerLock.current,
    });
  };

  const openModal = (modal: GameModal) => {
    const existingModal = reactResources.get("/game_modal");
    if (existingModal.kind !== "empty" && existingModal.onClose) {
      existingModal.onClose();
    }
    reactResources.set("/game_modal", modal);
    returnPointerLock.current = pointerLockManager.isLocked();
    pointerLockManager.unlock();
    audioManager.playSound("button_click");
  };

  const toggleInventoryModal = () => {
    if (gameModal.kind !== "inventory") {
      openModal({ kind: "inventory" });
    } else {
      audioManager.playSound("button_click");
      doCloseModal();
    }
  };

  const toggleCraftingModal = useCallback(() => {
    if (gameModal.kind === "crafting") {
      doCloseModal();
      setDragItem(null);
    } else {
      openModal({ kind: "crafting" });
    }
  }, []);

  const toggleCollectionsModal = () => {
    const gameModal = reactResources.get("/game_modal");
    if (gameModal.kind === "collections") {
      doCloseModal();
      setDragItem(null);
    } else {
      openModal({ kind: "collections" });
    }
  };

  const toggleInboxModal = () => {
    const gameModal = reactResources.get("/game_modal");
    if (gameModal.kind === "inbox") {
      doCloseModal();
      setDragItem(null);
    } else {
      openModal({ kind: "inbox" });
    }
  };

  const toggleSettingsModal = () => {
    const gameModal = reactResources.get("/game_modal");
    if (gameModal.kind === "game_settings") {
      doCloseModal();
      setDragItem(null);
    } else {
      openModal({ kind: "game_settings" });
    }
  };

  const toggleMapModal = () => {
    if (gameModal.kind === "map") {
      doCloseModal();
      setDragItem(null);
    } else {
      openModal({ kind: "map" });
    }
  };

  return <></>;
};
