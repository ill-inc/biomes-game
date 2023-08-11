import { Img } from "@/client/components/system/Img";
import React from "react";
import spinnerIcon from "/public/hud/spinner.gif";

export const FillLoadingBox: React.FunctionComponent<{
  header: string;
  footer?: string | JSX.Element;
}> = ({ header, footer }) => {
  return (
    <div className="loading-box biomes-box">
      <header>{header}</header>
      <section className="loading-spinner">
        <Img src={spinnerIcon.src} />
      </section>
      <footer>{footer}</footer>
    </div>
  );
};
