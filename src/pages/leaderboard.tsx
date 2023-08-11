import {
  LeaderboardTimeWindowControl,
  useLeaderboards,
} from "@/client/components/activity/LeaderboardPanel";
import { LazyFragment } from "@/client/components/system/LazyFragment";
import { MaybeGridSpinner } from "@/client/components/system/MaybeGridSpinner";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import type {
  GroupsLeaderboard,
  Leaderboard,
  PostsLeaderboard,
  UsersLeaderboard,
} from "@/pages/api/social/leaderboards";
import StaticPage from "@/pages/static-page";
import type { LeaderboardWindow } from "@/server/shared/world/api";
import { zLeaderboardWindow } from "@/server/shared/world/api";
import { displayUsername } from "@/shared/util/helpers";
import { imageUrlForSize } from "@/shared/util/urls";
import React, { useState } from "react";

const UserLeaderboardRows: React.FunctionComponent<{
  leaderboard: UsersLeaderboard;
}> = ({ leaderboard }) => {
  return (
    <>
      {leaderboard.data.map(({ user, flavorText }, i) => {
        return (
          <li key={user.id}>
            <div className="position">{i + 1}</div>
            <ShadowedImage
              extraClassNames="avatar"
              src={imageUrlForSize("thumbnail", user.profilePicImageUrls)}
            />
            <div className="username">{displayUsername(user.username)}</div>
            <div className="flavor-text">{flavorText}</div>
          </li>
        );
      })}
    </>
  );
};

const PostsLeaderboardRows: React.FunctionComponent<{
  leaderboard: PostsLeaderboard;
}> = ({ leaderboard }) => {
  return (
    <>
      {leaderboard.data.map((item, i) => {
        return (
          <li key={item.post.id}>
            <div className="position">{i + 1}</div>
            <ShadowedImage
              extraClassNames="thumbnail-wrapper"
              src={imageUrlForSize("thumbnail", item.post.imageUrls)}
            />
            <div className="post-caption">
              {item.post.caption ? (
                item.post.caption
              ) : (
                <>Post by {item.post.author.username} </>
              )}
            </div>
            <div className="flavor-text">{item.flavorText}</div>
          </li>
        );
      })}
    </>
  );
};

const GroupsLeaderboardRows: React.FunctionComponent<{
  leaderboard: GroupsLeaderboard;
}> = ({ leaderboard }) => {
  return (
    <>
      {leaderboard.data.map((item, i) => {
        return (
          <li key={item.group.id}>
            <div className="position">{i + 1}</div>
            <ShadowedImage
              extraClassNames="thumbnail-wrapper"
              src={imageUrlForSize("thumbnail", item.group.imageUrls)}
            />
            <div className="post-caption">
              {item.group.name ? (
                item.group.name
              ) : (
                <>
                  Group by {item.group.ownerBiomesUser?.username ?? "a user"}{" "}
                </>
              )}
            </div>
            <div className="flavor-text">{item.flavorText}</div>
          </li>
        );
      })}
    </>
  );
};

const LeaderboardRows: React.FunctionComponent<{
  leaderboard: Leaderboard;
}> = ({ leaderboard }) => {
  switch (leaderboard.kind) {
    case "users":
      return <UserLeaderboardRows leaderboard={leaderboard} />;
    case "posts":
      return <PostsLeaderboardRows leaderboard={leaderboard} />;
    case "groups":
      return <GroupsLeaderboardRows leaderboard={leaderboard} />;
  }
};

const LeaderboardSingle: React.FunctionComponent<{
  leaderboard: Leaderboard;
}> = ({ leaderboard }) => {
  return (
    <section className="leaderboard biomes-box">
      <div className="title">{leaderboard.label}</div>
      <ol>
        <LeaderboardRows leaderboard={leaderboard} />
      </ol>
    </section>
  );
};

export const LeaderboardPane: React.FunctionComponent<{
  timeWindow: LeaderboardWindow;
}> = ({ timeWindow }) => {
  const { loading, data } = useLeaderboards({}, timeWindow);
  return (
    <>
      <MaybeGridSpinner isLoading={loading} />
      {data?.leaderboards.map((e) => (
        <LeaderboardSingle leaderboard={e} key={e.label} />
      ))}
    </>
  );
};

export const LeaderboardPage: React.FunctionComponent<{}> = ({}) => {
  const [timeWindow, setTimeWindow] = useState<LeaderboardWindow>("thisWeek");
  return (
    <StaticPage>
      <LeaderboardTimeWindowControl
        timeWindow={timeWindow}
        onChange={setTimeWindow}
      />
      {zLeaderboardWindow.options.map((w) => (
        <LazyFragment key={w} isActive={timeWindow === w}>
          <LeaderboardPane timeWindow={w} />
        </LazyFragment>
      ))}
    </StaticPage>
  );
};

export default LeaderboardPage;
