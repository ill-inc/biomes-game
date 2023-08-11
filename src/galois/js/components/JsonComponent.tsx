import { Highlight } from "@/galois/components/Highlight";
import React from "react";

export const JsonComponent: React.FunctionComponent<{ data: any }> = ({
  data,
}) => {
  return <Highlight language="json">{JSON.stringify(data, null, 2)}</Highlight>;
};
