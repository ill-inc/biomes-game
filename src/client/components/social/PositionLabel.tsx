import { useLocationNameForPosition } from "@/client/util/location_helpers";
import type { ReadonlyVec3f } from "@/shared/ecs/gen/types";

export const PositionLabel: React.FunctionComponent<{
  position: ReadonlyVec3f;
}> = ({ position }) => {
  const name = useLocationNameForPosition(position);
  return <>{name ?? "Location"}</>;
};
