import { LinkablePhotoPreview } from "@/client/components/chat/Links";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  useLatestAvailableComponents,
  useLatestAvailableEntity,
} from "@/client/components/hooks/client_hooks";
import { SearchPlayerSlideover } from "@/client/components/inventory/SearchPlayerSlideover";
import { MiniPhoneUserAvatarLink } from "@/client/components/social/MiniPhoneUserLink";
import { TeamBadge } from "@/client/components/social/TeamLabel";
import { DialogButton } from "@/client/components/system/DialogButton";
import type { MoreMenuItem } from "@/client/components/system/MoreMenu";
import { MoreMenu } from "@/client/components/system/MoreMenu";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { MiniPhoneMoreItem } from "@/client/components/system/mini_phone/MiniPhoneMoreItem";
import { BarTitle } from "@/client/components/system/mini_phone/split_pane/BarTitle";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import {
  PaneSlideover,
  PaneSlideoverTitleBar,
} from "@/client/components/system/mini_phone/split_pane/PaneSlideover";
import { useExistingPaneSlideoverStackContext } from "@/client/components/system/mini_phone/split_pane/PaneSlideoverStack";
import { RightBarItem } from "@/client/components/system/mini_phone/split_pane/RightBarItem";
import type { GenericMiniPhonePayload } from "@/client/components/system/types";
import { EditTeamSheet } from "@/client/components/teams/EditTeamActionSheet";
import {
  useCachedPostBundle,
  useCachedUserInfo,
} from "@/client/util/social_manager_hooks";
import {
  CancelRequestToJoinTeamEvent,
  CancelTeamInviteEvent,
  DeclineTeamInviteEvent,
  InvitePlayerToTeamEvent,
  JoinTeamEvent,
  QuitTeamEvent,
  RequestToJoinTeamEvent,
  RespondToJoinTeamRequestEvent,
  UpdateTeamMetadataEvent,
} from "@/shared/ecs/gen/events";
import type { TeamMemberMetadata } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import type { FeedPostBundle } from "@/shared/types";
import { fireAndForget } from "@/shared/util/async";
import { mapMap } from "@/shared/util/collections";
import { displayUsername } from "@/shared/util/helpers";
import { ok } from "assert";
import pluralize from "pluralize";
import React, { useState } from "react";
import avatarAdd from "/public/hud/avatar-add.png";

const TeamMemberRow: React.FunctionComponent<{
  userId: BiomesId;
  teamId: BiomesId;
  metadata: TeamMemberMetadata;
}> = ({ userId }) => {
  const { socialManager } = useClientContext();
  const user = useCachedUserInfo(socialManager, userId);

  if (!user) {
    return <li></li>;
  }

  return (
    <li className="flex items-center gap-1 font-semibold">
      <MiniPhoneUserAvatarLink user={user.user} />
      <div>{displayUsername(user.user.username)}</div>
    </li>
  );
};

const PendingRequestRow: React.FunctionComponent<{
  userId: BiomesId;
  teamId: BiomesId;
}> = ({ userId, teamId }) => {
  const { socialManager, events, userId: loggedInUserId } = useClientContext();
  const user = useCachedUserInfo(socialManager, userId);

  if (!user) {
    return <li></li>;
  }

  return (
    <li className="flex items-center gap-1 font-semibold">
      <MiniPhoneUserAvatarLink user={user.user} />
      <div className="username flex-grow">
        {displayUsername(user.user.username)}
      </div>
      <DialogButton
        size="xsmall"
        extraClassNames="inline"
        onClick={() => {
          fireAndForget(
            events.publish(
              new RespondToJoinTeamRequestEvent({
                id: loggedInUserId,
                entity_id: userId,
                team_id: teamId,
                response: "accept",
              })
            )
          );
        }}
      >
        Accept
      </DialogButton>
      <DialogButton
        size="xsmall"
        onClick={() => {
          fireAndForget(
            events.publish(
              new RespondToJoinTeamRequestEvent({
                id: loggedInUserId,
                entity_id: userId,
                team_id: teamId,
                response: "decline",
              })
            )
          );
        }}
      >
        Decline
      </DialogButton>
    </li>
  );
};

