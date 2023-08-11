import { Img } from "@/client/components/system/Img";
import type { ReactChild } from "react";
import React from "react";
import spinnerIcon from "/public/hud/spinner.gif";
import errorIcon from "/public/hud/status-failed.png";
import successIcon from "/public/hud/status-success.png";

export interface FillProps {
  header?: ReactChild;
  footer?: ReactChild;
  type: "success" | "progress" | "error";
  style?: "full" | "keep-header";
}

export const MaybeFillStatusBox: React.FunctionComponent<Partial<FillProps>> = (
  props
) => {
  if (props.type) {
    return <FillStatusBox {...(props as FillProps)} />;
  }

  return <></>;
};
export const FillStatusBox: React.FunctionComponent<FillProps> = ({
  header,
  footer,
  type,
  style,
}) => {
  let icon = <></>;
  if (type === "success") {
    icon = (
      <section className="icon-container">
        <Img src={successIcon.src} />
      </section>
    );
  } else if (type === "progress") {
    icon = (
      <section className="loading-spinner">
        <Img src={spinnerIcon.src} />
      </section>
    );
  } else if (type === "error") {
    icon = (
      <section className="icon-container">
        <Img src={errorIcon.src} />
      </section>
    );
  }

  return (
    <div className={`status-box biomes-box style-${style ?? "full"}`}>
      <header>{header}</header>
      {icon}
      <footer>{footer}</footer>
    </div>
  );
};
