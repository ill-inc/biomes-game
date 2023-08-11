import { Button } from "antd";
import React, { createContext } from "react";

export const ReloadCountContext = createContext({
  reloadCount: 0,
});

export function reloadCountAndButton(onClick?: () => void) {
  const [reloadCount, setReloadCount] = React.useState(1);

  return {
    count: reloadCount,
    button: (
      <div className="reload-button">
        <Button
          onClick={() => {
            onClick && onClick();
            setReloadCount((x) => x + 1);
          }}
        >
          Reload
        </Button>
      </div>
    ),
  };
}
