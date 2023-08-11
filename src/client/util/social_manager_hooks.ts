import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useError } from "@/client/components/system/MaybeError";
import type { ClientCache } from "@/client/game/context_managers/client_cache";
import type { SocialManager } from "@/client/game/context_managers/social_manager";
import { cleanEmitterCallback } from "@/client/util/helpers";
import { useEffectAsync, useInvalidate } from "@/client/util/hooks";
import { useInterval } from "@/client/util/intervals";
import type {
  CuratedPhotosResponse,
  PostStatus,
} from "@/pages/api/social/curated_posts";
import type { FeaturedPostsResponse } from "@/pages/api/social/featured_posts";
import type { FollowListResponse } from "@/pages/api/social/follow_list";
import type { RequestLeaderboard } from "@/pages/api/social/leaderboard_nearby_values";
import type {
  UpdateCuratedPhotoRequest,
  UpdateCuratedPhotoResponse,
} from "@/pages/api/social/update_curated_post";
import type { UserPhotosResponse } from "@/pages/api/social/user_photos";
import type {
  LeaderboardOrder,
  LeaderboardPosition,
  LeaderboardWindow,
} from "@/server/shared/world/api";
import { INVALID_BIOMES_ID, type BiomesId } from "@/shared/ids";
import type {
  CuratedFeedPostBundle,
  FeedPostBundle,
  GroupDetailBundle,
  InviteCodeBundle,
  UserBundle,
} from "@/shared/types";
import { fireAndForget } from "@/shared/util/async";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import { jsonFetch, jsonPost } from "@/shared/util/fetch_helpers";
import { dictToQueryString } from "@/shared/util/helpers";
import { isEqual, uniqBy } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useCachedInviteCodes(
  socialManager: SocialManager,
  userId: BiomesId,
  options: {
    initialValue?: InviteCodeBundle[];
  } = {}
) {
  const [inviteCodes, setInviteCodes] = useState<
    InviteCodeBundle[] | undefined | null
  >(options.initialValue);

  useEffect(
    () =>
      cleanEmitterCallback(socialManager.emitter, {
        invalidateInviteCodes(invalidatedUserId, newValue) {
          if (userId === invalidatedUserId) {
            setInviteCodes(newValue);
          }
        },
      }),
    [userId]
  );

  useEffectAsync(async () => {
    setInviteCodes(await socialManager.inviteCodes(userId));
  }, [userId]);

  return inviteCodes;
}

interface PagedFollowList {
  direction: "inbound" | "outbound";
  users: UserBundle[];
  loading: boolean;
  error: any[];
  canLoadMore: boolean;
  loadMore: () => void;
}

