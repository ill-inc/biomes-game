import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { inInputElement } from "@/client/components/ShortcutsHUD";
import { GenericMiniPhone } from "@/client/components/system/GenericMiniPhone";
import { LazyFragment } from "@/client/components/system/LazyFragment";
import type { GenericMiniPhonePayload } from "@/client/components/system/types";
import type { GlobalKeyCode } from "@/client/game/util/keyboard";
import { cleanListener } from "@/client/util/helpers";

import type { TabbedPauseTabKind } from "@/client/game/resources/game_modal";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import collectionsIcon from "/public/hud/nav/collections-closed.png";
import handcraftIcon from "/public/hud/nav/crafting.png";
import notificationsIcon from "/public/hud/nav/inbox.png";
import inventoryIcon from "/public/hud/nav/inventory.png";
import mapIcon from "/public/hud/nav/map.png";
import settingsIcon from "/public/hud/nav/settings.png";

export const BiomesPauseMenuTabSelectorItem: React.FunctionComponent<{
  tabKey: TabbedPauseTabKind;
  title: string;
  shortcut: string;
  img: string;
  badgeCount?: number;
  keyCode: GlobalKeyCode;
  setGameMenuString?: (title?: string) => unknown;
}> = ({ tabKey, title, shortcut, img, badgeCount, keyCode }) => {
  const { audioManager, reactResources } = useClientContext();
  const [showTooltip, setShowTooltip] = useState(false);
  const [keydown, setKeydown] = useState(false);

  const activeTab = reactResources.use("/game_modal/active_tab");

  useEffect(() => {
    if (keyCode) {
      return cleanListener(document, {
        keydown: (e: KeyboardEvent) => {
          if (inInputElement(e) || e.code !== keyCode || e.repeat) {
            return;
          }
          setKeydown(true);
        },
        keyup: () => {
          setKeydown(false);
        },
      });
    }
  }, []);

  return (
    <li
      className="relative z-10 flex h-[calc(var(--cell-width)*1)] w-[calc(var(--cell-width)*1.25)]
cursor-pointer flex-col items-center justify-center"
      onMouseOver={() => {
        setShowTooltip(true);
      }}
      onMouseLeave={() => {
        setShowTooltip(false);
      }}
      onClick={() => {
        reactResources.set("/game_modal/active_tab", {
          kind: "tabbed_pause",
          activeTab: tabKey,
        });
        audioManager.playSound("button_click");
      }}
    >
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0.8, y: "-170%" }}
            animate={{ opacity: 1, y: "-180%" }}
            className="biomes-box absolute flex flex-col items-center bg-tooltip-bg px-1 py-1 text-sm text-white"
          >
            <div className="font-semibold">{title}</div>
            <div className="key text-secondary-gray">Press {shortcut}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab.kind === "tabbed_pause" && activeTab.activeTab === tabKey && (
        <motion.div
          layoutId="dot-container"
          className="absolute bottom-0 h-[0.3vmin] w-0.6 overflow-hidden"
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="h-0.6 w-0.6 rounded-full bg-white" />
        </motion.div>
      )}
      <motion.div
        className={`transform-origin-bottom filter-drop-shadow drop-shadow-[0 0.2vmin 0 rgba(0, 0, 0, 0.5)] image-rendering-auto absolute bottom-[calc(var(--cell-width)*0.25/2)] left-[calc(var(--cell-width)*0.25)] h-[calc(var(--cell-width)*0.75)] w-[calc(var(--cell-width)*0.75)]`}
        whileHover={{
          scale: 1.2,
          y: -10,
        }}
        whileTap={{
          scale: 1.1,
          y: -10,
        }}
        animate={{ scale: keydown ? 0.85 : 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
      >
        <img
          className="h-[calc(var(--cell-width)*0.75)] w-[calc(var(--cell-width)*0.75)]"
          src={img}
        />
        {badgeCount && badgeCount > 0 ? (
          <div className="circle-badge-box-shadow absolute right-0 top-0.2 z-50 flex h-2 w-2 items-center justify-center rounded-full bg-red text-xs font-semibold text-white">
            {badgeCount}
          </div>
        ) : (
          ""
        )}
      </motion.div>
    </li>
  );
};

