import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useInventoryAltClickContext } from "@/client/components/inventory/InventoryAltClickContext";
import { useInventoryControllerContext } from "@/client/components/inventory/InventoryControllerContext";
import { useInventoryOverrideContext } from "@/client/components/inventory/InventoryOverrideContext";
import type { DisableSlotPredicate } from "@/client/components/inventory/types";
import { AvatarWearables } from "@/client/components/social/AvatarWearables";
import { MiniPhoneFollowList } from "@/client/components/social/MiniPhoneFollowList";
import { PostsGrid } from "@/client/components/social/PostsGrid";
import { DialogButton } from "@/client/components/system/DialogButton";
import { useError } from "@/client/components/system/MaybeError";
import { MaybeGridSpinner } from "@/client/components/system/MaybeGridSpinner";
import { MaybeLoadMoreRow } from "@/client/components/system/MaybeLoadMoreRow";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { MiniPhoneMoreItem } from "@/client/components/system/mini_phone/MiniPhoneMoreItem";
import { BarTitle } from "@/client/components/system/mini_phone/split_pane/BarTitle";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneActionSheet } from "@/client/components/system/mini_phone/split_pane/PaneActionSheet";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import {
  PaneSlideoverStack,
  useExistingPaneSlideoverStackContext,
  useNewPaneSlideoverStack,
} from "@/client/components/system/mini_phone/split_pane/PaneSlideoverStack";
import { RightBarItem } from "@/client/components/system/mini_phone/split_pane/RightBarItem";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";

import {
  useLatestAvailableComponents,
  useLatestAvailableEntity,
} from "@/client/components/hooks/client_hooks";
import { InventoryAndHotbarDisplay } from "@/client/components/inventory/InventoryAndHotbarDisplay";
import { InventoryOverflowButton } from "@/client/components/inventory/InventoryOverflowButton";
import { InviteSheet } from "@/client/components/inventory/InviteSheet";
import { InventoryOverflowSlideover } from "@/client/components/InventoryOverflowSlideover";
import type { InventoryLeftSlideoverStackPayload } from "@/client/components/overflow/types";
import { TeamBadge } from "@/client/components/social/TeamLabel";
import { TeamSection } from "@/client/components/social/TeamSection";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import type { MoreMenuItem } from "@/client/components/system/MoreMenu";
import { MoreMenu } from "@/client/components/system/MoreMenu";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import type { GenericMiniPhonePayload } from "@/client/components/system/types";
import { CreateTeamSlideover } from "@/client/components/teams/CreateTeamSlideover";
import { ViewTeamSlideover } from "@/client/components/teams/ViewTeamSlideover";
import type { ThreeObjectPreview } from "@/client/components/ThreeObjectPreview";
import { AuthManager } from "@/client/game/context_managers/auth_manager";
import type { LoadedPlayerMesh } from "@/client/game/resources/player_mesh";
import type { PhotoPageLoader } from "@/client/util/social_manager_hooks";
import {
  useCachedUserInfo,
  usePhotoPageLoader,
} from "@/client/util/social_manager_hooks";
import type { ResetInventoryRequest } from "@/pages/api/admin/reset_inventory";
import type { SelfProfileResponse } from "@/pages/api/social/self_profile";
import type { UpdateProfilePictureRequest } from "@/pages/api/upload/profile_picture";
import {
  absoluteWebServerURL,
  userPublicPermalink,
} from "@/server/web/util/urls";
import { InventorySortEvent } from "@/shared/ecs/gen/events";
import { isBagEmpty } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { jsonFetch, jsonPost } from "@/shared/util/fetch_helpers";
import { assertNever } from "@/shared/util/type_helpers";
import { imageUrlForSize } from "@/shared/util/urls";
import { startCase } from "lodash";
import type { PropsWithChildren } from "react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
export type UserListType = "following" | "followers" | undefined;

