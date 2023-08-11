import { MiniPhoneUserList } from "@/client/components/social/MiniPhoneUserList";
import type { FeedPostBundle } from "@/shared/types";
import React from "react";

export const MiniPhoneTaggedList: React.FunctionComponent<{
  post: FeedPostBundle;
}> = ({ post }) => {
  const taggedUsers = post.taggedObjects.flatMap((e) => {
    if (e.kind === "user") {
      return [e.bundle];
    }
    return [];
  });
  return (
    <MiniPhoneUserList
      title="Tagged"
      loading={false}
      canLoadMore={false}
      onLoadMore={() => {}}
      users={taggedUsers}
    />
  );
};
