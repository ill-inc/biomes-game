import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  useLatestAvailableComponents,
  useLatestAvailableEntity,
} from "@/client/components/hooks/client_hooks";
import type { InventoryLeftSlideoverStackPayload } from "@/client/components/overflow/types";
import { TeamLabel } from "@/client/components/social/TeamLabel";
import { useExistingPaneSlideoverStackContext } from "@/client/components/system/mini_phone/split_pane/PaneSlideoverStack";
import type { BiomesId } from "@/shared/ids";

export const TeamSection: React.FunctionComponent<{
  userId: BiomesId;
}> = ({ userId }) => {
  const { userId: loggedInUserId } = useClientContext();
  const [playerTeam] = useLatestAvailableComponents(
    userId,
    "player_current_team"
  );
  const teamEntity = useLatestAvailableEntity(playerTeam?.team_id);

  const slideoverStack =
    useExistingPaneSlideoverStackContext<InventoryLeftSlideoverStackPayload>();

  if (!playerTeam?.team_id && userId === loggedInUserId) {
    return (
      <div
        onClick={() => {
          slideoverStack.pushNavigationStack({
            type: "create_team",
          });
        }}
        className="cursor-pointer"
      >
        Create Team
      </div>
    );
  }

  if (teamEntity) {
    return (
      <div
        className="cursor-pointer"
        onClick={() => {
          slideoverStack.pushNavigationStack({
            type: "view_team",
            team_id: teamEntity.id,
          });
        }}
      >
        <TeamLabel teamEntity={teamEntity} />
      </div>
    );
  }

  return <></>;
};
