import { BiomesView } from "@/client/components/BiomesView";
import { setCanvasEffect } from "@/client/components/canvas_effects";
import { ClientContextReactContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  PointerLockManager,
  PointerLockManagerContext,
} from "@/client/components/contexts/PointerLockContext";
import { warnAboutBadExtensions } from "@/client/game/browser_extensions";
import type { InitConfigOptions } from "@/client/game/client_config";
import type { ClientContext } from "@/client/game/context";
import type { LoadProgress } from "@/client/game/load_progress";
import { ClientLoader, REQUIRED_FRAMES } from "@/client/game/load_progress";
import { hotResourceEmitter } from "@/client/game/resources/hot";
import { trackConversion } from "@/client/util/ad_helpers";
import { cleanEmitterCallback } from "@/client/util/helpers";
import { useMountedRef } from "@/client/util/hooks";
import { reportFunnelStage } from "@/shared/funnel";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { fireAndForget } from "@/shared/util/async";
import React, { useEffect, useRef, useState } from "react";

const Game: React.FunctionComponent<{
  userId: BiomesId;
  loadProgress: LoadProgress | undefined;
  setLoadProgress: (progress?: LoadProgress) => void;
  configOptions?: InitConfigOptions;
}> = React.memo(({ userId, loadProgress, setLoadProgress, configOptions }) => {
  const [clientContext, setClientContext] = useState<ClientContext | null>(
    null
  );
  const [pointerLockManager] = useState(new PointerLockManager());
  const [error, setError] = useState<Error | undefined>();
  const mounted = useMountedRef();
  const hotVersion = useRef(0);
  const [hotVersionState, setHotVersionState] = useState(0);

  useEffect(() => {
    if (!mounted.current) {
      return;
    }

    const clientLoader = new ClientLoader(
      userId,
      setLoadProgress,
      configOptions
    );

    void (async () => {
      if (!mounted.current) {
        return;
      }

      reportFunnelStage("loadingScreen");

      try {
        const context = await clientLoader.load();
        setClientContext(context);
        warnAboutBadExtensions(context.mailman);
      } catch (error: any) {
        log.error("Error while initializing client context", { error: error });
        setError(error);
      }
    })();

    return () => {
      log.warn("Stopping previous game loop, likely due to hot refresh...");
      setClientContext(null);
      fireAndForget(clientLoader.stop());
    };
  }, []);

  useEffect(
    () =>
      cleanEmitterCallback(hotResourceEmitter, {
        onHotResourceReload: () => {
          if (mounted.current) {
            hotVersion.current += 1;
            setHotVersionState(hotVersion.current);
          }
        },
      }),
    []
  );

  // Start load effect a few frames early to avoid a flash of the loading
  const startLoadEffect =
    clientContext && (loadProgress?.sceneRendered ?? 0) > REQUIRED_FRAMES - 5;
  useEffect(() => {
    if (!startLoadEffect) {
      return;
    }

    if (userId) {
      trackConversion("authenticatedLoad");
    }
    setCanvasEffect(clientContext.resources, {
      kind: "worldLoad",
      onComplete: () => {},
    });
  }, [startLoadEffect]);

  if (error) {
    // Propagate errors during initialization up and let them be caught by a
    // <RootErrorBoundary> installed above.
    throw error;
  }

  // Only progress past the loading screen when we have our clientContext.
  if (!clientContext) {
    return <></>;
  }

  return (
    <ClientContextReactContext.Provider
      value={{ clientContext, setClientContext }}
    >
      <PointerLockManagerContext.Provider
        value={pointerLockManager}
        key={hotVersionState}
      >
        <BiomesView key={hotVersionState} />
      </PointerLockManagerContext.Provider>
    </ClientContextReactContext.Provider>
  );
});

export default Game;
