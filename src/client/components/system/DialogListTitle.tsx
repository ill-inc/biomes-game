import type { PropsWithChildren } from "react";
import React from "react";

export const DialogListTitle: React.FunctionComponent<
  PropsWithChildren<{ title: string }>
> = ({ title, children }) => {
  return (
    <section className="dialog-list-title">
      <label>{title}</label>
      <div>{children}</div>
    </section>
  );
};
