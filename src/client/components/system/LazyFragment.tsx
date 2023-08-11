import type { PropsWithChildren } from "react";
import { useRef } from "react";

export const LazyFragment: React.FunctionComponent<
  PropsWithChildren<{ isActive: boolean; extraClassName?: string }>
> = ({ isActive, extraClassName, children }) => {
  const rendered = useRef(isActive);

  if (isActive && !rendered.current) {
    rendered.current = true;
  }

  return (
    <div
      className={`${
        !isActive && "hidden"
      } flex-1 overflow-hidden ${extraClassName}`}
    >
      {rendered.current && <>{children}</>}
    </div>
  );
};
