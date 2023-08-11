import type { ClientReactResources } from "@/client/game/resources/types";
import type { BiomesId } from "@/shared/ids";
import { useCallback } from "react";

export const CSS_3D_CONTAINER_CLASSNAME = "css3d-container";

export function useCSS3DRefCallback(
  resources: ClientReactResources,
  entityId: BiomesId
) {
  return useCallback(
    (ref: HTMLDivElement | null) => {
      ref?.style.setProperty("display", "none"); // let the CSS3D renderer set it as needed
      resources.update("/scene/css3d_element", entityId, (e) => {
        e.element = ref ?? undefined;
      });
    },
    [entityId]
  );
}
