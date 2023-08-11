import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { MiniMap } from "@/client/components/map/MiniMap";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { useCurrentLandName } from "@/client/util/location_helpers";
import { WorldMetadataId } from "@/shared/ecs/ids";
import React from "react";
import onlinePlayerIcon from "/public/hud/icon-online-players.png";

export const MINI_MAP_WIDTH = "w-24";
export const MINI_MAP_HEIGHT = "h-24";

export const MINI_MAP_ICON_WIDTH = "w-3";
export const MINI_MAP_ICON_HEIGHT = "h-3";

const OnlinePlayers: React.FunctionComponent<{}> = ({}) => {
  const { reactResources } = useClientContext();
  const onlinePlayers =
    reactResources.use("/ecs/c/synthetic_stats", WorldMetadataId)
      ?.online_players ?? 1;
  return (
    <Tooltipped tooltip="Online Players">
      <div
        onClick={() => {
          reactResources.set("/game_modal", { kind: "map" });
        }}
        className="absolute bottom-3 right-1 flex cursor-pointer items-center gap-0.2 text-sm font-semibold text-silver"
      >
        <img src={onlinePlayerIcon.src} className="h-[2.5vmin] w-[2.5vmin]" />{" "}
        {onlinePlayers ?? 0}
      </div>
    </Tooltipped>
  );
};

const LocationName: React.FunctionComponent<{}> = ({}) => {
  const landName = useCurrentLandName();

  return (
    <div
      className={`w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-marge font-semibold`}
    >
      {landName ?? "The Muck"}
    </div>
  );
};

export const MiniMapHUD: React.FunctionComponent<{}> = ({}) => {
  return (
    <div
      className={`relative flex ${MINI_MAP_WIDTH} flex-col items-center gap-0.6 text-white text-shadow-bordered`}
    >
      <MiniMap />
      <OnlinePlayers />
      <LocationName />
    </div>
  );
};
