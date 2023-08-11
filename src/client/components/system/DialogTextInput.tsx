import type { InputHTMLAttributes } from "react";
import React from "react";

export const DialogTextInput: React.FunctionComponent<
  InputHTMLAttributes<HTMLInputElement> & {
    extraActionButtonText?: string;
    onExtraActionButtonClick?: () => unknown;
  }
> = ({ extraActionButtonText, onExtraActionButtonClick, ...props }) => {
  return (
    <div className="dialog-input-wrap">
      {extraActionButtonText && (
        <button className="button" onClick={onExtraActionButtonClick}>
          {extraActionButtonText}
        </button>
      )}
      <input className="dialog-input" type="text" {...props} />
    </div>
  );
};
