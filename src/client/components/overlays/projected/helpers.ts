import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { Projection } from "@/client/game/resources/overlays";
import { useAnimation } from "@/client/util/animation";

function convertRange(value: number, r1: number[], r2: number[]) {
  return ((value - r1[0]) * (r2[1] - r2[0])) / (r1[1] - r1[0]) + r2[0];
}

export interface OverlayProjectionParams {
  scale: number;
  opacity: number;
  zIndex: number;

  x: number;
  y: number;
}
export function overlayProjectionParams(
  proj: Projection,
  forceFull?: boolean
): OverlayProjectionParams {
  const scale =
    proj.proximity !== undefined && !forceFull
      ? convertRange(proj.proximity, [0, 1], [0.2, 1])
      : 1;
  const opacity =
    proj.proximity !== undefined && !forceFull
      ? convertRange(proj.proximity, [0, 0.25], [0, 1])
      : 1;

  const zIndex = Math.round(1000 - proj.loc[2] * 1000);

  return {
    scale,
    opacity,
    zIndex,
    x: proj.loc[0],
    y: proj.loc[1],
  };
}

export function useAppliedOverlayPosition(
  positionedDiv: React.RefObject<HTMLDivElement>,
  key: string,
  forceFull?: boolean
) {
  const { reactResources } = useClientContext();
  useAnimation(() => {
    if (!positionedDiv.current) {
      return;
    }
    const proj = reactResources.get("/overlays/projection").get(key);

    if (!proj) {
      positionedDiv.current.style.display = "none";
      return;
    }

    const { scale, opacity, x, y, zIndex } = overlayProjectionParams(
      proj,
      forceFull
    );

    positionedDiv.current.style.display = "";
    positionedDiv.current.style.zIndex = String(zIndex);
    positionedDiv.current.style.transform = `translateX(-50%) translateY(-50%) translate(${x}px, ${y}px) scale(${scale})`;
    positionedDiv.current.style.opacity = String(opacity);
  });
}
