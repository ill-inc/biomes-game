import { Img } from "@/client/components/system/Img";
import React from "react";
import checkIcon from "/public/hud/icon-check-12.png";

export const DialogCheckbox: React.FunctionComponent<{
  label: string;
  explanation?: string;
  disabled?: boolean;
  checked: boolean;
  style?: "small" | "normal";
  onCheck: (checked: boolean) => any;
}> = ({ label, explanation, disabled, checked, onCheck, style }) => {
  return (
    <div
      className={`dialog-checkbox ${style ?? "normal"} ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
    >
      <div
        className="flex-1"
        onClick={() => {
          onCheck(!checked);
        }}
      >
        <div className="label">{label}</div>
        {explanation && <div className="explanation">{explanation}</div>}
      </div>
      <div className="control">
        <input
          type="checkbox"
          name="test"
          checked={checked}
          disabled={disabled}
          onChange={() => {
            onCheck(!checked);
          }}
        />
        <label
          htmlFor="test"
          onClick={() => {
            onCheck(!checked);
          }}
        />
        {checked && <Img src={checkIcon.src} />}
      </div>
    </div>
  );
};
