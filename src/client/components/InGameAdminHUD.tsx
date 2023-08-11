import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { usePointerLockManager } from "@/client/components/contexts/PointerLockContext";
import type { IngameAdminPages } from "@/client/components/InGameAdminPanel";
import { inInputElement } from "@/client/components/ShortcutsHUD";
import { setInlineAdminVisibility } from "@/client/game/resources/bikkie";
import type { GlobalKeyCode } from "@/client/game/util/keyboard";
import { cleanListener } from "@/client/util/helpers";
import { useInvalidate } from "@/client/util/hooks";
import { useInterval } from "@/client/util/intervals";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const InGameAdminPanel = dynamic(
  () => import("@/client/components/InGameAdminPanel"),
  {
    ssr: false,
    loading: () => <div className="ingame-bikkie">Loading Admin...</div>,
  }
);
const WasmMemoryTracing = dynamic(
  () => import("@/client/components/WasmMemoryTracing"),
  {
    ssr: false,
    loading: () => <>Loading Admin...</>,
  }
);

const WrappedInGameAdminPanel: React.FunctionComponent<{
  defaultTab: IngameAdminPages;
}> = ({ defaultTab }) => {
  const { reactResources } = useClientContext();
  const pointerLockManager = usePointerLockManager();
  const invalidate = useInvalidate();
  const loadedRef = useRef(false);

  useInterval(() => {
    if (!loadedRef.current) {
      // Workaround a bug where the dynamic load doesn't trigger invalidation
      invalidate();
    }
  }, 50);

  return (
    <InGameAdminPanel
      defaultTab={defaultTab}
      onMount={() => {
        loadedRef.current = true;
        invalidate();
      }}
      onClose={() => {
        setInlineAdminVisibility(reactResources, undefined);
        pointerLockManager.focusAndLock();
      }}
    />
  );
};

export const InGameAdminHUD: React.FunctionComponent<{}> = ({}) => {
  const { reactResources, clientConfig, authManager } = useClientContext();
  const currentAdminTab = reactResources.use("/admin/inline_admin_visible");
  const pointerLockManager = usePointerLockManager();

  useEffect(() => {
    return cleanListener(window, {
      keypress: (event) => {
        if (!pointerLockManager.allowKeyInput() || inInputElement(event))
          return;

        const lk = event.code as GlobalKeyCode;

        if (lk === "Backslash" || lk === "Backquote") {
          const canAccessAdvancedOptions =
            authManager.currentUser.hasSpecialRole("advancedOptions") ||
            clientConfig.dev;
          if (!canAccessAdvancedOptions) {
            setInlineAdminVisibility(reactResources, undefined);
            return;
          }

          let tab: IngameAdminPages | undefined = undefined;
          if (lk === "Backslash") {
            tab = currentAdminTab.tab === "ecs" ? undefined : "ecs";
            setInlineAdminVisibility(reactResources, tab);
          } else if (lk === "Backquote") {
            tab = currentAdminTab.tab === "tweaks" ? undefined : "tweaks";
            setInlineAdminVisibility(reactResources, tab);
          }

          if (tab && pointerLockManager.isLocked()) {
            pointerLockManager.unlock();
          }
        }
      },
    });
  }, [currentAdminTab.tab]);

  return (
    <>
      <AnimatePresence>
        {currentAdminTab.tab && (
          <motion.div
            className="relative z-10"
            key="admin-panel"
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "100%" }}
            transition={{ bounce: 0 }}
          >
            <WrappedInGameAdminPanel defaultTab={currentAdminTab.tab} />
          </motion.div>
        )}
      </AnimatePresence>

      {!currentAdminTab && clientConfig.wasmMemoryTracing && (
        <WasmMemoryTracing />
      )}
    </>
  );
};
