import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { getClientRenderPosition } from "@/client/components/map/helpers";
import type { ClientContextSubset } from "@/client/game/context";
import { getPlayerCreatedRobots, getRobots } from "@/client/game/util/robots";
import { useStateDeepEqual } from "@/client/util/hooks";
import { useInterval } from "@/client/util/intervals";
import { PlayerSelector } from "@/shared/ecs/gen/selectors";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { distSq } from "@/shared/math/linear";

function nearbyPlayerIds(
  deps: ClientContextSubset<"resources" | "table">,
  queryDistance?: number | undefined
): Set<BiomesId> {
  const localPlayer = deps.resources.get("/scene/local_player");
  const ret = new Set<BiomesId>();
  const q = queryDistance
    ? deps.table.scan(
        PlayerSelector.query.spatial.inSphere(
          {
            center: localPlayer.player.position,
            radius: queryDistance,
          },
          {
            approx: true,
          }
        )
      )
    : deps.table.scan(PlayerSelector.query.all());

  for (const player of q) {
    if (player.id !== localPlayer.id) {
      ret.add(player.id);
    }
  }

  return ret;
}

function fetchPlayerCreatedRobotIds(
  deps: ClientContextSubset<"resources" | "table">,
  maxMarkers?: number
) {
  const localPlayer = deps.resources.get("/scene/local_player");
  const robots = Array.from(getPlayerCreatedRobots(deps.table, localPlayer.id));
  if (maxMarkers && robots.length > maxMarkers) {
    const pos = localPlayer.player.position;
    robots.sort(
      (a, b) => distSq(a.position.v, pos) - distSq(b.position.v, pos)
    );
    robots.splice(maxMarkers);
  }

  return new Set<BiomesId>(robots.map((e) => e.id));
}

function fetchAllRobotIds(deps: ClientContextSubset<"resources" | "table">) {
  const robots = Array.from(getRobots(deps.table)).filter((e) => {
    const biscuit = anItem(e.npc_metadata?.type_id);
    return biscuit?.hideProtectionArea !== true;
  });
  return new Set<BiomesId>(robots.map((e) => e.id));
}

export function useNearbyAndTrackedPlayers(
  queryDistance?: number,
  everyMs = 1000
) {
  const clientContext = useClientContext();
  const [markers, setMarkers] = useStateDeepEqual<Set<BiomesId>>(new Set());
  useInterval(() => {
    const nearbyPlayers = nearbyPlayerIds(clientContext, queryDistance);
    for (const trackedPlayer of clientContext.mapManager.trackingPlayerIds) {
      nearbyPlayers.add(trackedPlayer);
    }

    setMarkers(nearbyPlayers);
  }, everyMs);
  return markers;
}

export function usePlayerCreatedRobots(maxMarkers?: number, everyMs = 1000) {
  const [markers, setMarkers] = useStateDeepEqual<Set<BiomesId>>(new Set());
  const clientContext = useClientContext();

  useInterval(() => {
    setMarkers(fetchPlayerCreatedRobotIds(clientContext, maxMarkers));
  }, everyMs);
  return markers;
}

export function useAllRobots(everyMs = 1000) {
  const [markers, setMarkers] = useStateDeepEqual<Set<BiomesId>>(new Set());
  const clientContext = useClientContext();

  useInterval(() => {
    setMarkers(fetchAllRobotIds(clientContext));
  }, everyMs);
  return markers;
}

// Gets smoothed position if available
export function useClientRenderPosition(entityId: BiomesId) {
  const clientContext = useClientContext();
  clientContext.reactResources.use("/ecs/c/position", entityId);
  return getClientRenderPosition(clientContext.resources, entityId);
}
