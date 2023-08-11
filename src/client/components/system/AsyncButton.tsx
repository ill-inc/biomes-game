import { fireAndForget } from "@/shared/util/async";
import type { PropsWithChildren } from "react";
import { useState } from "react";

export const AsyncButton: React.FunctionComponent<
  PropsWithChildren<{
    onClick: () => Promise<void>;
    className?: string;
  }>
> = ({ onClick, children, className }) => {
  const [working, setWorking] = useState(false);
  return (
    <button
      className={className}
      disabled={working}
      onClick={() =>
        fireAndForget(
          (async () => {
            setWorking(true);
            try {
              await onClick();
            } finally {
              setWorking(false);
            }
          })()
        )
      }
    >
      {children}
    </button>
  );
};
