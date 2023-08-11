import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { CSS3DTV } from "@/client/components/css3d/CSS3DTV";
import { CSS_3D_CONTAINER_CLASSNAME } from "@/client/components/css3d/helpers";
import {
  CSS3DMetagameLeaderboard,
  CSS3DMinigameLeaderboard,
  SmallLeaderboard,
  TextSign,
} from "@/client/components/minigames/simple_race/CSS3DLeaderboard";
import { useMountNearbyEntities } from "@/client/util/proximity";
import { BikkieIds } from "@/shared/bikkie/ids";
import { PlaceableSelector } from "@/shared/ecs/gen/selectors";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import React, { useEffect, useState } from "react";

export const CSS3DComponents: React.FunctionComponent<{
  setComponentCount: (count: number) => unknown;
}> = ({ setComponentCount }) => {
  const { reactResources, table } = useClientContext();
  const tweaks = reactResources.use("/tweaks");

  const entityIds = useMountNearbyEntities(
    (cameraPos) =>
      table.scan(
        PlaceableSelector.query.spatial.inSphere({
          center: cameraPos,
          radius: tweaks.css3DUnloadRadius,
        })
      ),
    tweaks.css3DRadius,
    tweaks.css3DUnloadRadius
  );

  useEffect(() => {
    setComponentCount(entityIds.length);
  }, [entityIds.length]);

  if (!tweaks.css3DEnabled) {
    return <></>;
  }

  return (
    <>
      {entityIds.map((id) => (
        <CSS3DComponent entityId={id} key={id} />
      ))}
    </>
  );
};

export const CSS3DComponent: React.FunctionComponent<{
  entityId: BiomesId;
}> = React.memo(({ entityId }) => {
  const { reactResources } = useClientContext();
  const placeableComponent = reactResources.use(
    "/ecs/c/placeable_component",
    entityId
  );

  const item = anItem(placeableComponent?.item_id);
  switch (placeableComponent?.item_id) {
    case BikkieIds.metagameLeaderboard:
      return (
        <CSS3DMetagameLeaderboard
          key={entityId}
          entityId={entityId}
          itemId={placeableComponent.item_id}
          group="individual"
        />
      );
    case BikkieIds.metagameTeamLeaderboard:
      return (
        <CSS3DMetagameLeaderboard
          key={entityId}
          entityId={entityId}
          itemId={placeableComponent.item_id}
          group="team"
        />
      );
    case BikkieIds.minigameLeaderboard:
      return <CSS3DMinigameLeaderboard key={entityId} entityId={entityId} />;
    case BikkieIds.smallLeaderboard:
      return <SmallLeaderboard key={entityId} entityId={entityId} />;
    default:
      if (item?.isCustomizableTextSign) {
        return <TextSign key={entityId} entityId={entityId} />;
      } else if (item?.isTv) {
        return <CSS3DTV key={entityId} entityId={entityId} />;
      }
      return <></>;
  }
});

export const CSS3DContainer: React.FunctionComponent<{}> = ({}) => {
  const { reactResources } = useClientContext();
  const [componentCount, setComponentCount] = useState(0);
  const tweaks = reactResources.use("/tweaks");
  if (!tweaks.css3DEnabled) {
    return <></>;
  }

  return (
    <div
      className={`${CSS_3D_CONTAINER_CLASSNAME} pointer-events-none absolute left-0 top-0 z-[-1] text-[14px] `}
      data-items={componentCount}
    >
      <div className="css3d-camera">
        <CSS3DComponents setComponentCount={setComponentCount} />
      </div>
    </div>
  );
};
