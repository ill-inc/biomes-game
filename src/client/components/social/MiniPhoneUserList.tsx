import { MiniPhoneUserAvatarLink } from "@/client/components/social/MiniPhoneUserLink";
import type { SocialMiniPhonePayload } from "@/client/components/social/types";
import { Img } from "@/client/components/system/Img";
import { MaybeError } from "@/client/components/system/MaybeError";
import { MaybeGridSpinner } from "@/client/components/system/MaybeGridSpinner";
import { MaybeLoadMoreRow } from "@/client/components/system/MaybeLoadMoreRow";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { MiniPhoneInfiniteScrollerScreen } from "@/client/components/system/mini_phone/MiniPhoneInfiniteScrollerScreen";
import {
  MiniPhoneScreen,
  MiniPhoneScreenContent,
  MiniPhoneScreenTitle,
} from "@/client/components/system/mini_phone/MiniPhoneScreen";
import type { BiomesId } from "@/shared/ids";
import type { UserBundle } from "@/shared/types";
import { displayUsername } from "@/shared/util/helpers";
import React, { useCallback } from "react";
import chevronIcon from "/public/hud/icon-16-chevron-right.png";

export const UserListView: React.FunctionComponent<{
  users: UserBundle[];
  loading: boolean;
  canLoadMore: boolean;
  onLoadMore: () => any;
  title: string;
  error?: any;
}> = ({ users, loading, error, canLoadMore, onLoadMore, title }) => {
  const miniPhone = useExistingMiniPhoneContext<SocialMiniPhonePayload>();

  const pushUser = useCallback(
    (userId: BiomesId) => {
      miniPhone.pushNavigationStack({
        type: "profile",
        userId,
      });
    },
    [miniPhone]
  );

  return (
    <MiniPhoneInfiniteScrollerScreen
      extraClassName="follow-list"
      onBottom={() => {
        if (canLoadMore) {
          //onLoadMore();
        }
      }}
    >
      <MaybeError error={error} />
      <div>
        {!loading && (users.length ?? 0) === 0 ? (
          <div className="empty">No {title}</div>
        ) : (
          <ul className="follow-list-users">
            {users.map((user) => (
              <li
                key={user.id}
                onClick={(e) => {
                  e.preventDefault();
                  pushUser(user.id);
                }}
                className="user"
              >
                <MiniPhoneUserAvatarLink user={user} />
                <div className="username">{displayUsername(user.username)}</div>
                <div className="disclosure-arrow">
                  <Img src={chevronIcon.src} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <MaybeGridSpinner isLoading={loading} />
        <MaybeLoadMoreRow
          canLoadMore={canLoadMore}
          loading={loading}
          onLoadMore={() => {
            if (canLoadMore) {
              onLoadMore();
            }
          }}
        />
      </div>
    </MiniPhoneInfiniteScrollerScreen>
  );
};

export const MiniPhoneUserList: React.FunctionComponent<{
  users: UserBundle[];
  loading: boolean;
  canLoadMore: boolean;
  onLoadMore: () => any;
  error?: any;
  title: string;
}> = ({ users, loading, error, canLoadMore, onLoadMore, title }) => {
  return (
    <MiniPhoneScreen>
      <MiniPhoneScreenTitle>{title}</MiniPhoneScreenTitle>
      <MiniPhoneScreenContent>
        <UserListView
          users={users}
          loading={loading}
          canLoadMore={canLoadMore}
          onLoadMore={onLoadMore}
          error={error}
          title={title}
        />
      </MiniPhoneScreenContent>
    </MiniPhoneScreen>
  );
};
