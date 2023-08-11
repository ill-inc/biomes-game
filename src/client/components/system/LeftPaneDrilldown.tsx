import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { Img } from "@/client/components/system/Img";
import type { PropsWithChildren } from "react";

export const LeftPaneDrilldown: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  return <ul className="left-pane-drilldown">{children}</ul>;
};
export const LeftPaneDrilldownItem: React.FunctionComponent<{
  selected: boolean;
  title: string;
  icon?: string | JSX.Element;
  rightTitle?: string;
  extraClassName?: string;
  onClick?: () => unknown;
}> = ({ title, selected, icon, extraClassName, rightTitle, onClick }) => {
  const { audioManager } = useClientContext();
  return (
    <li
      className={`${selected ? "selected" : ""} ${extraClassName}`}
      onClick={() => {
        audioManager.playSound("button_click");
        onClick?.();
      }}
    >
      {icon && (
        <div className="icon">
          {typeof icon === "string" ? <Img src={icon} /> : <>{icon}</>}
        </div>
      )}
      <div className="description">{title}</div>
      {rightTitle && <div className="rightTitle">{rightTitle}</div>}
    </li>
  );
};
