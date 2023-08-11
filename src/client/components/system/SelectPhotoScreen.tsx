import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { MinigameBrowserComponent } from "@/client/components/inventory/CollectionsScreen";
import { iconUrl } from "@/client/components/inventory/icons";
import { PostsGrid } from "@/client/components/social/PostsGrid";
import { LazyFragment } from "@/client/components/system/LazyFragment";
import {
  LeftPaneDrilldown,
  LeftPaneDrilldownItem,
} from "@/client/components/system/LeftPaneDrilldown";
import { MaybeGridSpinner } from "@/client/components/system/MaybeGridSpinner";
import { MaybeLoadMoreRow } from "@/client/components/system/MaybeLoadMoreRow";
import { BarTitle } from "@/client/components/system/mini_phone/split_pane/BarTitle";
import { LeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { RightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { usePhotoPageLoader } from "@/client/util/social_manager_hooks";
import { BikkieIds } from "@/shared/bikkie/ids";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import React, { useCallback, useState } from "react";

export type DrilldownState =
  | {
      type: "photos";
    }
  | { type: "minigames" };

export type SelectPhotoCallbackData =
  | {
      kind: "photo";
      id: BiomesId;
    }
  | {
      kind: "minigame";
      id: BiomesId;
    };

export type SelectPhotoCallback = (data: SelectPhotoCallbackData) => unknown;

export type SelectPhotoSources = "photos" | "minigames";

export const SelectPhotoScreen: React.FunctionComponent<{
  onPhotoSelected: SelectPhotoCallback;
  restrictToSources?: SelectPhotoSources[];
}> = ({ onPhotoSelected, restrictToSources }) => {
  const { authManager, socialManager, clientCache, userId } =
    useClientContext();
  const { posts, maybeLoadMore, isLoading, canLoadMore } = usePhotoPageLoader(
    socialManager,
    clientCache,
    userId
  );

  const [drillDownState, setDrilldownState] = useState<DrilldownState>({
    type: "photos",
  });

  const setPlaceableContentsToPicture = useCallback((photoId: BiomesId) => {
    onPhotoSelected({
      kind: "photo",
      id: photoId,
    });
  }, []);

  const setPlaceableContentsToMinigame = useCallback((minigameId: BiomesId) => {
    onPhotoSelected({
      kind: "minigame",
      id: minigameId,
    });
  }, []);

  const isAdmin = authManager.currentUser.hasSpecialRole("admin");

  return (
    <SplitPaneScreen>
      <ScreenTitleBar>
        <BarTitle>Choose Photo</BarTitle>
      </ScreenTitleBar>

      <LeftPane>
        <LeftPaneDrilldown>
          <LeftPaneDrilldownItem
            selected={drillDownState.type === "photos"}
            icon={iconUrl(anItem(BikkieIds.camera))}
            title="Photos"
            onClick={() => {
              setDrilldownState({
                type: "photos",
              });
            }}
          />

          {isAdmin &&
            (!restrictToSources ||
              restrictToSources?.includes("minigames")) && (
              <LeftPaneDrilldownItem
                selected={drillDownState.type === "minigames"}
                icon={iconUrl(anItem(BikkieIds.arcadeMachine))}
                title="Minigames"
                onClick={() => {
                  setDrilldownState({
                    type: "minigames",
                  });
                }}
              />
            )}
        </LeftPaneDrilldown>
      </LeftPane>
      <RightPane
        onBottom={() => {
          void maybeLoadMore();
        }}
      >
        <div className="padded-view">
          <LazyFragment isActive={drillDownState.type === "photos"}>
            <PostsGrid
              posts={posts}
              onClick={(photoId: BiomesId) => {
                setPlaceableContentsToPicture(photoId);
              }}
            />
            <MaybeGridSpinner isLoading={isLoading} />
            <MaybeLoadMoreRow
              loading={isLoading}
              canLoadMore={canLoadMore}
              onLoadMore={() => {
                void maybeLoadMore();
              }}
            />
          </LazyFragment>

          <LazyFragment isActive={drillDownState.type === "minigames"}>
            <MinigameBrowserComponent
              enablePlay={false}
              onGameClick={(minigameId: BiomesId) => {
                setPlaceableContentsToMinigame(minigameId);
              }}
            />
          </LazyFragment>
        </div>
      </RightPane>
    </SplitPaneScreen>
  );
};
