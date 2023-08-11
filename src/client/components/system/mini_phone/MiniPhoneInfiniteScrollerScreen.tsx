import type { PropsWithChildren } from "react";
import React from "react";
import { useBottomScrollListener } from "react-bottom-scroll-listener";

export const MiniPhoneInfiniteScrollerScreen: React.FunctionComponent<
  PropsWithChildren<{
    extraClassName?: string;
    onBottom?: () => any;
  }>
> = ({ extraClassName, onBottom, children }) => {
  const scrollRef = useBottomScrollListener<HTMLDivElement>(() => {
    onBottom?.();
  });

  return (
    <div
      className={`mini-phone-scroller-screen ${extraClassName ?? ""}`}
      ref={scrollRef}
    >
      {children}
    </div>
  );
};
