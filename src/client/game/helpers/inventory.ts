import type { ClientContextSubset } from "@/client/game/context";
import {
  InventoryDestroyEvent,
  InventoryThrowEvent,
} from "@/shared/ecs/gen/events";
import type { OwnedItemReference } from "@/shared/ecs/gen/types";
import { terrainMarch } from "@/shared/game/terrain_march";
import type { BiomesId } from "@/shared/ids";
import { add, dist, normalizev, scale } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";

export function getThrowPosition(
  deps: ClientContextSubset<"resources" | "clientConfig" | "voxeloo">
) {
  const player = deps.resources.get("/scene/local_player").player;
  // Note that this drop distance is also server-validated
  const dropDist = deps.clientConfig.gameThrowDistance;
  let closestHit: Vec3 | undefined;
  let dropVec = player.viewDir().toArray();
  dropVec[1] = 0;
  dropVec = normalizev(dropVec);
  terrainMarch(
    deps.voxeloo,
    deps.resources,
    player.position,
    dropVec,
    dropDist,
    ({ pos }) => {
      closestHit = [...pos];
    }
  );

  let intersectedDropDist = closestHit
    ? dist(player.position, closestHit) - 1.5
    : dropDist;
  if (intersectedDropDist < 0) {
    intersectedDropDist = 0;
  }

  const dropPos = add(player.position, scale(intersectedDropDist, dropVec));
  dropPos[1] = player.position[1] + 0.5;

  return dropPos;
}

export async function throwInventoryItem(
  deps: ClientContextSubset<
    "events" | "resources" | "clientConfig" | "voxeloo"
  >,
  entityId: BiomesId,
  slotReference: OwnedItemReference,
  count?: bigint
) {
  await deps.events.publish(
    new InventoryThrowEvent({
      id: entityId,
      src: slotReference,
      count,
      position: getThrowPosition(deps),
    })
  );
}

export async function destroyInventoryItem(
  deps: ClientContextSubset<"events">,
  entityId: BiomesId,
  slotReference: OwnedItemReference,
  count?: bigint
) {
  await deps.events.publish(
    new InventoryDestroyEvent({ id: entityId, src: slotReference, count })
  );
}
