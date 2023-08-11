import {
  DialogBox,
  DialogBoxContents,
  DialogBoxTitle,
} from "@/client/components/system/DialogBox";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import type { PropsWithChildren } from "react";
import React from "react";

export const Confirm: React.FunctionComponent<
  PropsWithChildren<{
    title: JSX.Element | string;
    confirmText: string;
    onConfirm?: () => any;
    onClose?: () => any;
  }>
> = ({ title, confirmText, onConfirm, onClose, children }) => {
  const [error, _setError] = useError();

  return (
    <DialogBox>
      <DialogBoxTitle>{title}</DialogBoxTitle>
      <DialogBoxContents>
        <MaybeError error={error} />
        <div className="confirm-content">{children}</div>
        <div className="dialog-button-group">
          <DialogButton type="destructive" onClick={onConfirm}>
            {confirmText}
          </DialogButton>
          <DialogButton onClick={onClose}>Cancel</DialogButton>
        </div>
      </DialogBoxContents>
    </DialogBox>
  );
};
