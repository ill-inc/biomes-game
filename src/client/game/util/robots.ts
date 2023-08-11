import type { ClientContextSubset } from "@/client/game/context";
import type { ClientTable } from "@/client/game/game";
import type { ClientResources } from "@/client/game/resources/types";
import { getLocationNameForRobot } from "@/client/util/location_helpers";
import {
  RobotSelector,
  RobotsByCreatorIdSelector,
} from "@/shared/ecs/gen/selectors";
import type {
  EcsResourceDeps,
  EcsResources,
} from "@/shared/game/ecs_resources";
import type { Item } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { distSq, nearestGridPosition } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import type { Vec3f } from "@/shared/wasm/types/common";

export function getRobotProtectionGridPosition(
  deps: EcsResources | EcsResourceDeps,
  entityId: BiomesId,
  center: Vec3
) {
  const protectionSize = getRobotProtectionSize(deps, entityId);
  if (!protectionSize) {
    return;
  }

  const projectsProtection = deps.get("/ecs/c/projects_protection", entityId);
  const position = projectsProtection?.snapToGrid
    ? nearestGridPosition(center, protectionSize, projectsProtection.snapToGrid)
    : center;
  return position;
}

export function getRobotProtectionSize(
  resources: EcsResources | EcsResourceDeps,
  entityId: BiomesId
) {
  return (
    resources.get("/ecs/c/projects_protection", entityId)?.size ??
    relevantBiscuitForEntityId(resources, entityId)?.projectsProtection?.size
  );
}

export function getRobots(table: ClientTable) {
  return table.scan(RobotSelector.query.all());
}

export function getPlayerCreatedRobots(table: ClientTable, playerId: BiomesId) {
  return table.scan(RobotsByCreatorIdSelector.query.key(playerId));
}

export function getClosestPlayerCreatedRobot(
  table: ClientTable,
  playerId: BiomesId
) {
  const playerPosition = table.get(playerId)?.position?.v;
  if (!playerPosition) {
    return;
  }
  const robots = Array.from(getPlayerCreatedRobots(table, playerId));
  if (robots.length === 0) {
    return;
  }
  if (robots.length === 1) {
    return robots[0];
  }
  robots.sort((a, b) => {
    const aDist = distSq(a.position?.v ?? [0, 0, 0], playerPosition);
    const bDist = distSq(b.position?.v ?? [0, 0, 0], playerPosition);
    return aDist - bDist;
  });
  return robots[0];
}

export function getClosestPlayerCreatedRobotName(
  table: ClientTable,
  playerId: BiomesId
): string {
  const robot = getClosestPlayerCreatedRobot(table, playerId);
  if (!robot) {
    return "Your Robot";
  }

  return robot.label?.text ?? "Your Robot";
}

export function isAdminRobot(resources: ClientResources, entityId: BiomesId) {
  const robotComponent = resources.get("/ecs/c/robot_component", entityId);
  if (!robotComponent) {
    return false;
  }
  const robotOwner = resources.get("/ecs/c/created_by", entityId);
  if (!robotOwner) {
    return true;
  }

  return false;
}

export function isCreatedRobot(resources: ClientResources, entityId: BiomesId) {
  const robotComponent = resources.get("/ecs/c/robot_component", entityId);
  if (!robotComponent) {
    return false;
  }
  const robotOwner = resources.get("/ecs/c/created_by", entityId);
  if (!robotOwner) {
    return false;
  }
  return robotOwner.id === resources.get("/scene/local_player")?.player.id;
}

export function invalidPlacementReason(
  deps: ClientContextSubset<
    "resources" | "table" | "permissionsManager" | "userId"
  >,
  robotItem: Item,
  position: Vec3f
): undefined | string {
  if (!deps.permissionsManager.getPermissionForAction(position, "placeRobot")) {
    const roles = deps.resources.get("/ecs/c/user_roles", deps.userId);
    if (robotItem.isAdminEntity && roles?.roles.has("groundskeeper")) {
      return "No permissions to place admin bot, are you a groundskeeper?";
    } else {
      return "You do not have permission to place robots here";
    }
  }
  const violatingId = violatingMinimumFirstPartyGapRobotId(
    deps,
    robotItem,
    position
  );
  if (violatingId) {
    return `Too close to ${getLocationNameForRobot(
      deps.resources,
      violatingId
    )}`;
  }
}

export function violatingMinimumFirstPartyGapRobotId(
  deps: ClientContextSubset<"resources" | "table" | "permissionsManager">,
  robotItem: Item,
  position: Vec3f
): BiomesId | undefined {
  if (robotItem.isAdminEntity) {
    return;
  }

  const gridSize = robotItem.projectsProtection?.snapToGrid;
  if (!gridSize) {
    return;
  }

  for (let gridX = -1; gridX <= 1; gridX++) {
    for (let gridY = -1; gridY <= 1; gridY++) {
      if (gridX === 0 && gridY === 0) {
        continue;
      }

      const otherGridPos: Vec3 = [
        position[0] + gridX * gridSize,
        position[1],
        position[2] + gridY * gridSize,
      ];

      const otherRobot = deps.permissionsManager.robotIdAt(
        deps.resources,
        otherGridPos
      );
      if (otherRobot && isAdminRobot(deps.resources, otherRobot)) {
        return otherRobot;
      }
    }
  }

  return undefined;
}