export const BiomesTabbedPauseModal: React.FunctionComponent<{
  onClose: () => unknown;
  craftingPayload?: GenericMiniPhonePayload;
  defaultTab?: TabbedPauseTabKind;
  defaultOverrideVersion?: string | number;
}> = ({ onClose, defaultTab, craftingPayload, defaultOverrideVersion }) => {
  const { reactResources, gardenHose } = useClientContext();

  const activeTab = reactResources.use("/game_modal/active_tab");

  useEffect(() => {
    reactResources.set("/game_modal/active_tab", {
      kind: "tabbed_pause",
      activeTab: defaultTab,
    });
  }, [defaultOverrideVersion]);

  useEffect(() => {
    if (activeTab.kind !== "tabbed_pause") {
      return;
    }

    const tabKind = activeTab.activeTab;
    const openTime = performance.now();
    if (activeTab.activeTab) {
      gardenHose.publish({
        kind: "open_tab",
        tab: activeTab.activeTab,
      });
    } else {
      gardenHose.publish({
        kind: "open_pause",
      });
    }

    return () => {
      if (performance.now() - openTime < 300) {
        return;
      }

      if (tabKind) {
        gardenHose.publish({
          kind: "close_tab",
          tab: tabKind,
        });
      } else {
        gardenHose.publish({
          kind: "close_pause",
        });
      }
    };
  }, [
    String(activeTab.kind === "tabbed_pause" ? activeTab.activeTab : undefined),
  ]);

  const badgeCount = reactResources.use("/activity/unread").messages.length;
  const spring = { tension: 140, friction: 12 };

  const [gameMenuString, setGameMenuString] = useState("Game Menu");
  const [hoveringMenu, setHoveringMenu] = useState(false);

  const setMenuTitle = (title?: string) => {
    setGameMenuString(title ? title : "Game Menu");
  };

  return (
    <>
      <motion.div
        initial={{ y: 56, x: "-50%" }}
        animate={{ y: 0 }}
        transition={{
          type: "spring",
          ...spring,
        }}
        className="absolute bottom-0.8 left-1/2 z-10 flex translate-x-[-50%] select-none flex-col items-center gap-1"
      >
        {!hoveringMenu && (
          <motion.div
            className={`font-large game-menu-header text-white text-shadow-bordered ${
              activeTab ? "hidden" : ""
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {gameMenuString}
          </motion.div>
        )}
        <ul
          className="tab-selector-wrap biomes-box flex items-center justify-center"
          onMouseEnter={() => setHoveringMenu(true)}
          onMouseLeave={() => setHoveringMenu(false)}
        >
          <BiomesPauseMenuTabSelectorItem
            tabKey={"inventory"}
            title="Inventory"
            shortcut={"E"}
            keyCode="KeyE"
            img={inventoryIcon.src}
            setGameMenuString={setMenuTitle}
          />
          <BiomesPauseMenuTabSelectorItem
            tabKey={"crafting"}
            title="Recipes"
            shortcut="R"
            keyCode="KeyR"
            img={handcraftIcon.src}
            setGameMenuString={setMenuTitle}
          />
          <BiomesPauseMenuTabSelectorItem
            tabKey={"map"}
            title="Map"
            shortcut="M"
            keyCode="KeyM"
            img={mapIcon.src}
            setGameMenuString={setMenuTitle}
          />
          <BiomesPauseMenuTabSelectorItem
            tabKey={"collections"}
            title="Collections"
            shortcut="C"
            keyCode="KeyC"
            img={collectionsIcon.src}
            setGameMenuString={setMenuTitle}
          />
          <BiomesPauseMenuTabSelectorItem
            tabKey={"inbox"}
            title="Inbox"
            shortcut="V"
            keyCode="KeyV"
            img={notificationsIcon.src}
            badgeCount={badgeCount}
            setGameMenuString={setMenuTitle}
          />
          <BiomesPauseMenuTabSelectorItem
            tabKey={"settings"}
            title="Options"
            shortcut="O"
            keyCode="KeyO"
            img={settingsIcon.src}
            setGameMenuString={setMenuTitle}
          />
        </ul>
      </motion.div>
      <section className="tab-render">
        <LazyFragment
          isActive={
            activeTab.kind === "tabbed_pause" &&
            activeTab.activeTab === "inventory"
          }
        >
          <GenericMiniPhone
            rootPayload={{
              type: "self_inventory",
            }}
            onClose={onClose}
          />
        </LazyFragment>
        <LazyFragment
          isActive={
            activeTab.kind === "tabbed_pause" &&
            activeTab.activeTab === "crafting"
          }
        >
          <GenericMiniPhone
            onClose={onClose}
            rootPayload={craftingPayload ?? { type: "hand_craft" }}
          />
        </LazyFragment>
        <LazyFragment
          isActive={
            activeTab.kind === "tabbed_pause" && activeTab.activeTab === "map"
          }
        >
          <GenericMiniPhone
            onClose={onClose}
            rootPayload={{
              type: "map",
            }}
          />
        </LazyFragment>
        <LazyFragment
          isActive={
            activeTab.kind === "tabbed_pause" && activeTab.activeTab === "inbox"
          }
        >
          <GenericMiniPhone
            onClose={onClose}
            rootPayload={{
              type: "inbox",
            }}
          />
        </LazyFragment>
        <LazyFragment
          isActive={
            activeTab.kind === "tabbed_pause" &&
            activeTab.activeTab === "collections"
          }
        >
          <GenericMiniPhone
            onClose={onClose}
            rootPayload={{
              type: "collections",
            }}
          />
        </LazyFragment>
        <LazyFragment
          isActive={
            activeTab.kind === "tabbed_pause" &&
            activeTab.activeTab === "settings"
          }
        >
          <GenericMiniPhone
            onClose={onClose}
            rootPayload={{
              type: "game_settings",
            }}
          />
        </LazyFragment>
      </section>
    </>
  );
};