const TeamPendingRow: React.FunctionComponent<{
  userId: BiomesId;
  teamId: BiomesId;
}> = ({ userId, teamId }) => {
  const { socialManager, events, userId: loggedInUserId } = useClientContext();
  const user = useCachedUserInfo(socialManager, userId);

  if (!user) {
    return <li></li>;
  }

  return (
    <li className="flex items-center gap-1 font-semibold">
      <MiniPhoneUserAvatarLink user={user.user} />
      <div className="username flex-grow">
        {displayUsername(user.user.username)}
      </div>
      <DialogButton
        size="xsmall"
        extraClassNames="btn-inline"
        onClick={() => {
          fireAndForget(
            events.publish(
              new CancelTeamInviteEvent({
                id: loggedInUserId,
                team_id: teamId,
                invitee_id: userId,
              })
            )
          );
        }}
      >
        Cancel
      </DialogButton>
    </li>
  );
};

export const PhotoPickerField: React.FunctionComponent<{
  heroPhoto?: FeedPostBundle | null;
  allowEdit?: boolean;
  title?: string;
  editPhoto?: () => unknown;
}> = ({ editPhoto, allowEdit, title, heroPhoto }) => {
  return (
    <>
      {heroPhoto ? (
        <ShadowedImage extraClassNames="rounded-md">
          {allowEdit && (
            <DialogButton
              onClick={editPhoto}
              extraClassNames="absolute bottom-1 right-1 btn-inline"
            >
              Edit
            </DialogButton>
          )}
          <LinkablePhotoPreview
            extraClassName="cursor-pointer w-full"
            post={heroPhoto}
          />
        </ShadowedImage>
      ) : allowEdit ? (
        <DialogButton onClick={editPhoto}>{title ?? "Set Photo"}</DialogButton>
      ) : (
        <></>
      )}
    </>
  );
};

