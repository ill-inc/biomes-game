import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import type { BiomesId } from "@/shared/ids";
import type { UserBundle } from "@/shared/types";

type UserTeamFilter = {
  type: "team";
  onOneOf?: BiomesId[];
  notOnOneOf?: BiomesId[];
};

export type UserFilter = UserTeamFilter;

export const useUserTeamPredicate = (
  user: UserBundle,
  options?: UserTeamFilter
): boolean => {
  const [userTeam] = useLatestAvailableComponents(
    user.id,
    "player_current_team"
  );
  const userTeamId = userTeam?.team_id;
  const userOnTeam = userTeamId !== undefined;

  if (options === undefined) {
    return true;
  }

  if (userOnTeam) {
    // Not on required team list.
    if (options.onOneOf && !options.onOneOf.includes(userTeamId)) {
      return false;
    }
    // On not allowed team list.
    if (options.notOnOneOf && options.notOnOneOf.includes(userTeamId)) {
      return false;
    }
  }

  return true;
};

export const useUserPredicate = (
  user: UserBundle,
  filters: UserFilter[]
): boolean => {
  const keep = useUserTeamPredicate(
    user,
    filters.find((filter) => filter.type === "team")
  );

  return keep;
};
