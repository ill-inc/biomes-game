import type { ClientContext } from "@/client/game/context";
import { hotResourceEmitter } from "@/client/game/resources/hot";
import { cleanEmitterCallback } from "@/client/util/helpers";
import { useInvalidate } from "@/client/util/hooks";
import { BikkieRuntime } from "@/shared/bikkie/active";
import { createContext, useContext, useEffect } from "react";

export const ClientContextReactContext = createContext({
  clientContext: null as null | ClientContext,
  setClientContext: (_context: ClientContext) => {},
});

export function useClientContext(): ClientContext {
  const invalidate = useInvalidate();
  const context = useContext(ClientContextReactContext).clientContext;
  if (!context?.clientConfig?.skipBikkieReactInvalidate) {
    useEffect(
      () =>
        cleanEmitterCallback(BikkieRuntime.get(), {
          refreshed: invalidate,
        }),
      []
    );
  }

  if (process.env.NODE_ENV !== "production") {
    useEffect(
      () =>
        cleanEmitterCallback(hotResourceEmitter, {
          onHotResourceReload: invalidate,
        }),
      []
    );
  }

  return context!;
}

export function hasClientContext(): boolean {
  const cc = useClientContext();
  return Boolean(cc);
}
