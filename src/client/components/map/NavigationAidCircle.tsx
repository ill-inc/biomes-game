import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { NavigationAidCircleContext } from "@/client/components/map/helpers";
import { NavigationAidCircleMarker } from "@/client/components/map/markers/NavigationAidCircleMarker";
import { mapMap } from "@/shared/util/collections";
import React, { useState } from "react";

export const NavigationAidCircle: React.FunctionComponent<{}> = ({}) => {
  const [map, setMap] = useState<HTMLDivElement | null>(null);

  const { mapManager, reactResources } = useClientContext();
  const navBeams = mapManager.react.useNavigationAids();

  const currentSelection = reactResources.use("/hotbar/selection");
  if (currentSelection.kind === "camera") return <></>;

  if (navBeams.size === 0) {
    return <></>;
  }

  return (
    <NavigationAidCircleContext.Provider value={{ map }}>
      <div className="navigation-overlay-wrap" ref={(newMap) => setMap(newMap)}>
        <div className="relative h-full w-full">
          {mapMap(navBeams, (navigationAid) => (
            <NavigationAidCircleMarker
              key={navigationAid.id}
              navigationAid={navigationAid}
            />
          ))}
        </div>
      </div>
    </NavigationAidCircleContext.Provider>
  );
};
