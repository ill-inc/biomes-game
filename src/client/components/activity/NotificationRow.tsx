import { doModalOrMiniPhonePush } from "@/client/components/chat/Links";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import {
  CycleItemIcons,
  ItemIcon,
} from "@/client/components/inventory/ItemIcon";
import { useCraftingBundle } from "@/client/components/inventory/crafting/helpers";
import { EntityProfilePic } from "@/client/components/social/EntityProfilePic";
import {
  CallbackUserAvatarLink,
  CallbackUserLink,
} from "@/client/components/social/MiniPhoneUserLink";
import type { SocialMiniPhonePayload } from "@/client/components/social/types";
import { Img } from "@/client/components/system/Img";
import { maybeUseExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { iconForTaskStatus } from "@/client/components/system/tasks/helpers";
import type { GenericMiniPhonePayload } from "@/client/components/system/types";
import type { ProgressMessage } from "@/client/game/resources/chat";
import {
  useCachedGroupBundle,
  useCachedPostBundle,
  useCachedUserInfo,
} from "@/client/util/social_manager_hooks";
import { durationToClockFormat } from "@/client/util/text_helpers";
import { BikkieIds } from "@/shared/bikkie/ids";
import type {
  ErrorMessage,
  ItemDiscoveryMessage,
  MinigameRoyaltyMessage,
  MinigameSimpleRaceFinishMessage,
  PurchaseMessage,
  RobotVisitorMessage,
} from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import type { Item } from "@/shared/ecs/gen/types";
import type {
  InvitedToTeamEvent,
  RobotExpiredEvent,
  RobotTransmissionEvent,
} from "@/shared/firehose/events";
import { anItem } from "@/shared/game/item";
import { stringToItemBag } from "@/shared/game/items_serde";
import type { ItemBag } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import { anyMapValue } from "@/shared/util/collections";
import { displayUsername } from "@/shared/util/helpers";
import { andify } from "@/shared/util/text";
import { passNever } from "@/shared/util/type_helpers";
import { imageUrlForSize } from "@/shared/util/urls";
import {
  epochMsToDuration,
  formatCurrency,
  maybeFormatCurrency,
  socialDocumentTypeToUserString,
} from "@/shared/util/view_helpers";
import { motion } from "framer-motion";
import pluralize from "pluralize";
import type { PropsWithChildren } from "react";
import React, { useCallback } from "react";
import collectionsIcon from "/public/hud/nav/collections-closed.png";

export const ProgressNotificationRow = React.forwardRef<
  HTMLLIElement,
  {
    progressMessage: ProgressMessage;
  }
>(({ progressMessage }, ref) => {
  return (
    <li onClick={() => progressMessage.onClick?.()} ref={ref}>
      <div className="notif-preview progress-message">
        <Img src={iconForTaskStatus(progressMessage.status)} />
      </div>
      <div className="notif-description">{progressMessage.body}</div>
    </li>
  );
});

export const MotionProgressNotificationRow = motion(ProgressNotificationRow);

const LikePostNotificationView: React.FunctionComponent<{
  envelope: Envelope;
  documentType: "post" | "environment_group";
  documentId: BiomesId;
  onSocialClick: (payload: SocialMiniPhonePayload) => void;
}> = ({ envelope, documentType, documentId, onSocialClick }) => {
  const { socialManager } = useClientContext();
  const post =
    documentType === "post"
      ? useCachedPostBundle(socialManager, documentId)
      : useCachedGroupBundle(socialManager, documentId);
  const user = useCachedUserInfo(socialManager, envelope.from);

  if (!envelope.from || !post || !user) {
    return <></>;
  }

  return (
    <li
      onClick={() =>
        onSocialClick({
          type: "social_detail",
          documentType,
          documentId,
        })
      }
    >
      <Img
        src={imageUrlForSize("thumbnail", post.imageUrls)}
        className="notif-preview"
      />
      <div className="notif-description">
        <CallbackUserLink userId={envelope.from} onClick={onSocialClick}>
          {displayUsername(user.user.username)}
        </CallbackUserLink>
        {" liked your "}
        {socialDocumentTypeToUserString(documentType)}
      </div>
      <div className="notif-timestamp">
        {epochMsToDuration(envelope.createdAt)}
      </div>
    </li>
  );
};

const FollowedNotificationView: React.FunctionComponent<{
  envelope: Envelope;
  followerId: BiomesId;
  onSocialClick: (payload: SocialMiniPhonePayload) => void;
}> = ({ envelope, followerId, onSocialClick }) => {
  return (
    <SimpleUserRow
      createdAt={envelope.createdAt}
      previewUserId={followerId}
      onNavigation={() => {
        onSocialClick({
          type: "profile",
          userId: followerId,
        });
      }}
    >
      followed you
    </SimpleUserRow>
  );
};

const CommentNotificationView: React.FunctionComponent<{
  envelope: Envelope;
  documentType: "post" | "environment_group";
  documentId: BiomesId;
  commenterId: BiomesId;
  comment: string;
  onSocialClick: (payload: SocialMiniPhonePayload) => void;
}> = ({
  envelope,
  documentType,
  documentId,
  commenterId,
  comment,
  onSocialClick,
}) => {
  const { socialManager } = useClientContext();
  const user = useCachedUserInfo(socialManager, commenterId);

  if (!envelope.from || !user) {
    return <></>;
  }

  return (
    <li
      onClick={() =>
        onSocialClick({
          type: "social_detail",
          documentId,
          documentType,
        })
      }
    >
      <CallbackUserAvatarLink
        user={user.user}
        extraImageClasses="notif-preview"
        onClick={onSocialClick}
      />
      <div className="notif-description">
        <CallbackUserLink userId={envelope.from} onClick={onSocialClick}>
          {displayUsername(user.user.username)}
        </CallbackUserLink>
        {documentType === "post"
          ? ` commented: `
          : ` commented on your build: `}
        {comment}
      </div>
      <div className="notif-timestamp">
        {epochMsToDuration(envelope.createdAt)}
      </div>
    </li>
  );
};

const UserTagNotificationView: React.FunctionComponent<{
  envelope: Envelope;
  postId: BiomesId;
  userId: BiomesId;
  onSocialClick: (payload: SocialMiniPhonePayload) => void;
}> = ({ envelope, postId, userId, onSocialClick }) => {
  const { socialManager } = useClientContext();
  const post = useCachedPostBundle(socialManager, postId);
  const user = useCachedUserInfo(socialManager, userId);

  if (!envelope.from || !user || !post) {
    return <></>;
  }

  return (
    <li
      onClick={() =>
        onSocialClick({
          type: "social_detail",
          documentId: postId,
          documentType: "post",
        })
      }
    >
      <Img
        src={imageUrlForSize("thumbnail", post.imageUrls)}
        className="notif-preview"
      />
      <div className="notif-description">
        <CallbackUserLink userId={userId} onClick={onSocialClick}>
          {displayUsername(user.user.username)}
        </CallbackUserLink>
        {" tagged you in a photo"}
      </div>
      <div className="notif-timestamp">
        {epochMsToDuration(envelope.createdAt)}
      </div>
    </li>
  );
};

const LandTagNotificationView: React.FC<{
  envelope: Envelope;
  userId: BiomesId;
  onSocialClick: (payload: SocialMiniPhonePayload) => void;
}> = ({ envelope, userId, onSocialClick }) => {
  const { socialManager } = useClientContext();
  const user = useCachedUserInfo(socialManager, userId);
  if (!envelope.from || !user) {
    return <></>;
  }
  return (
    <li
      onClick={() =>
        onSocialClick({
          type: "profile",
          userId,
        })
      }
    >
      <Img
        src={imageUrlForSize("thumbnail", user.user.profilePicImageUrls)}
        className="notif-preview"
      />
      <div className="notif-description">
        <CallbackUserLink userId={userId} onClick={onSocialClick}>
          {displayUsername(user.user.username)}
        </CallbackUserLink>
        {" tagged your land in a photo"}
      </div>
      <div className="notif-timestamp">
        {epochMsToDuration(envelope.createdAt)}
      </div>
    </li>
  );
};

const BuildTagNotificationView: React.FunctionComponent<{
  envelope: Envelope;
  userId: BiomesId;
  buildId: BiomesId;
  onSocialClick: (payload: SocialMiniPhonePayload) => void;
}> = ({ envelope, userId, buildId, onSocialClick }) => {
  const { socialManager } = useClientContext();
  const build = useCachedGroupBundle(socialManager, buildId);
  const user = useCachedUserInfo(socialManager, userId);

  if (!envelope.from || !build || !user) {
    return <></>;
  }
  return (
    <li
      onClick={() =>
        onSocialClick({
          type: "social_detail",
          documentId: buildId,
          documentType: "environment_group",
        })
      }
    >
      <Img
        src={imageUrlForSize("thumbnail", build.imageUrls)}
        className="notif-preview"
      />
      <div className="notif-description">
        <CallbackUserLink userId={userId} onClick={onSocialClick}>
          {displayUsername(user.user.username)}
        </CallbackUserLink>
        {" tagged "}
        <span className="white">{build.name}</span> in a photo
      </div>
      <div className="notif-timestamp">
        {epochMsToDuration(envelope.createdAt)}
      </div>
    </li>
  );
};

const TagNotificationView: React.FunctionComponent<{
  envelope: Envelope;
  documentType: "post" | "environment_group" | "land";
  documentId: BiomesId;
  onSocialClick: (payload: SocialMiniPhonePayload) => void;
}> = ({ envelope, documentType, documentId, onSocialClick }) => {
  if (!envelope.from) {
    return <></>;
  }
  switch (documentType) {
    case "post":
      return (
        <UserTagNotificationView
          envelope={envelope}
          postId={documentId}
          userId={envelope.from}
          onSocialClick={onSocialClick}
        />
      );
    case "environment_group":
      return (
        <BuildTagNotificationView
          envelope={envelope}
          userId={envelope.from}
          buildId={documentId}
          onSocialClick={onSocialClick}
        />
      );
    case "land":
      return (
        <LandTagNotificationView
          envelope={envelope}
          userId={envelope.from}
          onSocialClick={onSocialClick}
        />
      );
  }
  return <></>;
};

const WarpRoyaltyNotificationView: React.FunctionComponent<{
  envelope: Envelope;
  documentType: "post" | "environment_group";
  documentId: BiomesId;
  royalty: bigint;
  onSocialClick: (payload: SocialMiniPhonePayload) => void;
}> = ({ envelope, documentType, documentId, royalty, onSocialClick }) => {
  if (!envelope.from) {
    return <></>;
  }

  const { socialManager } = useClientContext();
  const post =
    documentType === "post"
      ? useCachedPostBundle(socialManager, documentId)
      : useCachedGroupBundle(socialManager, documentId);
  const warper = useCachedUserInfo(socialManager, envelope.from);

  if (!post || !warper) {
    return <></>;
  }

  return (
    <li
      onClick={() => {
        onSocialClick({
          type: "social_detail",
          documentId,
          documentType,
        });
      }}
    >
      <Img
        src={imageUrlForSize("thumbnail", post.imageUrls)}
        className="notif-preview"
      />
      <div className="notif-description">
        <CallbackUserLink userId={warper.user.id} onClick={onSocialClick}>
          {displayUsername(warper.user.username)}
        </CallbackUserLink>{" "}
        warped to your {socialDocumentTypeToUserString(documentType)} and you
        earned {formatCurrency(BikkieIds.bling, royalty, "locale")} Bling
      </div>
      <div className="notif-timestamp">
        {epochMsToDuration(envelope.createdAt)}
      </div>
    </li>
  );
};

const RecipeNotificationRow: React.FunctionComponent<{
  envelope: Envelope;
  recipe: Item;
}> = ({ envelope, recipe }) => {
  const { reactResources, userId } = useClientContext();
  const craftingBundle = useCraftingBundle(
    reactResources,
    userId,
    recipe.id,
    undefined
  );

  return (
    <li
      onClick={() => {
        reactResources.set("/game_modal", {
          kind: "crafting",
        });
      }}
    >
      <ItemIcon item={craftingBundle.item} className="notif-preview" />
      <div className="notif-description">
        You unlocked the recipe for {craftingBundle.name}
      </div>
      <div className="notif-timestamp">
        {epochMsToDuration(envelope.createdAt)}
      </div>
    </li>
  );
};

const ItemDiscoveryRow: React.FunctionComponent<{
  envelope: Envelope;
  message: ItemDiscoveryMessage;
}> = ({ envelope, message }) => {
  const { reactResources } = useClientContext();

  let verb = "discovered";
  switch (message.statsType) {
    case "fished":
      verb = "caught";
      break;
    case "grown":
      verb = "grew";
      break;
    case "takenPhoto":
      verb = "snapped a photo of";
      break;
  }

  return (
    <li
      onClick={() => {
        reactResources.set("/game_modal", {
          kind: "collections",
        });
      }}
    >
      <Img src={collectionsIcon.src} className="notif-preview" />
      <div className="notif-description">
        You {verb} {andify(message.items.map((e) => e.displayName))} for the
        first time
      </div>
      <div className="notif-timestamp">
        {epochMsToDuration(envelope.createdAt)}
      </div>
    </li>
  );
};

const MinigameSimpleRaceFinishNotificationRow: React.FunctionComponent<{
  envelope: Envelope;
  message: MinigameSimpleRaceFinishMessage;
  onSocialClick: (payload: SocialMiniPhonePayload) => void;
}> = ({ envelope, message, onSocialClick }) => {
  const durationMs = 1000 * (message.finishTime - message.startTime);

  const [minigameLabel] = useLatestAvailableComponents(
    message.minigameId,
    "label"
  );

  const raceName = minigameLabel?.text ?? "your race";

  return (
    <SimpleUserRow
      createdAt={envelope.createdAt}
      previewUserId={message.entityId}
      onNavigation={() => {
        onSocialClick({
          type: "profile",
          userId: message.entityId,
        });
      }}
    >
      just finished {raceName} in {durationToClockFormat(durationMs)}
    </SimpleUserRow>
  );
};

const PurchaseNotificationRow: React.FunctionComponent<{
  envelope: Envelope;
  purchase: PurchaseMessage;
  onSocialClick: (payload: SocialMiniPhonePayload) => void;
}> = ({ envelope, purchase, onSocialClick }) => {
  const { socialManager } = useClientContext();
  const purchaser = useCachedUserInfo(socialManager, purchase.entityId);

  if (!purchaser) {
    return <></>;
  }

  const bag = stringToItemBag(purchase.bag);
  const payment = stringToItemBag(purchase.payment);
  const heroItem = anyMapValue(bag);
  const paymentAmount = anyMapValue(payment);

  return (
    <SimpleBagLedRow
      envelope={envelope}
      onNavigation={() => {
        onSocialClick({
          type: "profile",
          userId: purchase.entityId,
        });
      }}
      itemBag={bag}
    >
      <CallbackUserLink userId={purchaser.user.id} onClick={onSocialClick}>
        {displayUsername(purchaser.user.username)}
      </CallbackUserLink>{" "}
      just purchased your {heroItem?.item.displayName} for{" "}
      {maybeFormatCurrency(BikkieIds.bling, paymentAmount?.count, "locale")}{" "}
      Bling
    </SimpleBagLedRow>
  );
};

const InvitedToTeamRow: React.FunctionComponent<{
  envelope: Envelope;
  message: InvitedToTeamEvent;
  onSocialClick: (payload: GenericMiniPhonePayload) => void;
}> = ({ envelope, message, onSocialClick }) => {
  const { socialManager } = useClientContext();
  const inviter = useCachedUserInfo(socialManager, message.inviterId);
  const teamName = useLatestAvailableComponents(message.teamId, "label")[0]
    ?.text;

  return (
    <SimpleUserRow
      createdAt={envelope.createdAt}
      previewUserId={message.inviterId}
      onNavigation={() => {
        onSocialClick({
          type: "self_inventory",
          showingTeamViewForId: message.teamId,
        });
      }}
    >
      just invited you to {teamName}
    </SimpleUserRow>
  );

  if (!inviter) {
    return <></>;
  }
};

// eslint-disable-next-line unused-imports/no-unused-vars
const SimpleNotificationRow: React.FunctionComponent<{
  icon?: string;
  message: string;
  onClick?: () => void;
}> = ({ icon, message, onClick }) => {
  return (
    <li onClick={onClick}>
      {icon && <Img src={icon} className="notif-preview" />}
      <div className="notif-description">{message}</div>
    </li>
  );
};

const SimpleEntityLedRow: React.FunctionComponent<
  PropsWithChildren<{
    entityId: BiomesId;
    createdAt?: number;
    onClick?: () => void;
  }>
> = ({ entityId, createdAt, onClick, children }) => {
  return (
    <li onClick={onClick}>
      <EntityProfilePic entityId={entityId} />
      <div className="notif-description">{children}</div>
      {createdAt && (
        <div className="notif-timestamp">{epochMsToDuration(createdAt)}</div>
      )}
    </li>
  );
};

const RobotExpiredRow: React.FunctionComponent<{
  message: RobotExpiredEvent;
}> = ({ message }) => {
  const name =
    useLatestAvailableComponents(message.robotId, "label")[0]?.text ??
    "Your Robot";
  return (
    <SimpleEntityLedRow
      entityId={message.entityId}
    >{`${name} has expired and has been put back into your inventory.`}</SimpleEntityLedRow>
  );
};

const RobotVisitorMessageRow: React.FunctionComponent<{
  message: RobotVisitorMessage;
  onSocialClick: (payload: SocialMiniPhonePayload) => void;
}> = ({ message, onSocialClick }) => {
  const { socialManager } = useClientContext();

  const name =
    useLatestAvailableComponents(message.robotId, "label")[0]?.text ??
    "Your Robot";

  const visitor = useCachedUserInfo(socialManager, message.visitorId);
  if (!visitor?.user.username) {
    return <></>;
  }
  return (
    <SimpleEntityLedRow entityId={message.robotId}>
      {`${name} was was visited by `}
      <CallbackUserLink userId={visitor.user.id} onClick={onSocialClick}>
        {visitor.user.username}
      </CallbackUserLink>
      {` who said: "${message.message}"`}
    </SimpleEntityLedRow>
  );
};

const RobotTransmissionRow: React.FunctionComponent<{
  message: RobotTransmissionEvent;
}> = ({ message }) => {
  const name =
    useLatestAvailableComponents(message.entityId, "label")[0]?.text ??
    "Your Robot";
  return (
    <SimpleEntityLedRow entityId={message.entityId}>{`${name} has ${
      message.count === 1 ? "a" : message.count
    } ${pluralize(
      "transmission",
      message.count
    )} for you.`}</SimpleEntityLedRow>
  );
};

const ErrorRow: React.FunctionComponent<{
  entityId?: BiomesId;
  message: ErrorMessage;
}> = ({ entityId, message }) => {
  return (
    <li>
      {entityId && <EntityProfilePic entityId={entityId} />}
      <div>{message.content}</div>
    </li>
  );
};

const SimpleUserRow: React.FunctionComponent<
  PropsWithChildren<{
    previewUserId?: BiomesId;
    createdAt: number;
    onNavigation?: () => unknown;
    prefixChildren?: JSX.Element;
  }>
> = ({ previewUserId, createdAt, onNavigation, prefixChildren, children }) => {
  const { socialManager } = useClientContext();
  const previewUser = useCachedUserInfo(socialManager, previewUserId);
  if (!previewUser) {
    return <></>;
  }

  return (
    <li onClick={onNavigation}>
      <CallbackUserAvatarLink
        user={previewUser.user}
        extraImageClasses="notif-preview"
        onClick={onNavigation}
      />
      <div className="notif-description">
        {prefixChildren}
        <CallbackUserLink userId={previewUser.user.id} onClick={onNavigation}>
          {displayUsername(previewUser.user.username)}
        </CallbackUserLink>{" "}
        {children}
      </div>
      <div className="notif-timestamp">{epochMsToDuration(createdAt)}</div>
    </li>
  );
};

const MinigameRoyaltyRow: React.FunctionComponent<{
  envelope: Envelope;
  message: MinigameRoyaltyMessage;
  onSocialClick: (payload: GenericMiniPhonePayload) => void;
}> = ({ envelope, message, onSocialClick }) => {
  const [label] = useLatestAvailableComponents(message.minigameId, "label");
  return (
    <SimpleUserRow
      createdAt={envelope.createdAt}
      onNavigation={() => {
        onSocialClick({
          type: "profile",
          userId: message.joinerId,
        });
      }}
      previewUserId={message.joinerId}
    >
      just joined {label?.text ? label.text : "your minigame"} earned you{" "}
      {formatCurrency(BikkieIds.bling, message.royalty, "locale")} Bling
    </SimpleUserRow>
  );
};

const SimpleBagLedRow: React.FunctionComponent<
  PropsWithChildren<{
    envelope: Envelope;
    itemBag?: ItemBag;
    onNavigation: () => unknown;
  }>
> = ({ envelope, itemBag, onNavigation, children }) => {
  return (
    <li onClick={onNavigation}>
      <CycleItemIcons bag={itemBag} extraClassName="notif-preview" />
      <div className="notif-description">{children}</div>
      <div className="notif-timestamp">
        {epochMsToDuration(envelope.createdAt)}
      </div>
    </li>
  );
};

export const NotificationRow: React.FunctionComponent<{
  viewType: "list" | "popup";
  envelope: Envelope;
}> = ({ envelope }) => {
  const { notificationsManager, reactResources, userId } = useClientContext();
  const existingMiniphoneContext =
    maybeUseExistingMiniPhoneContext<GenericMiniPhonePayload>();
  const onSocialClick = useCallback(
    (payload: GenericMiniPhonePayload) => {
      void notificationsManager.markAs("read");
      doModalOrMiniPhonePush(reactResources, existingMiniphoneContext, payload);
    },
    [existingMiniphoneContext]
  );
  const { message } = envelope;
  switch (message.kind) {
    case "like":
      return (
        <LikePostNotificationView
          envelope={envelope}
          documentType={message.documentType}
          documentId={message.documentId}
          onSocialClick={onSocialClick}
        />
      );

    case "follow":
      if (envelope.from) {
        return (
          <FollowedNotificationView
            envelope={envelope}
            followerId={envelope.from}
            onSocialClick={onSocialClick}
          />
        );
      }
      break;

    case "comment":
      if (envelope.from) {
        return (
          <CommentNotificationView
            envelope={envelope}
            documentType={message.documentType}
            documentId={message.documentId}
            commenterId={envelope.from}
            comment={message.comment}
            onSocialClick={onSocialClick}
          />
        );
      }
      break;

    case "tag":
      return (
        <TagNotificationView
          envelope={envelope}
          documentType={message.documentType}
          documentId={message.documentId}
          onSocialClick={onSocialClick}
        />
      );

    case "royalty":
      return (
        <WarpRoyaltyNotificationView
          envelope={envelope}
          documentType={message.documentType}
          documentId={message.documentId}
          royalty={message.royalty}
          onSocialClick={onSocialClick}
        />
      );
    case "crafting_station_royalty":
      return (
        <SimpleUserRow
          createdAt={envelope.createdAt}
          onNavigation={() => {
            onSocialClick({
              type: "profile",
              userId: message.crafterId,
            });
          }}
          previewUserId={message.crafterId}
        >
          just used your crafting station and earned you{" "}
          {formatCurrency(BikkieIds.bling, message.royalty, "locale")} Bling
        </SimpleUserRow>
      );

    case "recipe_unlock":
      return (
        <RecipeNotificationRow
          envelope={envelope}
          recipe={anItem(message.recipe)}
        />
      );
    case "purchase":
      return (
        <PurchaseNotificationRow
          envelope={envelope}
          purchase={message}
          onSocialClick={onSocialClick}
        />
      );
    case "minigame_simple_race_finish":
      return (
        <MinigameSimpleRaceFinishNotificationRow
          envelope={envelope}
          message={message}
          onSocialClick={onSocialClick}
        />
      );

    case "invitedToTeam":
      return (
        <InvitedToTeamRow
          envelope={envelope}
          message={message}
          onSocialClick={onSocialClick}
        />
      );

    case "robotExpired":
      return <RobotExpiredRow message={message} />;

    case "robotVisitorMessage":
      return (
        <RobotVisitorMessageRow
          message={message}
          onSocialClick={onSocialClick}
        />
      );

    case "robotTransmission":
      return <RobotTransmissionRow message={message} />;

    case "beginTrade":
      return (
        <SimpleUserRow
          createdAt={envelope.createdAt}
          onNavigation={() => {
            onSocialClick({
              type: "trade",
              tradeId: message.tradeId,
            });
          }}
          previewUserId={message.entityId}
        >
          wants to trade with you
        </SimpleUserRow>
      );

    case "enter_my_robot":
      return (
        <SimpleUserRow
          createdAt={envelope.createdAt}
          onNavigation={() => {
            onSocialClick({
              type: "profile",
              userId: message.visitorId,
            });
          }}
          previewUserId={message.visitorId}
        >
          visited your land
        </SimpleUserRow>
      );

    case "discovery":
      return <ItemDiscoveryRow envelope={envelope} message={message} />;

    case "joined_my_team":
      return (
        <SimpleUserRow
          createdAt={envelope.createdAt}
          onNavigation={() => {
            onSocialClick({
              type: "self_inventory",
              showingTeamViewForId: message.teamId,
            });
          }}
          previewUserId={message.player}
        >
          joined your team
        </SimpleUserRow>
      );
    case "requestedToJoinTeam":
      return (
        <SimpleUserRow
          createdAt={envelope.createdAt}
          onNavigation={() => {
            onSocialClick({
              type: "self_inventory",
              showingTeamViewForId: message.teamId,
            });
          }}
          previewUserId={message.entityId}
        >
          {message.entityId === userId
            ? "join request sent"
            : "requested to join your team"}
        </SimpleUserRow>
      );
    case "requestToJoinTeamAccepted":
      return (
        <SimpleUserRow
          createdAt={envelope.createdAt}
          onNavigation={() => {
            onSocialClick({
              type: "self_inventory",
              showingTeamViewForId: message.teamId,
            });
          }}
          previewUserId={message.entityId}
        >
          {"request to join team was accepted"}
        </SimpleUserRow>
      );
    case "error":
      return <ErrorRow message={message} entityId={envelope.from} />;
    case "overflowedToInbox":
      return (
        <SimpleBagLedRow
          itemBag={stringToItemBag(message.bag)}
          envelope={envelope}
          onNavigation={() => {
            onSocialClick({
              type: "self_inventory",
            });
          }}
        >
          Your inventory is full, some items have been moved to your Inventory
          Overflow.
        </SimpleBagLedRow>
      );
    case "minigame_royalty":
      return (
        <MinigameRoyaltyRow
          message={message}
          envelope={envelope}
          onSocialClick={onSocialClick}
        />
      );
    case "mailSent":
      return (
        <SimpleUserRow
          createdAt={envelope.createdAt}
          previewUserId={message.targetId}
          prefixChildren={<>Sent a {message.isGift ? "gift" : "parcel"} to </>}
        ></SimpleUserRow>
      );
    case "mailReceived":
      return (
        <SimpleUserRow
          createdAt={envelope.createdAt}
          previewUserId={message.sender}
        >
          left you a package at your mailbox.
        </SimpleUserRow>
      );
    case "text":
    case "error":
    case "emote":
    case "catch":
    case "photo":
    case "warp":
    case "death":
    case "group_create":
    case "typing":
    case "new_session":
    case "minigame_join":
    case "metaquest_points":
    case "royalty":
    case "read":
    case "popped":
    case "robotInventoryChanged":
    case "challenge_unlock":
    case "challenge_complete":
      return <></>;
    default:
      passNever(message);
  }
  return <></>;
};
