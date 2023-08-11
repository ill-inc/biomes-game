import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { usePointerLockManager } from "@/client/components/contexts/PointerLockContext";
import { ShortcutText } from "@/client/components/system/ShortcutText";
import { useScreenshotter } from "@/client/game/helpers/screenshot";
import { cleanListener } from "@/client/util/helpers";
import { BikkieIds } from "@/shared/bikkie/ids";
import { anItem } from "@/shared/game/item";

import { sleep } from "@/shared/util/async";
import { AnimatePresence, motion } from "framer-motion";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const InGameCameraHUD: React.FunctionComponent<{}> = ({}) => {
  const clientContext = useClientContext();
  const { input, reactResources, audioManager } = clientContext;
  const selection = reactResources.use("/hotbar/selection");
  const [locked, setLocked] = useState(false);
  const pointerLockManager = usePointerLockManager();
  const screenshotOverlayRef = useRef<HTMLDivElement>(null);
  const { screenshotting, takeScreenshot } = useScreenshotter(clientContext);

  const item = anItem(selection.item);

  const cameraAction = useMemo(() => {
    if (!item || !(selection.kind === "camera")) {
      return;
    }

    switch (item.id) {
      case BikkieIds.camera:
        return "Flip Camera";
      case BikkieIds.isoCam:
        return "Rotate";
      case BikkieIds.zoomCam:
        return "Zoom";
    }
  }, [item]);

  useEffect(() => {
    return cleanListener(document, {
      pointerlockchange: () => {
        if (pointerLockManager.isLocked()) {
          setLocked(true);
        } else {
          setLocked(false);
        }
      },
    });
  }, []);

  const waitForAnimationTimeMs = 200;
  const screenshotCallback = useCallback(() => {
    if (screenshotting) {
      return;
    }
    if (!screenshotOverlayRef.current) {
      return;
    }
    const brect = screenshotOverlayRef.current.getBoundingClientRect();
    audioManager.playSound("camera_shutter");
    void sleep(waitForAnimationTimeMs + 1).then(() => {
      takeScreenshot(brect);
    });
  }, [screenshotting, takeScreenshot]);

  useEffect(() => {
    input.emitter.on("primary", screenshotCallback);
    return () => {
      input.emitter.removeListener("primary", screenshotCallback);
    };
  }, [screenshotting, takeScreenshot]);

  return (
    <AnimatePresence>
      {selection.kind === "camera" && locked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: screenshotting ? [0.5, 0] : 0 }}
            transition={{ duration: waitForAnimationTimeMs / 1000 }}
            className="screenshot-overlay"
            ref={screenshotOverlayRef}
          />

          <div className="camera-hud">
            <div className="absolute bottom-1 right-1 font-semibold text-shadow-bordered">
              <ShortcutText shortcut="F" keyCode="KeyF">
                {cameraAction}
              </ShortcutText>{" "}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InGameCameraHUD;
