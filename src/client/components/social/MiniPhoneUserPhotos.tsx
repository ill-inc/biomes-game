import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { PostsGrid } from "@/client/components/social/PostsGrid";
import { MaybeGridSpinner } from "@/client/components/system/MaybeGridSpinner";
import { MaybeLoadMoreRow } from "@/client/components/system/MaybeLoadMoreRow";
import { MiniPhoneInfiniteScrollerScreen } from "@/client/components/system/mini_phone/MiniPhoneInfiniteScrollerScreen";
import {
  MiniPhoneScreen,
  MiniPhoneScreenContent,
  MiniPhoneScreenTitle,
} from "@/client/components/system/mini_phone/MiniPhoneScreen";
import { usePhotoPageLoader } from "@/client/util/social_manager_hooks";
import type { BiomesId } from "@/shared/ids";
import React from "react";

export const MiniPhoneUserPhotos: React.FunctionComponent<{
  userId: BiomesId;
}> = ({ userId }) => {
  const { socialManager, clientCache } = useClientContext();
  const { posts, maybeLoadMore, isLoading, canLoadMore } = usePhotoPageLoader(
    socialManager,
    clientCache,
    userId
  );

  return (
    <MiniPhoneScreen>
      <MiniPhoneScreenTitle>Posts</MiniPhoneScreenTitle>
      <MiniPhoneScreenContent>
        <MiniPhoneInfiniteScrollerScreen
          extraClassName="padded-view"
          onBottom={() => {
            if (!isLoading && canLoadMore) {
              void maybeLoadMore();
            }
          }}
        >
          <PostsGrid posts={posts} />
          <MaybeGridSpinner isLoading={isLoading} />
          <MaybeLoadMoreRow
            loading={isLoading}
            canLoadMore={canLoadMore}
            onLoadMore={() => {
              if (!isLoading && canLoadMore) {
                void maybeLoadMore();
              }
            }}
          />
        </MiniPhoneInfiniteScrollerScreen>
      </MiniPhoneScreenContent>
    </MiniPhoneScreen>
  );
};
