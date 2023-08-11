import { usePointerLockManager } from "@/client/components/contexts/PointerLockContext";
import type { LocalKeyCode } from "@/client/game/util/keyboard";
import { cleanListener } from "@/client/util/helpers";
import type { PropsWithChildren } from "react";
import React, { useEffect, useRef } from "react";

export interface HUDModalProps {
  dismissKeyCode?: LocalKeyCode;
  allowClickToDismiss?: boolean;
  onDismissal?: () => any;
  index?: number;
}

export const HUDModal: React.FunctionComponent<
  PropsWithChildren<HUDModalProps>
> = ({
  dismissKeyCode,
  allowClickToDismiss = true,
  onDismissal,
  index,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const pointerLockManager = usePointerLockManager();
  const mouseDownWasOnModal = useRef(false);
  useEffect(
    () =>
      cleanListener(window, {
        keydown: (e) => {
          if (e.repeat) return;
          if (
            dismissKeyCode &&
            e.code === dismissKeyCode &&
            pointerLockManager.allowKeyInput()
          ) {
            onDismissal?.();
          }
        },
      }),
    []
  );

  const maybeCloseWindow = function (event: React.MouseEvent) {
    if (
      allowClickToDismiss &&
      modalRef.current &&
      event.target === modalRef.current &&
      mouseDownWasOnModal.current
    ) {
      onDismissal?.();
    }
  };

  return (
    <div
      className="modal"
      onMouseDown={(event) => {
        mouseDownWasOnModal.current = event.target === modalRef.current;
      }}
      onClick={maybeCloseWindow}
      ref={modalRef}
      style={{
        zIndex: index,
      }}
    >
      <div
        className="modal-fg"
        style={{ zIndex: index ? index + 1 : undefined }}
      >
        {children}
      </div>
    </div>
  );
};
