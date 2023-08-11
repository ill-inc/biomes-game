import { AvatarView } from "@/client/components/chat/Links";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { FilteredUser } from "@/client/components/social/FilteredUser";
import { BarTitle } from "@/client/components/system/mini_phone/split_pane/BarTitle";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { PaneSlideoverTitleBar } from "@/client/components/system/mini_phone/split_pane/PaneSlideover";
import type { UserFilter } from "@/client/game/helpers/social";
import { usePagedFollowList } from "@/client/util/social_manager_hooks";
import type { BiomesId } from "@/shared/ids";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import { compact, throttle } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";

export const SearchPlayerSlideover: React.FunctionComponent<{
  onSelect?: (userId: BiomesId) => void;
  onClose?: () => void;
  title?: string;
  filters?: UserFilter[];
}> = ({ onSelect, onClose, title, filters }) => {
  const { socialManager, reactResources } = useClientContext();
  const [search, setSearch] = useState("");
  // Autocomplete-matched user bundles
  const [foundUserBundles, setFoundUserBundles] = useState<UserInfoBundle[]>(
    []
  );
  // Perfect match user bundle
  const [perfectMatchBundle, setPerfectMatchBundle] = useState<
    UserInfoBundle | undefined
  >(undefined);
  // Combine all found bundles
  const userBundles = useMemo(
    () =>
      compact([
        ...foundUserBundles.filter(
          (bundle) =>
            !perfectMatchBundle || bundle.user.id !== perfectMatchBundle.user.id
        ),
        perfectMatchBundle,
      ]),
    [foundUserBundles, perfectMatchBundle]
  );

  // Autocomplete user bundles
  useEffect(() => {
    let needsUpdate = true;
    void (async () => {
      if (search.length === 0) {
        setFoundUserBundles([]);
        return;
      }
      const userBundles = await socialManager.autocompleteUserName(search);
      if (needsUpdate) {
        setFoundUserBundles(compact(userBundles));
      }
    })();
    return () => {
      needsUpdate = false;
    };
  }, [search, socialManager]);

  // Throttled search for perfect match
  const throttledPerfectMatch = useCallback(
    throttle(
      (name: string, fn: (match: UserInfoBundle | null) => void) =>
        void (async () => {
          const perfectMatch = await socialManager.resolveUserName(name);
          fn(perfectMatch);
        })(),
      1000
    ),
    [socialManager]
  );
  useEffect(() => {
    let needsUpdate = true;
    void (async () => {
      if (search.length === 0) {
        return;
      }
      throttledPerfectMatch(search, (match) => {
        if (needsUpdate) {
          setPerfectMatchBundle(match ?? undefined);
        }
      });
    })();
    return () => {
      needsUpdate = false;
    };
  }, [search, throttledPerfectMatch]);

  const playerId = reactResources.get("/scene/local_player").id;
  const followedUsers = usePagedFollowList(playerId, "outbound").users;

  return (
    <PaneLayout>
      <PaneSlideoverTitleBar onClose={onClose}>
        <BarTitle>{title ?? "Search"}</BarTitle>
      </PaneSlideoverTitleBar>
      <div className="padded-view-auto-height">
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ul
        className="flex w-full cursor-pointer flex-col
      items-center pb-[calc(0.75vmin_+_(var(--inventory-cell-gap)))] font-medium"
      >
        {search != "" && (
          <>
            <div className="w-full">
              <label className="m-0 p-0.8">Search</label>
              {userBundles.length == 0 && <p>No players found</p>}
            </div>
            {userBundles.length > 0 &&
              (userBundles || []).map((userBundle) =>
                userBundle?.user ? (
                  <li
                    className="flex w-full items-center gap-0.6 p-0.8 hover:bg-white/5"
                    key={userBundle.user.id}
                    onClick={() => {
                      onSelect?.(userBundle.user.id);
                    }}
                  >
                    <AvatarView userId={userBundle.user.id} />
                    <div className="flex-grow">{userBundle.user.username}</div>
                  </li>
                ) : (
                  <></>
                )
              )}
          </>
        )}
        {followedUsers.length > 0 && search == "" && (
          <>
            <div className="w-full">
              <label className="m-0 p-0.8">Following</label>
            </div>
            {followedUsers.map((bundle) => (
              <FilteredUser
                key={bundle.id}
                user={bundle}
                filters={filters ?? []}
              >
                <li
                  className="flex w-full items-center gap-0.6 p-0.8 hover:bg-white/5"
                  key={bundle.id}
                  onClick={() => {
                    onSelect?.(bundle.id);
                  }}
                >
                  <AvatarView userId={bundle.id} />
                  <p>{bundle.username}</p>
                </li>
              </FilteredUser>
            ))}
          </>
        )}
      </ul>
    </PaneLayout>
  );
};
