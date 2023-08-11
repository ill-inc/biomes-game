import { positionFixedElementRelativeToXY } from "@/client/util/dom_helpers";
import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const TooltipContext =
  createContext<React.MutableRefObject<HTMLSpanElement | null> | null>(null);

export const CreateTooltipContext: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <TooltipContext.Provider value={ref}>{children}</TooltipContext.Provider>
  );
};

export const Tooltipped: React.FunctionComponent<
  PropsWithChildren<{
    tooltip?: string | JSX.Element;
    exactPositioning?: boolean;
    wrapperExtraClass?: string;
    toolTipExtraClass?: string;
    offsetX?: number;
    offsetY?: number;
    anchor?: "center";
    overrideHidden?: boolean;
    willTransform?: boolean;
  }>
> = ({
  tooltip,
  children,
  wrapperExtraClass,
  toolTipExtraClass,
  offsetX = 20,
  offsetY = -10,
  anchor,
  overrideHidden,
  willTransform,
}) => {
  const [tooltipShowing, setTooltipShowing] = useState(false);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const modalFixRef = useRef<HTMLElement | undefined | null>(undefined);
  const tooltipContext = useContext(TooltipContext);

  const adjustToMouse = useCallback(
    ({ clientX, clientY }: { clientX: number; clientY: number }) => {
      const tooltip = tooltipRef.current;
      if (tooltipContext && tooltip !== tooltipContext.current) {
        setTooltipShowing(false);
        return;
      }
      if (tooltip) {
        tooltip.style.display = "";
        const { modalFixElement } = positionFixedElementRelativeToXY(
          tooltip,
          clientX,
          clientY,
          {
            baseOffsetX: offsetX,
            baseOffsetY: offsetY,
            memoModalFixElement: modalFixRef.current,
            willTransform: willTransform,
          }
        );
        modalFixRef.current = modalFixElement;
      }
    },
    []
  );

  useEffect(() => {
    if (!tooltipShowing || !tooltip) {
      if (tooltipRef.current) {
        tooltipRef.current.style.display = "none";
      }
      return;
    }

    if (tooltipContext) {
      tooltipContext.current = tooltipRef.current;
    }
    window.addEventListener("mousemove", adjustToMouse);
    return () => {
      window.removeEventListener("mousemove", adjustToMouse);
    };
  }, [tooltipShowing, tooltip]);

  if (!tooltip) return <>{children}</>;

  return (
    <span
      className={`tooltipped ${wrapperExtraClass ? wrapperExtraClass : ""}`}
      onMouseEnter={(ev) => {
        adjustToMouse(ev);
        if (!overrideHidden) {
          setTooltipShowing(true);
        }
      }}
      onMouseLeave={(ev) => {
        adjustToMouse(ev);
        setTooltipShowing(false);
      }}
    >
      {tooltip && tooltipShowing && (
        <span
          className={`biomes-box tooltip-content anchor-${anchor} ${
            toolTipExtraClass ? toolTipExtraClass : ""
          }`}
          ref={tooltipRef}
          style={{ display: "none" }}
        >
          <span
            className={
              typeof tooltip === "string" ? "secondary-label centered-text" : ""
            }
          >
            {tooltip}
          </span>
        </span>
      )}
      {children}
    </span>
  );
};