export function usePagedFollowList(
  userId: BiomesId,
  direction: "inbound" | "outbound"
): PagedFollowList {
  const [error, setError] = useError();
  const [pagingToken, setPagingToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserBundle[]>([]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const queryString = dictToQueryString({
        userId,
        direction,
        pagingToken,
      });
      const res = await jsonFetch<FollowListResponse>(
        `/api/social/follow_list?${queryString}`
      );
      setUsers(uniqBy([...users, ...res.users], (user) => user.id));
      setPagingToken(res.pagingToken);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [users, pagingToken]);

  useEffectAsync(async () => {
    void loadPage();
  }, []);

  return {
    direction,
    users,
    loading,
    error,
    canLoadMore: !!pagingToken,
    loadMore: () => void loadPage(),
  };
}

export function useCachedGroupBundle(
  socialManager: SocialManager,
  groupId: BiomesId,
  options: {
    initialValue?: GroupDetailBundle;
  } = {}
) {
  const [groupBundle, setGroupBundle] = useState<
    GroupDetailBundle | undefined | null
  >(options.initialValue);
  const forceInvalidate = useInvalidate();

  useEffect(
    () =>
      cleanEmitterCallback(socialManager.emitter, {
        invalidateGroup: (invalidatedGroupId, groupBundle) => {
          if (groupId === invalidatedGroupId) {
            setGroupBundle(groupBundle);
            forceInvalidate();
          }
        },
      }),
    [groupId]
  );

  useEffectAsync(async () => {
    setGroupBundle(await socialManager.groupBundle(groupId));
  }, [groupId]);

  return groupBundle;
}

export function useCachedPostBundle(
  socialManager: SocialManager,
  postId: BiomesId | undefined,
  options: {
    initialValue?: FeedPostBundle;
  } = {}
) {
  const [feedPostBundle, setFeedPostBundle] = useState<
    FeedPostBundle | undefined | null
  >(options.initialValue);
  const forceInvalidate = useInvalidate();

  useEffect(() => {
    if (postId) {
      return cleanEmitterCallback(socialManager.emitter, {
        invalidatePost: (invalidatePostID, invalidatedBundle) => {
          if (postId === invalidatePostID) {
            setFeedPostBundle(invalidatedBundle);
            forceInvalidate();
          }
        },
      });
    }
  }, [postId]);

  useEffectAsync(async () => {
    if (postId) {
      setFeedPostBundle(await socialManager.postBundle(postId));
    } else {
      setFeedPostBundle(undefined);
    }
  }, [postId]);

  return feedPostBundle;
}

export function useCachedLeaderboardGetAfter(
  socialManager: SocialManager,
  leaderboard?: RequestLeaderboard,
  window?: LeaderboardWindow,
  order?: LeaderboardOrder,
  score: number | undefined = undefined
) {
  const [result, setResult] = useState<
    Array<LeaderboardPosition> | undefined
  >();

  useEffect(
    () =>
      cleanEmitterCallback(socialManager.emitter, {
        invalidateLeaderboardGetAfter: (
          theLeaderboard,
          theWindow,
          theOrder,
          theScore,
          _theLimit,
          theResult
        ) => {
          if (
            isEqual(leaderboard, theLeaderboard) &&
            window === theWindow &&
            order === theOrder &&
            score == theScore
          ) {
            setResult(theResult);
          }
        },
      }),
    [leaderboard, window, score, order]
  );

  useEffectAsync(async () => {
    if (!leaderboard || !window) {
      return;
    }

    setResult(
      await socialManager.leaderboardGetAfter(leaderboard, window, order, score)
    );
  }, [leaderboard, window, score, order]);

  return result;
}

export function useCachedLeaderboardValue(
  socialManager: SocialManager,
  userId: BiomesId,
  leaderboard: RequestLeaderboard,
  window: LeaderboardWindow,
  order: LeaderboardOrder
) {
  const [result, setResult] = useState<
    LeaderboardPosition | undefined | null
  >();

  useEffect(
    () =>
      cleanEmitterCallback(socialManager.emitter, {
        invalidateLeaderboardValue: (
          theUserId,
          theLeaderboard,
          theWindow,
          theOrder,
          theResult
        ) => {
          if (
            userId === theUserId &&
            isEqual(leaderboard, theLeaderboard) &&
            window === theWindow &&
            order === theOrder
          ) {
            setResult(theResult);
          }
        },
      }),
    [userId, leaderboard, window, order]
  );

  useEffectAsync(async () => {
    setResult(
      await socialManager.leaderboardValue(leaderboard, window, order, userId)
    );
  }, [userId, leaderboard, window, order]);

  return result;
}

export function useCachedUserInfo(
  socialManager: SocialManager,
  userId: BiomesId | undefined | null,
  options: {
    initialValue?: UserInfoBundle;
  } = {}
): UserInfoBundle | undefined | null {
  const [userInfoBundle, setUserInfoBundle] = useState<
    UserInfoBundle | undefined | null
  >(options.initialValue);
  const forceInvalidate = useInvalidate();

  useEffect(
    () =>
      cleanEmitterCallback(socialManager.emitter, {
        invalidateUserInfo: (invalidateUserId, invalidatedBundle) => {
          if (userId === invalidateUserId) {
            setUserInfoBundle(invalidatedBundle);
            forceInvalidate();
          }
        },
      }),
    [userId]
  );

  useEffectAsync(async () => {
    setUserInfoBundle(await socialManager.userInfoBundle(userId));
  }, [userId]);

  return userInfoBundle;
}

export function useCachedUsername(
  userId: BiomesId | undefined | null,
  options: {
    initialValue?: string;
  } = {}
): string | undefined {
  const { reactResources, socialManager } = useClientContext();
  const ecsUserName = reactResources.use(
    "/ecs/c/label",
    userId ?? INVALID_BIOMES_ID
  )?.text;
  const bundleUserName = useCachedUserInfo(
    socialManager,
    ecsUserName ? INVALID_BIOMES_ID : userId
  )?.user?.username;
  return ecsUserName || bundleUserName || options.initialValue;
}

export function useCachedFollowIds(
  socialManager: SocialManager,
  userId: BiomesId | undefined | null,
  options: {
    initialValue?: Array<BiomesId>;
  } = {}
) {
  const [userFollowIds, setUserFollowIds] = useState<
    BiomesId[] | undefined | null
  >(options.initialValue);

  useEffect(
    () =>
      cleanEmitterCallback(socialManager.emitter, {
        invalidateFollowedIds: (invalidateUserId, invalidateFollowedIds) => {
          if (userId === invalidateUserId) {
            setUserFollowIds(invalidateFollowedIds);
          }
        },
      }),
    [userId]
  );

  useEffectAsync(async () => {
    setUserFollowIds(await socialManager.followedIds(userId));
  }, [userId]);

  return userFollowIds;
}

export function useOnlineFollowedCount(
  socialManager: SocialManager,
  userId: BiomesId | undefined | null,
  options: {
    initialValue?: number;
  } = {}
) {
  const [onlineFollowedCount, setOnlineFollowedCount] = useState<
    number | undefined
  >(options.initialValue ?? undefined);

  const populate = () => {
    fireAndForget(
      (async () => {
        setOnlineFollowedCount(
          ((await socialManager.onlineFollowedIds(userId)) ?? []).length
        );
      })()
    );
  };

  useInterval(() => {
    populate();
  }, 10_000);
  useEffect(() => populate(), []);

  return onlineFollowedCount;
}

export function usePhotoPageLoader(
  socialManager: SocialManager,
  clientCache: ClientCache,
  userId: BiomesId,
  setError?: (error: any) => unknown
) {
  const [posts, setPosts] = useState<FeedPostBundle[]>([]);
  const [pagingToken, setPagingToken] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadPage = useCallback(
    async (pagingToken?: string) => {
      if (isLoading) {
        return;
      }

      if (pagingToken === undefined) {
        const [cached, found] = await clientCache.get(
          "userInitialPostsResponse",
          userId
        );
        if (found) {
          setPosts([...posts, ...cached!.postsFeed.posts]);
          setPagingToken(cached!.postsFeed.pagingToken);
          return;
        }
      }

      setIsLoading(true);
      const queryString = dictToQueryString({
        userId,
        pagingToken,
      });
      try {
        const userPhotos = await jsonFetch<UserPhotosResponse>(
          `/api/social/user_photos?${queryString}`
        );
        userPhotos.postsFeed.posts.forEach((p) => {
          void socialManager.eagerPushPostBundle(p);
        });
        setPosts([...posts, ...userPhotos.postsFeed.posts]);
        setPagingToken(userPhotos.postsFeed.pagingToken);

        if (pagingToken === undefined) {
          await clientCache.set(
            socialManager.DEFAULT_TTL,
            "userInitialPostsResponse",
            userId,
            userPhotos
          );
        }
      } catch (error: any) {
        setError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [posts, isLoading]
  );

  const maybeLoadMore = useCallback(() => {
    if (pagingToken) {
      void loadPage(pagingToken);
    }
  }, [pagingToken]);

  useEffect(() => {
    void loadPage();
  }, []);

  return {
    posts,
    setPosts,
    pagingToken,
    setPagingToken,
    isLoading,
    setIsLoading,
    loadPage,
    maybeLoadMore,
    canLoadMore: !!pagingToken,
  };
}

export type PhotoPageLoader = ReturnType<typeof usePhotoPageLoader>;

interface UseFeaturedPostsOptions {
  count: number;
}

export function useFeaturedPosts({ count }: UseFeaturedPostsOptions) {
  const [bundles, setBundles] = useState<CuratedFeedPostBundle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const queryString = dictToQueryString({
      count,
    });
    setIsLoading(true);
    void jsonFetch<FeaturedPostsResponse>(
      `/api/social/featured_posts?${queryString}`
    ).then(({ posts }) => {
      setIsLoading(false);
      setBundles(posts);
    });
  }, []);

  return {
    posts: bundles,
    isLoading,
  };
}

interface UseCuratedPhotosOptions {
  pageSize?: number;
  status?: PostStatus;
}

export function useCuratedPhotos(options?: UseCuratedPhotosOptions) {
  const [bundles, setBundles] = useState<CuratedFeedPostBundle[]>([]);
  const [pagingToken, setPagingToken] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const bundlesById = useMemo(() => {
    return new Map(bundles.map((bundle) => [bundle.id, bundle]));
  }, [bundles]);

  const loadPage = useCallback(
    async (pagingToken?: string) => {
      if (isLoading) {
        return;
      }

      setIsLoading(true);
      try {
        const queryString = dictToQueryString({
          pagingToken: pagingToken,
          pageSize: options?.pageSize,
          status: options?.status,
        });

        const { feed } = await jsonFetch<CuratedPhotosResponse>(
          `/api/social/curated_posts?${queryString}`
        );
        setPagingToken(feed.pagingToken);
        setBundles((bundles) => {
          const newBundles = feed.posts.filter(
            (post) => !bundlesById.has(post.id)
          );
          return [...bundles, ...newBundles].sort(
            (a, b) => b.priority - a.priority
          );
        });
      } finally {
        setIsLoading(false);
      }
    },
    [bundles, isLoading, pagingToken]
  );

  const maybeLoadMore = useCallback(() => {
    if (pagingToken) {
      void loadPage(pagingToken);
    }
  }, [pagingToken]);

  useEffect(() => {
    void loadPage();
  }, []);

  // Change the approval status of a photo.
  const toggleApproval = async (bundleId: BiomesId) => {
    const bundle = bundlesById.get(bundleId);
    if (bundle === undefined) {
      return;
    }
    await jsonPost<UpdateCuratedPhotoResponse, UpdateCuratedPhotoRequest>(
      `/api/social/update_curated_post`,
      {
        postId: bundleId,
        approved: !bundle.approved,
      }
    );
    bundle.approved = !bundle.approved;
    setBundles((bundles) =>
      bundles.map((oldBundle) => {
        if (oldBundle.id === bundleId) {
          return bundle;
        } else {
          return oldBundle;
        }
      })
    );
  };

  return {
    bundles,
    pagingToken,
    toggleApproval,
    isLoading,
    loadPage,
    maybeLoadMore,
    canLoadMore: pagingToken !== undefined,
  };
}

export type AllPhotosLoader = ReturnType<typeof useCuratedPhotos>;
