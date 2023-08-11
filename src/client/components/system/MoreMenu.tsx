import { Tooltipped } from "@/client/components/system/Tooltipped";
import React, { useRef } from "react";

export interface MoreMenuItem {
  label: string;
  onClick?: () => any;
  type?: "destructive";
  disabled?: boolean;
  disabledTooltip?: string;
  badge?: string;
  showSpinner?: boolean;
}

export const MoreMenu: React.FunctionComponent<{
  showing: boolean;
  setShowing?: (showing: boolean) => any;
  items: MoreMenuItem[];
  anchor?: "right" | "left";
  extraClassNames?: string;
  pos?: [number, number];
}> = ({ showing, setShowing, items, anchor, extraClassNames, pos }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  if (!showing) {
    return <></>;
  }

  return (
    <>
      <div
        className="fixed inset-0"
        onClick={(e) => {
          e.stopPropagation();
          setShowing?.(false);
        }}
      />
      <div
        className={`biomes-box mini-phone-more more-popover z-10 anchor-${
          anchor ?? "left"
        } ${extraClassNames}`}
        ref={containerRef}
        style={{
          left: pos ? pos[0] + 10 : undefined,
          top: pos ? pos[1] : undefined,
          position: pos ? "fixed" : undefined,
          margin: pos ? "none" : undefined,
          marginLeft: pos ? "0" : undefined,
        }}
      >
        {items.map((item) => (
          <Tooltipped
            tooltip={
              item.disabled ? item.disabledTooltip ?? undefined : undefined
            }
            key={item.label}
          >
            <div
              className={`menu-item ${item.disabled ? "disabled" : ""} ${
                item.type === "destructive" ? "destructive" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled) {
                  item.onClick?.();
                }
              }}
            >
              {item.label}
              {item.badge && (
                <div className="menu-item-badge">{item.badge}</div>
              )}
              {item.showSpinner && (
                <img className="spinner" src="/hud/spinner.gif" />
              )}
            </div>
          </Tooltipped>
        ))}
      </div>
    </>
  );
};
