import { UserListView } from "@/client/components/social/MiniPhoneUserList";
import { usePagedFollowList } from "@/client/util/social_manager_hooks";
import type { BiomesId } from "@/shared/ids";
import React from "react";

export const MiniPhoneFollowList: React.FunctionComponent<{
  userId: BiomesId;
  direction: "outbound" | "inbound";
}> = ({ userId, direction }) => {
  const { loading, error, users, canLoadMore, loadMore } = usePagedFollowList(
    userId,
    direction
  );

  return (
    <UserListView
      title={direction === "outbound" ? "Following" : "Followers"}
      loading={loading}
      error={error}
      users={users}
      canLoadMore={canLoadMore}
      onLoadMore={() => loadMore()}
    />
  );
};
