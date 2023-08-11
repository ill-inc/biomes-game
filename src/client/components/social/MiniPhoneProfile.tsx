import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  useLatestAvailableComponents,
  useLatestAvailableEntity,
} from "@/client/components/hooks/client_hooks";
import type { UserListType } from "@/client/components/inventory/SelfInventoryScreen";
import { beginTrade } from "@/client/components/inventory/helpers";
import type { InventoryLeftSlideoverStackPayload } from "@/client/components/overflow/types";
import { AvatarWearables } from "@/client/components/social/AvatarWearables";
import { MiniPhoneFollowList } from "@/client/components/social/MiniPhoneFollowList";
import { PostsGrid } from "@/client/components/social/PostsGrid";
import { ReportFlow } from "@/client/components/social/ReportFlow";
import { TeamBadge } from "@/client/components/social/TeamLabel";
import { TeamSection } from "@/client/components/social/TeamSection";
import type { SocialMiniPhonePayload } from "@/client/components/social/types";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { MaybeGridSpinner } from "@/client/components/system/MaybeGridSpinner";
import { MaybeLoadMoreRow } from "@/client/components/system/MaybeLoadMoreRow";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { MiniPhoneMoreItem } from "@/client/components/system/mini_phone/MiniPhoneMoreItem";
import { MiniPhoneScreenMoreMenu } from "@/client/components/system/mini_phone/MiniPhoneScreen";
import { MiniPhoneSubModal } from "@/client/components/system/mini_phone/MiniPhoneSubModal";
import { LeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneActionSheet } from "@/client/components/system/mini_phone/split_pane/PaneActionSheet";
import {
  PaneSlideoverStack,
  useNewPaneSlideoverStack,
} from "@/client/components/system/mini_phone/split_pane/PaneSlideoverStack";
import { RightBarItem } from "@/client/components/system/mini_phone/split_pane/RightBarItem";
import { RightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { CreateTeamSlideover } from "@/client/components/teams/CreateTeamSlideover";
import { ViewTeamSlideover } from "@/client/components/teams/ViewTeamSlideover";
import { useShowingTemporaryURL } from "@/client/util/hooks";
import {
  useCachedUserInfo,
  usePhotoPageLoader,
} from "@/client/util/social_manager_hooks";
import {
  absoluteWebServerURL,
  userPublicPermalink,
} from "@/server/web/util/urls";
import type { BiomesId } from "@/shared/ids";
import { displayUsername } from "@/shared/util/helpers";
import { imageUrlForSize } from "@/shared/util/urls";
import { startCase } from "lodash";
import React, { useCallback, useState } from "react";

export const MiniPhoneProfile: React.FunctionComponent<{
  userId: BiomesId;
}> = ({ userId }) => {
  const context = useClientContext();
  const [error, setError] = useError();

  const [showMore, setShowMore] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [copyLinkText, setCopyLinkText] = useState("Copy Link to Profile");

  const userInfo = useCachedUserInfo(context.socialManager, userId);
  const isSelfProfile = userId === context.userId;

  const [userListType, setUserListType] = useState<UserListType>(undefined);

  const { posts, isLoading, setIsLoading, canLoadMore, maybeLoadMore } =
    usePhotoPageLoader(
      context.socialManager,
      context.clientCache,
      userId,
      setError
    );

  const slideoverStack =
    useNewPaneSlideoverStack<InventoryLeftSlideoverStackPayload>([]);

  useShowingTemporaryURL(
    userInfo?.user?.username &&
      userPublicPermalink(userId, userInfo?.user?.username),
    [userInfo?.user.username]
  );

  const doFollow = useCallback(async (affirmative: boolean) => {
    setIsLoading(true);

    try {
      await context.socialManager.followUser(userId, affirmative);
    } catch (error: any) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderSlideoverPayload = useCallback(
    (payload: InventoryLeftSlideoverStackPayload) => {
      switch (payload.type) {
        case "create_team":
          return (
            <CreateTeamSlideover
              onCreate={(teamId) => {
                slideoverStack.popNavigationStack();
                slideoverStack.pushNavigationStack({
                  type: "view_team",
                  team_id: teamId,
                });
              }}
            />
          );
        case "view_team":
          return <ViewTeamSlideover teamId={payload.team_id} />;
      }
    },
    []
  );

  const [playerTeam] = useLatestAvailableComponents(
    userId,
    "player_current_team"
  );

  const teamEntity = useLatestAvailableEntity(playerTeam?.team_id);
  const team = teamEntity?.team;

  const { pushNavigationStack } =
    useExistingMiniPhoneContext<SocialMiniPhonePayload>();

  return (
    <SplitPaneScreen>
      <ScreenTitleBar title={" "} divider={false}>
        <RightBarItem>
          <MiniPhoneMoreItem onClick={() => setShowMore(!showMore)} />
        </RightBarItem>
      </ScreenTitleBar>
      <LeftPane extraClassName="inventory-left-pane">
        <div className="padded-view padded-view-inventory">
          {userInfo && (
            <PaneSlideoverStack
              renderPayload={renderSlideoverPayload}
              existingContext={slideoverStack}
            >
              <div className="user-hero">
                <div className="relative">
                  <ShadowedImage
                    extraClassNames="avatar-wrapper"
                    src={imageUrlForSize(
                      "thumbnail",
                      userInfo.user.profilePicImageUrls
                    )}
                  />
                  {teamEntity && team && (
                    <div
                      className="absolute bottom-0.6 right-0.6 cursor-pointer"
                      onClick={() => {
                        slideoverStack.pushNavigationStack({
                          type: "view_team",
                          team_id: teamEntity.id,
                        });
                      }}
                    >
                      <TeamBadge team={team} />
                    </div>
                  )}
                </div>
                <div className="username-and-metrics">
                  <div className="flex flex-col items-center">
                    <div className="username select-text">
                      {displayUsername(userInfo.user.username ?? "Profile")}
                    </div>

                    <TeamSection userId={userId} />
                  </div>

                  <div className="metrics">
                    <a
                      href=""
                      onClick={(e) => {
                        e.preventDefault();
                        setUserListType("followers");
                      }}
                    >
                      {userInfo?.user.numFollowers ?? <span>0</span>} Followers
                    </a>

                    <a
                      href=""
                      onClick={(e) => {
                        e.preventDefault();
                        setUserListType("following");
                      }}
                    >
                      {userInfo?.user.numFollowing ?? <span>0</span>} Following
                    </a>
                  </div>
                </div>
              </div>
            </PaneSlideoverStack>
          )}

          {!isSelfProfile && userInfo && (
            <div className="flex w-full gap-0.6">
              <DialogButton
                disabled={isLoading}
                type={!userInfo.isFollowing ? "primary" : undefined}
                onClick={() => doFollow(!userInfo.isFollowing)}
              >
                {userInfo.isFollowing ? "Unfollow" : "Follow"}
              </DialogButton>
              <DialogButton
                onClick={() => {
                  pushNavigationStack({
                    type: "inbox",
                    userId: userId,
                  });
                }}
              >
                Message
              </DialogButton>
              <DialogButton
                onClick={async () => {
                  const tradeId = await beginTrade(context, userId);
                  pushNavigationStack({
                    type: "trade",
                    tradeId: tradeId,
                  });
                }}
              >
                Trade
              </DialogButton>
            </div>
          )}
        </div>

        {userInfo && (
          <>
            <PaneActionSheet
              title={startCase(userListType)}
              onClose={() => {
                setUserListType(undefined);
              }}
              showing={userListType == "following"}
            >
              <MiniPhoneFollowList
                direction="outbound"
                userId={userInfo.user.id}
              />
            </PaneActionSheet>

            <PaneActionSheet
              title={startCase(userListType)}
              onClose={() => {
                setUserListType(undefined);
              }}
              showing={userListType == "followers"}
            >
              <MiniPhoneFollowList
                direction="inbound"
                userId={userInfo.user.id}
              />
            </PaneActionSheet>
          </>
        )}
      </LeftPane>
      <RightPane
        extraClassName="profile-right inventory-right-pane"
        onBottom={() => {
          void maybeLoadMore();
        }}
      >
        <AvatarWearables entityId={userId} />

        <MaybeError error={error} />

        <PostsGrid posts={posts} />
        <MaybeGridSpinner isLoading={isLoading} />
        <MaybeLoadMoreRow
          loading={isLoading}
          canLoadMore={canLoadMore}
          onLoadMore={() => {
            void maybeLoadMore();
          }}
        />
      </RightPane>
      <MiniPhoneScreenMoreMenu
        items={[
          {
            label: copyLinkText,
            onClick: () => {
              if (userInfo) {
                const url = absoluteWebServerURL(
                  userPublicPermalink(userInfo.user.id, userInfo.user.username)
                );
                void navigator.clipboard.writeText(url);
                setCopyLinkText("Copied");
                setTimeout(() => {
                  setCopyLinkText("Copy Link to Profile");
                  setShowMore(false);
                }, 500);
              }
            },
          },
          {
            label: "Report",
            type: "destructive",
            onClick: () => {
              setShowReportMenu(true);
              setShowMore(false);
            },
          },
        ]}
        showing={showMore}
      />
      {showReportMenu && (
        <MiniPhoneSubModal
          onDismissal={() => {
            setShowReportMenu(false);
          }}
        >
          <ReportFlow
            target={{
              kind: "profile",
              targetId: userId,
            }}
            onClose={() => {
              setShowReportMenu(false);
            }}
          />
        </MiniPhoneSubModal>
      )}
    </SplitPaneScreen>
  );
};