export const SelfPhotosSection: React.FunctionComponent<{
  photoPageLoader: PhotoPageLoader;
}> = ({ photoPageLoader }) => {
  const { posts, loadPage, isLoading, canLoadMore, pagingToken } =
    photoPageLoader;
  return (
    <section>
      <PostsGrid posts={posts} />
      <MaybeGridSpinner isLoading={isLoading} />
      <MaybeLoadMoreRow
        loading={isLoading}
        canLoadMore={canLoadMore}
        onLoadMore={() => {
          if (!isLoading && canLoadMore) {
            void loadPage(pagingToken);
          }
        }}
      />
    </section>
  );
};

export const VanityMetricsSection: React.FunctionComponent<{
  onShowUserList(type: UserListType): any;
}> = ({ onShowUserList }) => {
  const { socialManager, userId } = useClientContext();
  const userBundle = useCachedUserInfo(socialManager, userId);

  const numFollowers = userBundle?.user.numFollowers.toString();
  const numFollowing = userBundle?.user.numFollowing.toString();
  return (
    <div className="metrics">
      <a
        href=""
        onClick={(e) => {
          onShowUserList("followers");
          e.preventDefault();
        }}
      >
        {numFollowers ? <span>{numFollowers}</span> : <span>0</span>} Followers
      </a>

      <a
        href=""
        onClick={(e) => {
          onShowUserList("following");
          e.preventDefault();
        }}
      >
        {numFollowing ? <span>{numFollowing}</span> : <span>0</span>} Following
      </a>
    </div>
  );
};

export const OverflowSection: React.FunctionComponent<{}> = ({}) => {
  const slideoverStack =
    useExistingPaneSlideoverStackContext<InventoryLeftSlideoverStackPayload>();
  const { reactResources, userId } = useClientContext();

  const inventory = reactResources.use("/ecs/c/inventory", userId);

  const showOverflow = inventory && !isBagEmpty(inventory.overflow);

  return (
    <>
      <div className="overflow">
        {showOverflow && (
          <InventoryOverflowButton
            numItems={inventory.overflow.size}
            onClick={() => {
              slideoverStack.pushNavigationStack({
                type: "inventory_overflow",
              });
            }}
          />
        )}
      </div>
    </>
  );
};