export const ViewTeamSlideover: React.FunctionComponent<{
  teamId: BiomesId;
  onClose?: () => unknown;
}> = ({ onClose, teamId }) => {
  const { events, userId, socialManager } = useClientContext();

  const [showMore, setShowMore] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const { pushNavigationStack, popNavigationStack } =
    useExistingMiniPhoneContext<GenericMiniPhonePayload>();

  const slideoverStack = useExistingPaneSlideoverStackContext();

  const teamEntity = useLatestAvailableEntity(teamId);
  const teamName = teamEntity?.label?.text ?? "";
  const team = teamEntity?.team;
  const userIsMember = team?.members.has(userId);
  const heroPhoto = useCachedPostBundle(socialManager, team?.hero_photo_id);
  const [userTeam] = useLatestAvailableComponents(
    userId,
    "player_current_team"
  );
  const userHasTeam = userTeam?.team_id !== undefined;
  const userRequestedToJoin =
    team?.pending_requests.find((r) => r.entity_id === userId) !== undefined;

  const moreItems: MoreMenuItem[] = [];

  if (userIsMember) {
    moreItems.push({
      label: team?.members.size === 1 ? "Delete Team" : "Leave Team",
      type: "destructive",
      onClick: () => {
        fireAndForget(
          events.publish(new QuitTeamEvent({ id: userId, team_id: teamId }))
        );
        slideoverStack.popNavigationStack();
      },
    });
  }

  const editPhoto = () => {
    pushNavigationStack({
      type: "select_photo",
      restrictToSources: ["photos"],
      onSelected: (data) => {
        ok(data.kind === "photo");
        fireAndForget(
          events.publish(
            new UpdateTeamMetadataEvent({
              id: userId,
              team_id: teamId,
              hero_photo_id: data.id,
            })
          )
        );
        popNavigationStack();
      },
    });
  };

  const [showEditor, setShowEditor] = useState(false);

  return (
    <PaneLayout>
      <PaneSlideoverTitleBar divider={false} onClose={onClose}>
        <BarTitle></BarTitle>
        <RightBarItem>
          {userIsMember && (
            <>
              <MiniPhoneMoreItem
                onClick={() => {
                  setShowMore(!showMore);
                }}
              />
              <MoreMenu
                items={moreItems}
                showing={showMore}
                setShowing={setShowMore}
              />
            </>
          )}
        </RightBarItem>
      </PaneSlideoverTitleBar>

      <PaneSlideover showing={showInvite}>
        <SearchPlayerSlideover
          title="Invite Member"
          filters={[
            {
              type: "team",
              notOnOneOf: [teamId],
            },
          ]}
          onSelect={(newUserId) => {
            fireAndForget(
              events.publish(
                new InvitePlayerToTeamEvent({
                  id: userId,
                  team_id: teamId,
                  player_id: newUserId,
                })
              )
            );
            setShowInvite(false);
          }}
          onClose={() => {
            setShowInvite(false);
          }}
        />
      </PaneSlideover>
      <EditTeamSheet
        showing={showEditor}
        onClose={() => setShowEditor(false)}
        teamId={teamId}
      />

      {team && (
        <div className="padded-view form">
          <Tooltipped tooltip={userIsMember ? "Edit Badge and Color" : ""}>
            <div
              className={`flex flex-col items-center gap-1 ${
                userIsMember && "cursor-pointer"
              }`}
              onClick={() => {
                if (!userIsMember) return;
                setShowEditor(true);
              }}
            >
              <TeamBadge team={team} size="large" />
              <div className="text-l font-semibold">{teamName}</div>
            </div>
          </Tooltipped>

          {heroPhoto ? (
            <ShadowedImage extraClassNames="rounded-md">
              {userIsMember && (
                <DialogButton
                  onClick={editPhoto}
                  extraClassNames="absolute bottom-1 right-1 btn-inline"
                >
                  Edit
                </DialogButton>
              )}
              <LinkablePhotoPreview
                extraClassName="cursor-pointer w-full"
                post={heroPhoto}
              />
            </ShadowedImage>
          ) : userIsMember ? (
            <PhotoPickerField
              allowEdit={userIsMember}
              editPhoto={editPhoto}
              heroPhoto={heroPhoto}
              title="Set Team Photo"
            />
          ) : (
            <></>
          )}
          {team.pending_requests.length > 0 && userIsMember && (
            <section>
              <label>
                {team.pending_requests.length}{" "}
                {pluralize("Pending Request", team.pending_requests.length)}
              </label>
              <ul className="flex flex-col gap-0.8">
                {team.pending_requests.map((request) => (
                  <PendingRequestRow
                    key={request.entity_id}
                    userId={request.entity_id}
                    teamId={teamId}
                  />
                ))}
              </ul>
            </section>
          )}

          <section>
            <label>
              {team.members.size} {pluralize("Member", team.members.size)}
            </label>
            <ul className="flex flex-col gap-0.8">
              {mapMap(team.members, (metadata, userId) => (
                <TeamMemberRow
                  userId={userId}
                  metadata={metadata}
                  teamId={teamId}
                />
              ))}
              {userIsMember && (
                <li
                  onClick={() => {
                    setShowInvite(true);
                  }}
                  className="flex cursor-pointer items-center gap-1 font-semibold"
                >
                  <ShadowedImage src={avatarAdd.src} extraClassNames="avatar" />
                  Invite Member
                </li>
              )}
            </ul>
          </section>

          {userIsMember && team.pending_invites.size > 0 && (
            <section>
              <label>Pending</label>
              <ul>
                {mapMap(team.pending_invites, (metadata, userId) => (
                  <TeamPendingRow userId={userId} teamId={teamId} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {team && team.pending_invites.has(userId) && (
        <PaneBottomDock>
          <div className="dialog-button-group">
            <div className="p-1 text-center">
              You&rsquo;ve been invited to join this team.
            </div>
            <DialogButton
              onClick={() => {
                fireAndForget(
                  events.publish(
                    new JoinTeamEvent({ id: userId, team_id: teamId })
                  )
                );
              }}
              type="primary"
            >
              Accept Invite
            </DialogButton>
            <DialogButton
              onClick={() => {
                fireAndForget(
                  events.publish(
                    new DeclineTeamInviteEvent({ id: userId, team_id: teamId })
                  )
                );
              }}
            >
              Decline Invite
            </DialogButton>
          </div>
        </PaneBottomDock>
      )}
      {userRequestedToJoin && (
        <PaneBottomDock>
          <DialogButton
            onClick={() => {
              fireAndForget(
                events.publish(
                  new CancelRequestToJoinTeamEvent({
                    id: userId,
                    entity_id: userId,
                    team_id: teamId,
                  })
                )
              );
            }}
          >
            Cancel Join Request
          </DialogButton>
        </PaneBottomDock>
      )}
      {team &&
        !userIsMember &&
        !userHasTeam &&
        !userRequestedToJoin &&
        !team.pending_invites.has(userId) && (
          <PaneBottomDock>
            <DialogButton
              onClick={() => {
                fireAndForget(
                  events.publish(
                    new RequestToJoinTeamEvent({
                      id: userId,
                      entity_id: userId,
                      team_id: teamId,
                    })
                  )
                );
              }}
              type="primary"
            >
              Request to Join
            </DialogButton>
          </PaneBottomDock>
        )}
    </PaneLayout>
  );
};
