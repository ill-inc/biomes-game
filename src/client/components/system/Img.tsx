import type { ImgHTMLAttributes } from "react";
import React from "react";

// Wrapper class for IMG that does cross origin + static CDN lookups
export const Img: React.FunctionComponent<
  ImgHTMLAttributes<HTMLImageElement>
> = ({ ...props }) => {
  return <img {...props} crossOrigin="anonymous" />;
};
