import { CatchMessageView } from "@/client/components/chat/CatchMessageView";
import { DeathMessageView } from "@/client/components/chat/DeathMessageView";
import { EmoteMessageView } from "@/client/components/chat/EmoteMessageView";
import { ErrorMessageView } from "@/client/components/chat/ErrorMessageView";
import { FollowMessageView } from "@/client/components/chat/FollowMessageView";
import { LikeMessageView } from "@/client/components/chat/LikeMessageView";
import { MetaquestPointsMessageView } from "@/client/components/chat/MetaquestPointsMessageView";
import { MinigameJoinMessageView } from "@/client/components/chat/MinigameJoinMessageView";
import { NewSessionMessageView } from "@/client/components/chat/NewSessionMessageView";
import { PhotoMessageView } from "@/client/components/chat/PhotoMessageView";
import { TextMessageView } from "@/client/components/chat/TextMessageView";
import { TypingMessageView } from "@/client/components/chat/TypingMessageView";
import { WarpMessageView } from "@/client/components/chat/WarpMessageView";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import type { Envelope } from "@/shared/chat/types";
import { passNever } from "@/shared/util/type_helpers";
import { sortBy } from "lodash";
import React from "react";

export const Message: React.FunctionComponent<{
  envelope: Envelope;
  onLoadImage?: () => any;
}> = ({ envelope, onLoadImage }) => {
  const { socialManager } = useClientContext();
  const { message } = envelope;
  const maybeUser = useCachedUserInfo(socialManager, envelope.from);
  if (maybeUser?.user.disabled) {
    return <></>;
  }

  switch (message.kind) {
    case "text":
      return <TextMessageView envelope={envelope} message={message} />;
    case "error":
      return <ErrorMessageView message={message} />;
    case "emote":
      return <EmoteMessageView envelope={envelope} message={message} />;
    case "catch":
      return <CatchMessageView envelope={envelope} message={message} />;
    case "photo":
      return (
        <PhotoMessageView
          envelope={envelope}
          message={message}
          onLoadImage={onLoadImage}
        />
      );
    case "warp":
      return <WarpMessageView envelope={envelope} message={message} />;
    case "death":
      return <DeathMessageView envelope={envelope} message={message} />;
    case "typing":
      return <TypingMessageView envelope={envelope} />;
    case "follow":
      return <FollowMessageView envelope={envelope} message={message} />;
    case "like":
      return <LikeMessageView envelope={envelope} message={message} />;
    case "new_session":
      return <NewSessionMessageView envelope={envelope} />;
    case "minigame_join":
      return <MinigameJoinMessageView envelope={envelope} message={message} />;
    case "metaquest_points":
      return (
        <MetaquestPointsMessageView envelope={envelope} message={message} />
      );
    case "mailSent":
      return (
        <TextMessageView
          envelope={envelope}
          message={{
            kind: "text",
            content: "Mail sent",
          }}
        />
      );
    case "comment":
    case "tag":
    case "royalty":
    case "read":
    case "popped":
    case "challenge_unlock":
    case "challenge_complete":
    case "group_create":
    case "recipe_unlock":
    case "purchase":
    case "minigame_simple_race_finish":
    case "invitedToTeam":
    case "robotExpired":
    case "robotTransmission":
    case "robotVisitorMessage":
    case "beginTrade":
    case "discovery":
    case "enter_my_robot":
    case "requestedToJoinTeam":
    case "requestToJoinTeamAccepted":
    case "joined_my_team":
    case "crafting_station_royalty":
    case "robotInventoryChanged":
    case "overflowedToInbox":
    case "minigame_royalty":
    case "mailReceived":
      return <></>;
    default:
      passNever(message);
      return <></>;
  }
};

const PureMessage = React.memo(Message);
export const MessageList: React.FunctionComponent<{
  mail: Envelope[];
  messageVersion?: number;
  onLoadImage?: () => any;
}> = React.memo(({ mail, onLoadImage }) => {
  const noConflict = sortBy(mail, (e, i) => [
    i,
    e.message.kind === "typing" && (e.from || 0),
  ]);
  return (
    <>
      {noConflict.map((envelope) => (
        <PureMessage
          envelope={envelope}
          key={envelope.id}
          onLoadImage={onLoadImage}
        />
      ))}
    </>
  );
});
