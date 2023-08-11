import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useAnimation } from "@/client/util/animation";
import { PerformanceTimer } from "@/shared/metrics/performance_timing";
import {
  AccumulatorContext,
  defaultCvalDatabase,
  get,
} from "@/shared/util/cvals";
import { useLayoutEffect, useMemo, useRef } from "react";
import Stats from "three/examples/jsm/libs/stats.module.js";

export const PerformanceStats: React.FunctionComponent<{
  defaultPanel?: number;
  extraClassNames?: string;
}> = ({ defaultPanel, extraClassNames }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<Stats>();
  const lastTime = useRef<number>();
  const networkPanel = useRef<Stats.Panel>();
  const eventPanel = useRef<Stats.Panel>();
  const updateLagPanel = useRef<Stats.Panel>();
  const renderScalePanel = useRef<Stats.Panel>();
  const gpuPanel = useRef<Stats.Panel>();
  const lastUpdateTime = useRef<number>(performance.now());
  const accumulatorContext = useMemo(() => new AccumulatorContext(), []);
  const { rendererController } = useClientContext();
  useLayoutEffect(() => {
    if (wrapperRef.current) {
      statsRef.current = new (Stats as any)();
      wrapperRef.current.appendChild(statsRef.current!.dom);

      networkPanel.current = statsRef.current!.addPanel(
        new (Stats.Panel as any)("RTT", "#ddd", "#333")
      );
      eventPanel.current = statsRef.current!.addPanel(
        new (Stats.Panel as any)("EvT", "#FFA500", "#333")
      );
      updateLagPanel.current = statsRef.current!.addPanel(
        new (Stats.Panel as any)("UpL", "#e607de", "#333")
      );
      renderScalePanel.current = statsRef.current!.addPanel(
        new (Stats.Panel as any)("RS", "#FFD700", "#333")
      );
      gpuPanel.current = statsRef.current!.addPanel(
        new (Stats.Panel as any)("GPU", "#b7b6FF", "#333")
      );

      statsRef.current?.showPanel(3);
      statsRef.current?.showPanel(defaultPanel ?? 0);
      return () => {
        wrapperRef.current?.removeChild(statsRef.current!.dom);
      };
    }
  }, []);

  useAnimation(() => {
    if (statsRef.current) {
      statsRef.current.update();
    }

    if (
      (networkPanel.current || eventPanel.current) &&
      (!lastUpdateTime.current ||
        performance.now() - lastUpdateTime.current > 1000)
    ) {
      lastUpdateTime.current = performance.now();

      const networkRtt = new PerformanceTimer("network:rtt", true)
        .aggregateStats;

      if (networkPanel.current) {
        networkPanel.current.update(networkRtt.latest, 500);
      }

      if (eventPanel.current) {
        const cval = get(defaultCvalDatabase(), [
          "zrpc_client_ms_histogram",
          "/sync/publish",
        ]);
        if (cval?.kind === "CvalHook") {
          const t = accumulatorContext.accumulate(
            cval,
            performance.now()
          ) as any;
          eventPanel.current.update(
            Math.max(0, t.sum / t.count - networkRtt.latest),
            500
          );
        }
      }

      if (updateLagPanel.current) {
        const cval = get(defaultCvalDatabase(), [
          "game",
          "sync",
          "lastUpdateAge",
        ]);
        if (cval?.kind === "CvalHook") {
          const value = cval.collect();
          if (typeof value === "number") {
            updateLagPanel.current.update(Math.max(0, value), 1000);
          }
        }
      }
      if (renderScalePanel.current) {
        renderScalePanel.current.update(
          (rendererController.passRenderer?.pixelRatio() || 0) * 100,
          200
        );
      }
      if (gpuPanel.current) {
        const value = rendererController.profiler()?.gpuRenderTime()?.min();
        if (typeof value === "number") {
          gpuPanel.current.update(value, 200);
        }
      }
    }
    lastTime.current = performance.now();
  });

  return (
    <div
      className={`performance-stats ${extraClassNames ?? ""}`}
      ref={wrapperRef}
    />
  );
};

export default PerformanceStats;
