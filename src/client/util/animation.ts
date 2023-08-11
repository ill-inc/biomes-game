import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useEffect, useRef } from "react";

export function useAnimation(callback: () => void) {
  const { rendererController } = useClientContext();

  const savedCallback = useRef(() => {
    return;
  });

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    const tick = () => savedCallback.current();
    rendererController.emitter.on("render", tick);
    return () => {
      rendererController.emitter.removeListener("render", tick);
    };
  }, []);
}
