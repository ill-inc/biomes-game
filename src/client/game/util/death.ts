import type { ClientTable } from "@/client/game/game";
import type { ClientReactResources } from "@/client/game/resources/types";
import { getPlayerCreatedRobots } from "@/client/game/util/robots";
import { GENESIS_CROSSROADS_LOCATION } from "@/client/util/nux/state_machines";
import { STARTER_AREA_NAME } from "@/shared/constants";
import type { WarpHomeDestination } from "@/shared/firehose/events";
import type { BiomesId } from "@/shared/ids";
import { dist } from "@/shared/math/linear";
export interface WarpHomeLocationDisplay {
  name: string;
  distance: number;
  location: WarpHomeDestination;
}

export const useValidHomestoneLocations = useValidResurrectionLocations;
export function useValidResurrectionLocations({
  userId,
  table,
  reactResources,
}: {
  userId: BiomesId;
  reactResources: ClientReactResources;
  table: ClientTable;
}): WarpHomeLocationDisplay[] {
  const playerPos = reactResources.get("/scene/local_player").player.position;

  const result: WarpHomeLocationDisplay[] = [];

  // Robot locations.
  const robots = getPlayerCreatedRobots(table, userId);
  for (const robot of robots) {
    const pos = robot?.position?.v;
    if (!pos) {
      continue;
    }
    result.push({
      name: robot.label?.text ?? "Your Robot",
      distance: dist(playerPos, pos),
      location: {
        kind: "robot",
        robotId: robot.id,
      },
    });
  }

  // Starter location.
  result.push({
    name: STARTER_AREA_NAME,
    distance: dist(playerPos, [
      GENESIS_CROSSROADS_LOCATION[0],
      playerPos[1],
      GENESIS_CROSSROADS_LOCATION[1],
    ]),
    location: {
      kind: "starter_location",
    },
  });

  return result;
}
