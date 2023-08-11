import type { ClientTable } from "@/client/game/game";
import { getClosestPlayerCreatedRobotName } from "@/client/game/util/robots";
import type { BiomesId } from "@/shared/ids";

export function ordinalize(n: number) {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function durationToClockFormat(ms: number, showMs: boolean = true) {
  const date = new Date(ms);
  const includeHours = ms >= 1000 * 3600;
  const substringEnd = showMs ? 23 : 19;
  const timeString = date
    .toISOString()
    .substring(includeHours ? 11 : 14, substringEnd);

  return timeString;
}

export function uncamelCase(s: string) {
  if (!s.match(/^[a-z]+([A-Z][a-z]+)*$/)) {
    return s;
  }
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function replaceDialogKeys(
  table: ClientTable | undefined,
  userId: BiomesId | undefined,
  text: string
) {
  if (!table || !userId) return text;

  const teamNameRegex = /{teamName}/gi;
  if (text.match(teamNameRegex)) {
    const player = table.get(userId);
    const teamId = player?.player_current_team?.team_id;
    const team = teamId && table.get(teamId);
    const teamName = team?.label?.text;
    if (teamName) {
      text = text.replaceAll(teamNameRegex, teamName ?? "Your Team");
    }
  }

  const playerNameRegex = /{playerName}/gi;
  if (text.match(playerNameRegex)) {
    const player = table.get(userId);
    const playerName = player?.label?.text;
    text = text.replaceAll(playerNameRegex, playerName ?? "You");
  }

  const robotNameRegex = /{robotName}/gi;
  if (text.match(robotNameRegex)) {
    const robotName =
      getClosestPlayerCreatedRobotName(table, userId) ?? "Your Robot";
    text = text.replaceAll(robotNameRegex, robotName);
  }
  return text;
}
