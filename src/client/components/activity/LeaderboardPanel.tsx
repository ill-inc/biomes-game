import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { MiniPhoneUserAvatarLink } from "@/client/components/social/MiniPhoneUserLink";
import type { SocialMiniPhonePayload } from "@/client/components/social/types";
import { LazyFragment } from "@/client/components/system/LazyFragment";
import { MaybeGridSpinner } from "@/client/components/system/MaybeGridSpinner";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { SegmentedControl } from "@/client/components/system/SegmentedControl";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import type { SocialManager } from "@/client/game/context_managers/social_manager";
import { useAsyncInitialDataFetch } from "@/client/util/hooks";
import type {
  GroupsLeaderboard,
  Leaderboard,
  LeaderboardsResponse,
  PostsLeaderboard,
  UsersLeaderboard,
} from "@/pages/api/social/leaderboards";
import type { LeaderboardWindow } from "@/server/shared/world/api";
import { zLeaderboardWindow } from "@/server/shared/world/api";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import { displayUsername } from "@/shared/util/helpers";
import { imageUrlForSize } from "@/shared/util/urls";
import { useState } from "react";

export const useLeaderboards = (
  deps: {
    socialManager?: SocialManager;
  },
  timeWindow: LeaderboardWindow
) =>
  useAsyncInitialDataFetch(
    async () => {
      const ret = await jsonFetch<LeaderboardsResponse>(
        `/api/social/leaderboards?window=${timeWindow}`
      );

      for (const board of ret.leaderboards) {
        switch (board.kind) {
          case "posts":
            for (const post of board.data) {
              void deps.socialManager?.eagerPushPostBundle(post.post);
            }
            break;
        }
      }

      return ret;
    },
    undefined,
    [timeWindow]
  );

const UserLeaderboardRows: React.FunctionComponent<{
  leaderboard: UsersLeaderboard;
}> = ({ leaderboard }) => {
  const { pushNavigationStack } =
    useExistingMiniPhoneContext<SocialMiniPhonePayload>();
  return (
    <>
      {leaderboard.data.map((item, i) => {
        return (
          <li
            key={item.user.id}
            onClick={() => {
              pushNavigationStack({
                type: "profile",
                userId: item.user.id,
              });
            }}
          >
            <div className="position">{i + 1}</div>
            <MiniPhoneUserAvatarLink user={item.user} />
            <div className="username">
              {displayUsername(item.user.username)}
            </div>
            <div className="flavor-text">{item.flavorText}</div>
          </li>
        );
      })}
    </>
  );
};

const PostsLeaderboardRows: React.FunctionComponent<{
  leaderboard: PostsLeaderboard;
}> = ({ leaderboard }) => {
  const { pushNavigationStack } =
    useExistingMiniPhoneContext<SocialMiniPhonePayload>();
  return (
    <>
      {leaderboard.data.map((item, i) => {
        return (
          <li
            key={item.post.id}
            onClick={() => {
              pushNavigationStack({
                type: "social_detail",
                documentType: "post",
                documentId: item.post.id,
              });
            }}
          >
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
  const { pushNavigationStack } =
    useExistingMiniPhoneContext<SocialMiniPhonePayload>();
  return (
    <>
      {leaderboard.data.map((item, i) => {
        return (
          <li
            key={item.group.id}
            onClick={() => {
              pushNavigationStack({
                type: "social_detail",
                documentType: "environment_group",
                documentId: item.group.id,
              });
            }}
          >
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
      <div className="title-bar">
        <div className="title">{leaderboard.label}</div>
      </div>
      <ol>
        <LeaderboardRows leaderboard={leaderboard} />
      </ol>
    </section>
  );
};

const WINDOW_NAMES = new Map<LeaderboardWindow, string>([
  ["daily", "Today"],
  ["thisWeek", "This Week"],
  ["alltime", "All Time"],
]);

export const LeaderboardTimeWindowControl: React.FunctionComponent<{
  timeWindow: LeaderboardWindow;
  onChange: (window: LeaderboardWindow) => void;
}> = ({ timeWindow, onChange }) => {
  return (
    <SegmentedControl
      index={zLeaderboardWindow.options.indexOf(timeWindow)}
      onClick={(index) => {
        onChange(zLeaderboardWindow.options[index]);
      }}
      items={zLeaderboardWindow.options.map(
        (window) => WINDOW_NAMES.get(window) ?? window
      )}
    />
  );
};

export const LeaderboardPane: React.FunctionComponent<{
  timeWindow: LeaderboardWindow;
}> = ({ timeWindow }) => {
  const { socialManager } = useClientContext();
  const { loading, data } = useLeaderboards({ socialManager }, timeWindow);
  return (
    <>
      <MaybeGridSpinner isLoading={loading} />
      {data?.leaderboards.map((e) => (
        <LeaderboardSingle leaderboard={e} key={e.label} />
      ))}
    </>
  );
};

export const LeaderboardPanel: React.FunctionComponent<{}> = ({}) => {
  const [timeWindow, setTimeWindow] = useState<LeaderboardWindow>("thisWeek");
  return (
    <PaneLayout type="scroll" extraClassName="leaderboard-panel">
      <div className="padded-view">
        <div className="title">Leaderboards</div>
        <LeaderboardTimeWindowControl
          timeWindow={timeWindow}
          onChange={setTimeWindow}
        />
        {zLeaderboardWindow.options.map((w) => (
          <LazyFragment key={w} isActive={timeWindow === w}>
            <LeaderboardPane timeWindow={w} />
          </LazyFragment>
        ))}
      </div>
    </PaneLayout>
  );
};
