import type { PropsWithChildren } from "react";
import React from "react";

function sliderClassName(disabled?: boolean) {
  let className = "slider dialog-slider";
  if (disabled) {
    className += " disabled";
  }

  return className;
}

export const DialogSlider: React.FunctionComponent<
  PropsWithChildren<{
    min: number;
    max: number;
    value: number;
    onChange?: (value: number) => any;
    disabled?: boolean;
    showValue?: boolean;
    extraClassNames?: string;
  }>
> = ({
  min,
  max,
  value,
  onChange,
  disabled,
  showValue,
  children,
  extraClassNames = "",
}) => {
  return (
    <div className={sliderClassName(disabled) + " " + extraClassNames}>
      <div className="label">
        {children}{" "}
        {showValue !== false && <span className="value">{value}</span>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        defaultValue={value}
        onChange={(e) => {
          if (!disabled) {
            e.preventDefault();
            onChange?.(parseInt(e.target.value, 10));
          }
        }}
      ></input>
    </div>
  );
};