export const SelfInventoryLeftPaneContent: React.FunctionComponent<{
  showingTeamViewForId?: BiomesId;
}> = ({ showingTeamViewForId }) => {
  const { socialManager, clientCache, userId } = useClientContext();

  const userBundle = useCachedUserInfo(socialManager, userId);
  const miniPhone = useExistingMiniPhoneContext<GenericMiniPhonePayload>();

  const photoPageLoader = usePhotoPageLoader(
    socialManager,
    clientCache,
    userId
  );

  const [userListType, setUserListType] = useState<UserListType>(undefined);

  const slideoverStack =
    useNewPaneSlideoverStack<InventoryLeftSlideoverStackPayload>(() => {
      if (showingTeamViewForId) {
        return [
          {
            type: "view_team",
            team_id: showingTeamViewForId,
          },
        ];
      }
      return [];
    });

  const renderSlideoverPayload = useCallback(
    (payload: InventoryLeftSlideoverStackPayload) => {
      switch (payload.type) {
        case "inventory_overflow":
          return <InventoryOverflowSlideover />;
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
        default:
          assertNever(payload);
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

  return (
    <PaneLayout
      extraClassName="inventory-left-pane hide-scrollbar"
      type="scroll"
      onBottom={() => {
        void photoPageLoader.maybeLoadMore();
      }}
    >
      <div className="padded-view padded-view-inventory ">
        <PaneSlideoverStack
          renderPayload={renderSlideoverPayload}
          existingContext={slideoverStack}
        >
          {userBundle && (
            <div className="user-hero">
              <div className="relative">
                <Tooltipped tooltip="Edit Character">
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      miniPhone.pushNavigationStack({
                        type: "edit_character",
                      });
                    }}
                  >
                    <ShadowedImage
                      extraClassNames="avatar-wrapper"
                      src={imageUrlForSize(
                        "thumbnail",
                        userBundle.user.profilePicImageUrls
                      )}
                    />
                  </div>
                </Tooltipped>
                {teamEntity && team && team.icon && (
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
                    {userBundle?.user.username}
                  </div>
                  <TeamSection userId={userId} />
                </div>
                <VanityMetricsSection
                  onShowUserList={(type) => {
                    setUserListType(type);
                  }}
                />
              </div>
            </div>
          )}

          <OverflowSection />
        </PaneSlideoverStack>
        <SelfPhotosSection photoPageLoader={photoPageLoader} />

        {userBundle && (
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
                userId={userBundle?.user.id}
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
                userId={userBundle?.user.id}
              />
            </PaneActionSheet>
          </>
        )}
      </div>
    </PaneLayout>
  );
};

export function captureProfilePicScreenshot(renderer: ThreeObjectPreview) {
  return renderer.renderScreenshot(320, 320, "image/webp", {
    cameraAdjustTarget: new Vector3(0, 1.4, 0),
    cameraSetPosition: new Vector3().set(6, 4.33, -13.33),
    cameraSetFOV: 5,
  });
}

export const SelfInventoryRightPane: React.FunctionComponent<
  PropsWithChildren<{
    disableSlotPredicate?: DisableSlotPredicate;
  }>
> = ({ children, disableSlotPredicate }) => {
  const { socialManager, userId } = useClientContext();
  const { handleInventorySlotClick, handleAvatarClick } =
    useInventoryControllerContext();
  const [_error, setError] = useError(true);
  const currentProfilePicHash = useRef<string | null | undefined>();
  const profilePicPrep = useRef<[string, string] | undefined>();
  const { setAltClickUIForSlotRef: setShowSplitUIForSlotRef } =
    useInventoryAltClickContext();

  const inventoryOverrideContext = useInventoryOverrideContext();

  useEffect(() => {
    inventoryOverrideContext.clearOverrides();
    return () => {
      inventoryOverrideContext.clearOverrides();
      setShowSplitUIForSlotRef(undefined);
    };
  }, []);
  // Update the profile picture if the hash differs from server.
  // There is a race between self_profile returning and getting
  // a screenshot for an updated mesh (hence the refs)
  useEffect(() => {
    void (async () => {
      try {
        const profile = await jsonFetch<SelfProfileResponse>(
          `/api/social/self_profile`
        );
        currentProfilePicHash.current = profile.profilePicHash ?? null;
        if (profilePicPrep.current) {
          const [screenshot, hash] = profilePicPrep.current;
          if (hash !== currentProfilePicHash.current) {
            void updateProfilePicture(screenshot, hash);
          }
        }
      } catch (error: any) {
        setError(error);
      }
    })();
  }, []);
  const updateProfilePicture = useCallback(
    async (screenshot: string, hash: string) => {
      currentProfilePicHash.current = hash;
      try {
        await jsonPost<void, UpdateProfilePictureRequest>(
          "/api/upload/profile_picture",
          {
            photoDataURI: screenshot,
            hash,
          }
        );
        void socialManager.userInfoBundle(userId, true);
      } catch (error: any) {
        setError(error);
      }
    },
    []
  );

  const maybeUploadProfilePic = useCallback(
    async (mesh: LoadedPlayerMesh, renderer: ThreeObjectPreview) => {
      // Timeout because otherwise we are in a T pose
      setTimeout(() => {
        if (
          currentProfilePicHash.current !== undefined &&
          currentProfilePicHash.current !== mesh.hash
        ) {
          const screenshot = captureProfilePicScreenshot(renderer);
          if (!screenshot) {
            return;
          }
          void updateProfilePicture(screenshot, mesh.hash);
        } else if (currentProfilePicHash.current === undefined) {
          const screenshot = captureProfilePicScreenshot(renderer);
          if (screenshot) {
            profilePicPrep.current = [screenshot, mesh.hash];
          }
        }
      }, 100);
    },
    []
  );
  return (
    <PaneLayout type="center_both" extraClassName="inventory-right-pane">
      <div className="bg-image" />
      <AvatarWearables
        entityId={userId}
        onSlotClick={handleInventorySlotClick}
        onMeshChange={maybeUploadProfilePic}
        onAvatarClick={handleAvatarClick}
        disableSlotPredicate={disableSlotPredicate}
      />
      <InventoryAndHotbarDisplay disableSlotPredicate={disableSlotPredicate} />
      {children}
    </PaneLayout>
  );
};

export const SelfInventoryScreen: React.FunctionComponent<
  PropsWithChildren<{
    showingTeamViewForId?: BiomesId;
  }>
> = ({ showingTeamViewForId, children }) => {
  const { reactResources, events, userId, authManager } = useClientContext();
  const isAdmin = authManager.currentUser.hasSpecialRole("admin");
  const localPlayerRead = reactResources.get("/scene/local_player");
  const [showMore, setShowMore] = useState(false);

  const [copyLinkText, setCopyLinkText] = useState("Copy Link to Profile");
  const [logoutLabel, setLogoutLabel] = useState("Log Out");
  const [clearInventoryText, setClearInventoryText] = useState(
    "Clear Inventory (Admin)"
  );

  const resetInventory = useCallback(async () => {
    try {
      setClearInventoryText("Clearing...");
      await jsonPost<void, ResetInventoryRequest>(
        "/api/admin/reset_inventory",
        {
          userId: userId,
        }
      );
    } catch (error: any) {
    } finally {
      setClearInventoryText("Clear Inventory (Admin)");
      setShowMore(false);
    }
  }, []);

  const moreItems: MoreMenuItem[] = [];

  if (isAdmin) {
    moreItems.push({
      label: clearInventoryText,
      onClick: () => {
        void resetInventory();
      },
    });
  }

  moreItems.push(
    {
      label: "Sort Inventory",
      onClick: () => {
        fireAndForget(events.publish(new InventorySortEvent({ id: userId })));
        setShowMore(false);
      },
    },
    {
      label: copyLinkText,
      onClick: () => {
        const url = absoluteWebServerURL(
          userPublicPermalink(
            localPlayerRead.player.id,
            localPlayerRead.player.username
          )
        );
        void navigator.clipboard.writeText(url);
        setCopyLinkText("Copied");
        setTimeout(() => {
          setCopyLinkText("Copy Link to Profile");
          setShowMore(false);
        }, 500);
      },
    },

    {
      label: logoutLabel,
      type: "destructive",
      showSpinner: logoutLabel !== "Log Out",
      onClick: () => {
        AuthManager.logout();
        setLogoutLabel("Logging out...");
      },
    }
  );

  const [showInvites, setShowInvites] = useState(false);

  return (
    <SplitPaneScreen
      extraClassName="profile"
      onClick={() => {
        setShowMore(false);
      }}
    >
      <ScreenTitleBar divider={false}>
        <BarTitle></BarTitle>
        <RightBarItem>
          <DialogButton
            size="small"
            extraClassNames="btn-inline"
            onClick={() => {
              setShowInvites(true);
            }}
          >
            Invite Friends
          </DialogButton>

          <MiniPhoneMoreItem
            onClick={() => {
              setShowMore(!showMore);
            }}
          />
        </RightBarItem>
        <MoreMenu
          items={moreItems}
          showing={showMore}
          setShowing={setShowMore}
        />
      </ScreenTitleBar>
      <RawLeftPane>
        <SelfInventoryLeftPaneContent
          showingTeamViewForId={showingTeamViewForId}
        />

        <InviteSheet
          showing={showInvites}
          setShowing={() => setShowInvites(false)}
        />
      </RawLeftPane>
      <RawRightPane>
        <SelfInventoryRightPane>{children}</SelfInventoryRightPane>
      </RawRightPane>
    </SplitPaneScreen>
  );
};
