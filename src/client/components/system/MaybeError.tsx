import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { ClientContext } from "@/client/game/context";
import { log } from "@/shared/logging";
import { messageFromError } from "@/shared/util/helpers";
import React, { useState } from "react";

export function useError(showInChat?: boolean) {
  const [error, setError] = useState<any>();

  let context: ClientContext | undefined;
  if (showInChat) {
    context = useClientContext();
  }

  const setWrapper = (error: any) => {
    if (!error || error.length === 0) {
      setError(error);
    } else {
      log.error(`${error}`);
      setError(error);
      if (showInChat && typeof error === "string") {
        context!.mailman.showChatError(error);
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return [error, setWrapper];
}

export const MaybeError: React.FunctionComponent<{
  error: any;
  prefix?: string;
}> = ({ error, prefix }) => {
  if (!error || error.length === 0) {
    return <></>;
  }

  const text = React.isValidElement(error) ? error : messageFromError(error);
  return (
    <div className="error">
      {prefix} {text}
    </div>
  );
};
