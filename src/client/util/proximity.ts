import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useInterval } from "@/client/util/intervals";
import type { ReadonlyEntityWith } from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import { dist } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { isEqual, sortedUniq } from "lodash";
import { useState } from "react";

export function useMountNearbyEntities(
  scan: (cameraPos: Vec3) => Iterable<ReadonlyEntityWith<"position">>,
  mountRadius: number,
  unmountRadius: number
) {
  // This code assumes that entities don't move, only player moves.

  const { resources } = useClientContext();
  const [entityIds, setEntityIds] = useState<BiomesId[]>([]);

  useInterval(() => {
    const cameraPos = resources.get("/scene/camera").pos();

    let newEntityIds = entityIds.filter((id) => {
      const position = resources.get("/ecs/c/position", id)?.v;
      if (!position) {
        return false;
      }
      const distance = dist(position, cameraPos);
      return distance < unmountRadius;
    });
    for (const entity of scan(cameraPos)) {
      const distance = dist(entity.position.v, cameraPos);
      if (distance < mountRadius) {
        newEntityIds.push(entity.id);
      }
    }
    newEntityIds.sort();
    newEntityIds = sortedUniq(newEntityIds);

    setEntityIds((oldEntityIds) => {
      if (isEqual(oldEntityIds, newEntityIds)) {
        return oldEntityIds;
      }
      return newEntityIds;
    });
  }, 300);

  return entityIds;
}
