import { world2ToPannableMapCoordinates } from "@/client/components/map/helpers";
import { PannableMapLabel } from "@/client/components/map/markers/PannableMapLabel";
import type { Landmark } from "@/pages/api/world_map/landmarks";
import { xzProject } from "@/shared/math/linear";
import React from "react";

export const PannableMapLandmarkLabels: React.FunctionComponent<{
  landmarks: Landmark[];
}> = React.memo(({ landmarks }) => {
  const showOnMap = landmarks.filter((landmark) => landmark.importance === 0);

  return (
    <>
      {showOnMap.map((landmark) => (
        <PannableMapLabel
          key={landmark.id}
          name={landmark.name}
          position={world2ToPannableMapCoordinates(
            xzProject(landmark.position)
          )}
        />
      ))}
    </>
  );
});
