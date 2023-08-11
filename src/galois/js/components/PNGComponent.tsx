import React from "react";

export const PNGComponent: React.FunctionComponent<{
  data: string;
  className: string;
}> = ({ data, className }) => {
  return <img className={className} src={`data:image/png;base64, ${data}`} />;
};
