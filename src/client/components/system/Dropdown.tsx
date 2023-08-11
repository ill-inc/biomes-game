import type { PropsWithChildren } from "react";
import React, { createContext, useContext, useRef, useState } from "react";

const DropdownContext = createContext({
  showing: false,
  setShowing: (_showing: boolean) => {},
  closeTimeout: undefined as unknown as React.MutableRefObject<
    ReturnType<typeof setTimeout> | undefined
  >,
});

const useDropdownContext = () => useContext(DropdownContext);

export const DropdownRootElement: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  const context = useDropdownContext();

  return (
    <div
      className="dropdown-root"
      onClick={() => {
        context.setShowing(!context.showing);
      }}
      onMouseEnter={() => {
        context.setShowing(true);
      }}
    >
      {children}
    </div>
  );
};

export const DropdownMenu: React.FunctionComponent<PropsWithChildren<{}>> = ({
  children,
}) => {
  const context = useDropdownContext();
  if (!context.showing) {
    return <></>;
  }

  return <ul className="dropdown-menu">{children}</ul>;
};

export const DropdownMenuItem: React.FunctionComponent<
  PropsWithChildren<{
    onClick: () => any;
  }>
> = ({ onClick, children }) => {
  const context = useDropdownContext();

  return (
    <li
      className="dropdown-menu-item"
      onClick={() => {
        context.setShowing(false);
        onClick();
      }}
    >
      {children}
    </li>
  );
};

export const Dropdown: React.FunctionComponent<PropsWithChildren<{}>> = ({
  children,
}) => {
  const [showing, setShowing] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | undefined>();

  return (
    <DropdownContext.Provider
      value={{
        showing,
        setShowing,
        closeTimeout,
      }}
    >
      <div
        onMouseLeave={() => {
          closeTimeout.current = setTimeout(() => {
            setShowing(false);
          }, 500);
        }}
        onMouseEnter={() => {
          if (closeTimeout.current) {
            clearTimeout(closeTimeout.current);
          }
        }}
        onMouseMove={() => {
          if (closeTimeout.current) {
            clearTimeout(closeTimeout.current);
          }
        }}
      >
        {children}
      </div>
    </DropdownContext.Provider>
  );
};
