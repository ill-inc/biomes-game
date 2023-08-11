import { BiomesChrome } from "@/client/components/BiomesChrome";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  usePointerLockManager,
  usePointerLockStatus,
} from "@/client/components/contexts/PointerLockContext";
import { cleanListener, composeCleanups } from "@/client/util/helpers";
import type { Vec2 } from "@/shared/math/types";
import { ok } from "assert";
import React, { useEffect, useRef } from "react";

function BiomesCanvas({}: {}) {
  const { input, audioManager, rendererController } = useClientContext();
  const lastTouchPosRef = useRef<Vec2 | undefined>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerLockManager = usePointerLockManager();

  useEffect(() => {
    // Initialize the canvas element.
    const canvas = canvasRef.current;
    ok(canvas, "Canvas should exist.");
    canvas.focus();
    pointerLockManager.attachToElementRef(canvasRef);

    const cleanup = composeCleanups(
      cleanListener(canvas, {
        touchmove: (e) => {
          e.preventDefault();
          if (e.touches.length > 0) {
            const touch = e.touches[0];
            if (lastTouchPosRef.current) {
              const moveX = touch.clientX - lastTouchPosRef.current[0];
              const moveY = touch.clientY - lastTouchPosRef.current[1];
              input.moveTouchScreen("canvas", moveX, moveY);
            }
            lastTouchPosRef.current = [touch.clientX, touch.clientY];
          }
        },
        touchstart: (e) => {
          if (e.touches.length > 0) {
            const touch = e.touches[0];
            lastTouchPosRef.current = [touch.clientX, touch.clientY];
          }
        },
        touchend: () => {
          lastTouchPosRef.current = undefined;
        },
        touchcancel: () => {
          lastTouchPosRef.current = undefined;
        },
        click: (e) => {
          if (!pointerLockManager.isLocked()) {
            pointerLockManager.focusAndLock();
            e.stopImmediatePropagation();
          }
        },
      }),
      cleanListener(canvas.ownerDocument, {
        pointerlockchange: () => {
          if (pointerLockManager.isLocked()) {
            input.attach(canvas);
            // AudioContext is only available after a user gesture.
            // So we resume it here.
            void (async () => {
              await audioManager.resumeAudio();
            })();
          } else {
            input.detach();
          }
        },
      })
    );

    // Start rendering to the canvas.
    rendererController.attach(canvas);

    return () => {
      cleanup();
      pointerLockManager.detach();
      rendererController.detach();
      input.detach();
    };
  }, []);
  return <canvas ref={canvasRef} className="biomes-canvas" tabIndex={0} />;
}
const MemoCanvas = React.memo(BiomesCanvas);

export function BiomesView({}: {}) {
  const [locked] = usePointerLockStatus();
  const { resources } = useClientContext();

  useEffect(() => {
    document.querySelector("body")?.classList.add("game");
    resources.update("/focus", (focus) => {
      focus.focused = locked;
    });
  }, [locked]);

  return (
    <div className={`biomes-root`}>
      <BiomesChrome />
      <MemoCanvas />
    </div>
  );
}
