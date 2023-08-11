import { AvatarView, LinkableUsername } from "@/client/components/chat/Links";
import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import { getBiscuit } from "@/shared/bikkie/active";
import type { MetaquestPointsMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";

export const MetaquestPointsMessageView: React.FunctionComponent<{
  envelope: Envelope;
  message: MetaquestPointsMessage;
}> = ({ envelope: _envelope, message }) => {
  const { points } = message;
  const [teamLabel, team] = useLatestAvailableComponents(
    message.team,
    "label",
    "team"
  );
  const teamName = teamLabel?.text;
  const metaquestName = getBiscuit(message.metaquest).displayName;
  const playerNameElement = (
    <span className="actor">
      <LinkableUsername who={message.player} />
    </span>
  );
  const name = teamName ? (
    <>
      Team {teamName} (by {playerNameElement})
    </>
  ) : (
    playerNameElement
  );
  const icon = team ? team.icon : <AvatarView userId={message.player} />;
  return (
    <div className="message emote center">
      {icon}
      <div>
        {metaquestName}: {points} awarded to {name}
      </div>
    </div>
  );
};
