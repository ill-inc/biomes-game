import {
  useLatestAvailableComponents,
  useLatestAvailableEntity,
} from "@/client/components/hooks/client_hooks";
import type { ReadonlyTeam } from "@/shared/ecs/gen/components";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import { numberToHex } from "@/shared/math/colors";

export const TeamLabelForUser: React.FunctionComponent<{
  userId: BiomesId;
  withEmoji?: boolean;
}> = ({ userId, withEmoji = false }) => {
  const [playerTeam] = useLatestAvailableComponents(
    userId,
    "player_current_team"
  );
  const teamEntity = useLatestAvailableEntity(playerTeam?.team_id);

  if (!teamEntity) {
    return <></>;
  }

  return (
    <>
      <TeamLabel teamEntity={teamEntity} withEmoji={withEmoji} />
    </>
  );
};

export const TeamBadge: React.FunctionComponent<{
  team: ReadonlyTeam;
  size?: "large" | "small";
}> = ({ team, size = "small" }) => {
  return (
    <div
      className={`biomes-box flex ${
        size == "large"
          ? "h-6 w-6 rounded-full text-xxl"
          : "text-s h-3 w-3 rounded-full"
      } items-center justify-center`}
      style={{
        background: numberToHex(team.color ?? 0xffffff),
      }}
    >
      {team.icon}
    </div>
  );
};

export const TeamLabel: React.FunctionComponent<{
  teamEntity: ReadonlyEntity;
  withEmoji?: boolean;
}> = ({ teamEntity, withEmoji = false }) => {
  return (
    <span className="text-s flex items-center">
      &lt;{teamEntity.label?.text ?? "A Team"}
      {withEmoji && teamEntity.team?.icon}&gt;
    </span>
  );
};
