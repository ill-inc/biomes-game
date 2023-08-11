import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import type { ClientResources } from "@/client/game/resources/types";
import { useCachedUsername } from "@/client/util/social_manager_hooks";
import type { ReadonlyVec3f } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";

export function useLocationNameForRobot(robotId?: BiomesId) {
  const { reactResources } = useClientContext();
  const [createdBy, landmark, robotLabel] = reactResources.useAll(
    ["/ecs/c/created_by", robotId ?? INVALID_BIOMES_ID],
    ["/ecs/c/landmark", robotId ?? INVALID_BIOMES_ID],
    ["/ecs/c/label", robotId ?? INVALID_BIOMES_ID]
  );

  const creatorName = useCachedUsername(createdBy?.id);
  const robotName = robotLabel?.text;

  let locationName: string | undefined = undefined;
  if (landmark) {
    locationName = landmark.override_name;
  } else if (creatorName) {
    locationName = `${creatorName}’s Home`;
  } else if (robotName) {
    locationName = `${robotName}`;
  } else {
    locationName = undefined;
  }

  return locationName;
}

export function getLocationNameForRobot(
  resources: ClientResources,
  robotId: BiomesId
) {
  const landmark = resources.get("/ecs/c/landmark", robotId);
  if (landmark && landmark.override_name) {
    return landmark.override_name;
  }

  const createdBy = resources.get("/ecs/c/created_by", robotId);
  const creator = resources.get(
    "/ecs/c/label",
    createdBy?.id ?? INVALID_BIOMES_ID
  );

  if (creator && creator.text) {
    return `${creator.text}’s Home`;
  }

  const robotLabel = resources.get("/ecs/c/label", robotId);
  if (robotLabel) {
    return robotLabel.text;
  }

  return "a robot";
}

export function useCurrentLandTeamName(): string | undefined {
  const { reactResources } = useClientContext();
  const robotId =
    reactResources.use("/player/effective_robot").value ?? INVALID_BIOMES_ID;
  const createdBy = reactResources.use("/ecs/c/created_by", robotId);
  const creatorTeam = reactResources.get(
    "/ecs/c/player_current_team",
    createdBy?.id ?? INVALID_BIOMES_ID
  );
  return useLatestAvailableComponents(creatorTeam?.team_id, "label")[0]?.text;
}

export function useLocationNameForPosition(position: ReadonlyVec3f) {
  const { permissionsManager, resources } = useClientContext();
  const maybeRobotId = permissionsManager.robotIdAt(resources, position);
  return useLocationNameForRobot(maybeRobotId ?? INVALID_BIOMES_ID);
}

export function useCurrentLandName(): string | undefined {
  const { reactResources } = useClientContext();

  const effectiveRobotId =
    reactResources.use("/player/effective_robot").value ?? INVALID_BIOMES_ID;
  return useLocationNameForRobot(effectiveRobotId);
}
