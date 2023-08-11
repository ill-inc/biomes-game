import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useInterval } from "@/client/util/intervals";
import { useState } from "react";

export function FPSCounter() {
  const { rendererController } = useClientContext();

  const [fps, setFps] = useState<number | undefined>();
  const [cpuRenderTime, setCpuRenderTime] = useState<number | undefined>();
  const [gpuRenderTime, setGpuRenderTime] = useState<number | undefined>();

  // Re-render with traffic statistics every second.
  useInterval(() => {
    const frameInterval = rendererController
      .profiler()
      ?.renderInterval()
      .getPercentile(0.5);
    setFps(frameInterval ? 1000 / frameInterval : undefined);
    setCpuRenderTime(
      rendererController.profiler()?.cpuRenderTime().getPercentile(0.5)
    );
    // Use the minimum GPU time because the GPU timer itself isn't very
    // accurate, but it will never report a time lower than the actual time so
    // lower is more stable.
    setGpuRenderTime(
      rendererController.profiler()?.gpuRenderTime()?.getPercentile(0.1)
    );
  }, 1000);

  return (
    <div className="fps-counter">
      {fps !== undefined ? <h2>FPS: {fps.toFixed(1)}</h2> : <></>}
      {cpuRenderTime !== undefined ? (
        <h2>CPU Frame Time: {cpuRenderTime.toFixed(1)} ms</h2>
      ) : (
        <></>
      )}
      {gpuRenderTime !== undefined ? (
        <h2>GPU Frame Time: {gpuRenderTime.toFixed(1)} ms</h2>
      ) : (
        <></>
      )}
    </div>
  );
}
