import type { ClientContext, ClientContextSubset } from "@/client/game/context";
import { cleanEmitterCallback } from "@/client/util/helpers";
import type {
  LikeRequest,
  LikeResponse,
} from "@/pages/api/bundles/group/[id]/like";
import type { GroupWarpResponse } from "@/pages/api/bundles/group/[id]/warp";
import type { DeletePostRequest } from "@/pages/api/social/delete_post";
import type { FollowListResponse } from "@/pages/api/social/follow_list";
import type { FollowUserRequest } from "@/pages/api/social/follow_user";
import type {
  LeaderboardNearbyValuesRequest,
  RequestLeaderboard,
} from "@/pages/api/social/leaderboard_nearby_values";
import type {
  LikePostRequest,
  LikePostResponse,
} from "@/pages/api/social/like_post";
import type {
  WarpPostRequest,
  WarpPostResponse,
} from "@/pages/api/social/warp_post";
import type { InviteCodesResponse } from "@/pages/api/user/invite_codes";
import type {
  LeaderboardOrder,
  LeaderboardPosition,
  LeaderboardWindow,
} from "@/server/shared/world/api";
import { APIError, isAPIErrorCode } from "@/shared/api/errors";
import type { Envelope } from "@/shared/chat/types";
import { safeParseBiomesId, type BiomesId } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";
import type {
  FeedPostBundle,
  GroupDetailBundle,
  InviteCodeBundle,
} from "@/shared/types";
import { Delayed, fireAndForget } from "@/shared/util/async";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import {
  fetchGroupBundle,
  fetchUserInfoBundleByUsername,
} from "@/shared/util/fetch_bundles";
import { jsonFetch, jsonPost } from "@/shared/util/fetch_helpers";
import { dictToQueryString, pathWithQuery } from "@/shared/util/helpers";
import { ok } from "assert";
import { EventEmitter } from "events";
import type TypedEventEmitter from "typed-emitter";

export type SocialManagerEvents = {
  invalidateGroup: (
    groupId: BiomesId,
    newValue: GroupDetailBundle | null
  ) => unknown;

  invalidatePost: (
    postId: BiomesId,
    newValue: FeedPostBundle | null
  ) => unknown;
  invalidateFollowedIds: (
    userId: BiomesId,
    newValue: Array<BiomesId> | null
  ) => unknown;

  invalidateUserInfo: (
    userId: BiomesId,
    newValue: UserInfoBundle | null
  ) => unknown;

  invalidateInviteCodes: (
    userId: BiomesId,
    newValue: InviteCodeBundle[] | null
  ) => unknown;

  invalidateLeaderboardValue: (
    userId: BiomesId,
    leaderboard: RequestLeaderboard,
    window: LeaderboardWindow,
    order: LeaderboardOrder,
    result: LeaderboardPosition | null
  ) => unknown;

  invalidateLeaderboardGetAfter: (
    leaderboard: RequestLeaderboard,
    window: LeaderboardWindow,
    order: LeaderboardOrder,
    score: number | undefined,
    limit: number,
    result: Array<LeaderboardPosition>
  ) => unknown;
};

type RevertFunction = () => unknown;

export class SocialManager {
  DEFAULT_TTL = 5 * 60 * 1000;

  emitter = new EventEmitter() as TypedEventEmitter<SocialManagerEvents>;
  cleanups: Array<() => unknown> = [];
  constructor(
    private deps: ClientContextSubset<
      | "clientCache"
      | "chatIo"
      | "userId"
      | "table"
      | "requestBatchers"
      | "gardenHose"
    >
  ) {
    void this.warmupSelf(deps.userId);
    this.emitter.setMaxListeners(100);
    this.cleanups.push(
      cleanEmitterCallback(deps.gardenHose, {
        mail_received: (event) => {
          if (!event.initialBootstrap) {
            this.onMailReceive(event.mail);
          }
        },
      })
    );
  }

  stop() {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
  }

  hotHandoff(oldVal: SocialManager) {
    this.emitter = oldVal.emitter;
    oldVal.stop();
  }

  private onMailReceive(mail: Envelope[]) {
    for (const envelope of mail) {
      const message = envelope.message;
      switch (message.kind) {
        case "like":
          if (envelope.from !== this.deps.userId) {
            if (message.documentType === "post") {
              fireAndForget(this.postBundle(message.documentId, true));
            } else if (message.documentType === "environment_group") {
              fireAndForget(this.groupBundle(message.documentId, true));
            }
          }
          break;
        case "comment":
          if (envelope.from !== this.deps.userId) {
            if (message.documentType === "post") {
              fireAndForget(this.postBundle(message.documentId, true));
            } else if (message.documentType === "environment_group") {
              fireAndForget(this.groupBundle(message.documentId, true));
            }
          }
          break;
      }
    }
  }

  private async warmupSelf(userId: BiomesId) {
    const bundle = await this.userInfoBundle(userId);
    if (!bundle) {
      return;
    }
    const queryString = dictToQueryString({
      userId,
      direction: "outbound",
    });
    const res = await jsonFetch<FollowListResponse>(
      `/api/social/follow_list?${queryString}`
    );
    await Promise.all(
      res.users.map((bundle) =>
        this.deps.clientCache.set(
          this.DEFAULT_TTL,
          "userInfoByName",
          (bundle.username ?? String(userId)).toLowerCase(),
          {
            user: bundle,
            isFollowing: true,
          }
        )
      )
    );
  }

  public eagerInvalidatePhotoPage(userId: BiomesId) {
    void this.deps.clientCache.del("userInitialPostsResponse", userId);
  }

  public async invalidateGroup(groupId: BiomesId) {
    this.emitter.emit("invalidateGroup", groupId, null);
  }

  private async eagerGroupAction(
    groupId: BiomesId,
    eagerFn: (cachedGroup: GroupDetailBundle) => RevertFunction | undefined,
    actionFn: () => Promise<GroupDetailBundle>
  ) {
    // Eager invalidate
    const [cachedGroup, found] = await this.deps.clientCache.get(
      "groupBundle",
      groupId
    );

    let revertFn: RevertFunction | undefined;
    if (cachedGroup && found) {
      revertFn = eagerFn(cachedGroup);
      this.emitter.emit("invalidateGroup", groupId, cachedGroup);
    }

    try {
      const newBundle = await actionFn();
      await this.deps.clientCache.set(
        this.DEFAULT_TTL,
        "groupBundle",
        groupId,
        newBundle
      );
      this.emitter.emit("invalidateGroup", groupId, newBundle);
      return newBundle;
    } catch (error: any) {
      revertFn?.();
      throw error;
    }
  }

  async likeGroup(groupId: BiomesId, isLiked: boolean) {
    return this.eagerGroupAction(
      groupId,
      (cachedGroup) => {
        const { isLikedByQuerier, numLikes } = cachedGroup;
        if (isLikedByQuerier && !isLiked) {
          cachedGroup.isLikedByQuerier = false;
          cachedGroup.numLikes = numLikes - 1;
        } else if (!isLikedByQuerier && isLiked) {
          cachedGroup.isLikedByQuerier = true;
          cachedGroup.numLikes = numLikes + 1;
        }
        return () => {
          cachedGroup.isLikedByQuerier = isLikedByQuerier;
          cachedGroup.numLikes = numLikes;
        };
      },
      async () => {
        const res = await jsonPost<LikeResponse, LikeRequest>(
          `/api/bundles/group/${groupId}/like`,
          {
            isLiked,
          }
        );
        // Send chat message
        if (isLiked) {
          await this.deps.chatIo.sendMessage("chat", {
            kind: "like",
            documentType: "environment_group",
            documentId: groupId,
          });
        }
        return res.group;
      }
    );
  }

  async warpGroup(group: GroupDetailBundle) {
    return this.eagerGroupAction(
      group.id,
      (cachedGroup) => {
        const { isWarpedByQuerier, numWarps } = cachedGroup;
        if (!isWarpedByQuerier) {
          cachedGroup.isWarpedByQuerier = true;
          return () => {
            cachedGroup.numWarps = numWarps;
            cachedGroup.isWarpedByQuerier = false;
          };
        }
      },
      async () => {
        const { group: newGroup } = await jsonPost<GroupWarpResponse, {}>(
          `/api/bundles/group/${group.id}/warp`,
          {}
        );
        return newGroup;
      }
    );
  }

  async groupBundle(groupId: BiomesId, forceFetch = false) {
    let didCompute = false;
    const ret = await this.deps.clientCache.maybeGetOrCompute(
      !forceFetch,
      this.DEFAULT_TTL,
      "groupBundle",
      groupId,
      async () => {
        didCompute = true;
        try {
          const ret = await fetchGroupBundle(groupId);
          return ret;
        } catch (error) {
          if (error instanceof APIError) {
            return null;
          }

          throw error;
        }
      }
    );

    if (didCompute) {
      this.emitter.emit("invalidateGroup", groupId, ret);
    }
    return ret;
  }

  private leaderboardCacheKey(
    leaderboard: LeaderboardNearbyValuesRequest["leaderboard"],
    window: LeaderboardNearbyValuesRequest["window"],
    order: LeaderboardOrder
  ) {
    return `${leaderboard.kind}:${leaderboard.id}:${window}:${order}`;
  }

  cachedLeaderboardGetAfterLimit() {
    return 8;
  }

  async leaderboardGetAfter(
    leaderboard: RequestLeaderboard,
    window: LeaderboardWindow,
    order: LeaderboardOrder = "DESC",
    score: number | undefined = undefined
  ) {
    let didCompute = false;
    const ret = await this.deps.clientCache.getOrCompute(
      this.DEFAULT_TTL,
      "leaderboardGetAfter",
      this.leaderboardCacheKey(leaderboard, window, order),
      String(score),
      String(this.cachedLeaderboardGetAfterLimit()),
      async () => {
        const response =
          await this.deps.requestBatchers.leaderboardGetAfterRequestBatcher.fetch(
            {
              leaderboard,
              window,
              score,
              order,
              count: this.cachedLeaderboardGetAfterLimit(),
            }
          );

        didCompute = true;
        return response ?? null;
      }
    );

    if (didCompute) {
      this.emitter.emit(
        "invalidateLeaderboardGetAfter",
        leaderboard,
        window,
        order,
        score,
        this.cachedLeaderboardGetAfterLimit(),
        ret
      );
    }

    return ret;
  }

  eagerInvalidateLeaderboard(
    userId: BiomesId,
    leaderboard: LeaderboardNearbyValuesRequest["leaderboard"]
  ) {
    for (const trueWindow of <LeaderboardNearbyValuesRequest["window"][]>[
      "alltime",
      "daily",
      "thisWeek",
    ]) {
      for (const trueOrder of <LeaderboardOrder[]>["ASC", "DESC"]) {
        void this.deps.clientCache.del(
          "leaderboardValue",
          userId,
          this.leaderboardCacheKey(leaderboard, trueWindow, trueOrder)
        );
        void this.deps.clientCache.del(
          "leaderboardGetAfter",
          this.leaderboardCacheKey(leaderboard, trueWindow, trueOrder),
          String(undefined),
          String(this.cachedLeaderboardGetAfterLimit())
        );
      }
    }
  }

  async leaderboardValue(
    leaderboard: RequestLeaderboard,
    window: LeaderboardWindow,
    order: LeaderboardOrder,
    userId: BiomesId
  ) {
    let didCompute = false;
    const ret = await this.deps.clientCache.getOrCompute(
      this.DEFAULT_TTL,
      "leaderboardValue",
      userId,
      this.leaderboardCacheKey(leaderboard, window, order),
      async () => {
        const response =
          await this.deps.requestBatchers.leaderboardGetValuesRequestBatcher.fetch(
            {
              id: userId,
              leaderboard,
              window,
              order,
            }
          );

        didCompute = true;
        return response ?? null;
      }
    );

    if (didCompute) {
      this.emitter.emit(
        "invalidateLeaderboardValue",
        userId,
        leaderboard,
        window,
        order,
        ret
      );
    }

    return ret;
  }

  async eagerPushPostBundle(bundle: FeedPostBundle) {
    await this.deps.clientCache.set(
      this.DEFAULT_TTL,
      "postBundle",
      bundle.id,
      bundle
    );
    this.emitter.emit("invalidatePost", bundle.id, bundle);
  }

  private async eagerPostAction(
    postId: BiomesId,
    eagerFn: (cachedGroup: FeedPostBundle) => RevertFunction | undefined,
    actionFn: () => Promise<FeedPostBundle>
  ) {
    // Eager invalidate
    const [cachedPost, found] = await this.deps.clientCache.get(
      "postBundle",
      postId
    );

    let revertFn: RevertFunction | undefined;
    if (cachedPost && found) {
      revertFn = eagerFn(cachedPost);
      this.emitter.emit("invalidatePost", postId, cachedPost);
    }

    try {
      const newBundle = await actionFn();
      await this.deps.clientCache.set(
        this.DEFAULT_TTL,
        "postBundle",
        postId,
        newBundle
      );
      return newBundle;
    } catch (error: any) {
      revertFn?.();
      throw error;
    }
  }

  async likePost(postId: BiomesId, isLiked: boolean) {
    return this.eagerPostAction(
      postId,
      (cachedPost) => {
        const { isLikedByQuerier, numLikes } = cachedPost;
        if (isLikedByQuerier && !isLiked) {
          cachedPost.isLikedByQuerier = false;
          cachedPost.numLikes = numLikes - 1;
        } else if (!isLikedByQuerier && isLiked) {
          cachedPost.isLikedByQuerier = true;
          cachedPost.numLikes = numLikes + 1;
        }
        return () => {
          cachedPost.isLikedByQuerier = isLikedByQuerier;
          cachedPost.numLikes = numLikes;
        };
      },
      async () => {
        const res = await jsonPost<LikePostResponse, LikePostRequest>(
          `/api/social/like_post`,
          {
            postId: postId,
            isLiked,
          }
        );
        // Send chat message
        if (isLiked) {
          await this.deps.chatIo.sendMessage("chat", {
            kind: "like",
            documentType: "post",
            documentId: postId,
          });
        }
        return res.feedPostBundle;
      }
    );
  }

  async warpPost(post: FeedPostBundle): Promise<WarpPostResponse> {
    const delayed = new Delayed<WarpPostResponse>();
    await this.eagerPostAction(
      post.id,
      (cachedPost) => {
        const { isWarpedByQuerier, numWarps } = cachedPost;
        if (!isWarpedByQuerier) {
          cachedPost.isWarpedByQuerier = true;
          return () => {
            cachedPost.numWarps = numWarps;
            cachedPost.isWarpedByQuerier = false;
          };
        }
      },
      async () => {
        const response = await jsonPost<WarpPostResponse, WarpPostRequest>(
          `/api/social/warp_post`,
          {
            postId: post.id,
          }
        );
        delayed.resolve(response);
        return response.feedPostBundle;
      }
    );
    return delayed.wait();
  }

  async deletePost(postId: BiomesId) {
    await jsonPost<void, DeletePostRequest>(`/api/social/delete_post`, {
      postId: postId,
    });
    await this.deps.clientCache.del("postBundle", postId);
    this.emitter.emit("invalidatePost", postId, null);
  }

  async postBundle(postId: BiomesId, forceFetch = false) {
    let didCompute = false;

    const ret = await this.deps.clientCache.maybeGetOrCompute(
      !forceFetch,
      this.DEFAULT_TTL,
      "postBundle",
      postId,
      async () => {
        didCompute = true;
        const ret = await this.deps.requestBatchers.postRequestBatcher.fetch(
          postId
        );
        return ret ?? null;
      }
    );

    if (didCompute) {
      this.emitter.emit("invalidatePost", postId, ret);
    }
    return ret;
  }

  private async eagerUserAction(
    userId: BiomesId,
    eagerFn: (cachedUserInfo: UserInfoBundle) => RevertFunction | undefined,
    actionFn: () => Promise<UserInfoBundle | undefined>
  ) {
    // Eager invalidate
    const [cachedPost, found] = await this.deps.clientCache.get(
      "userInfoBundle",
      userId
    );

    let revertFn: RevertFunction | undefined;
    if (cachedPost && found) {
      revertFn = eagerFn(cachedPost);
      this.emitter.emit("invalidateUserInfo", userId, cachedPost);
    }

    try {
      const newBundle = await actionFn();
      if (newBundle !== undefined) {
        await this.deps.clientCache.set(
          this.DEFAULT_TTL,
          "userInfoBundle",
          userId,
          newBundle
        );
        this.emitter.emit("invalidateUserInfo", userId, newBundle);
      }
    } catch (error: any) {
      revertFn?.();
      throw error;
    }
  }

  async followUser(userId: BiomesId, isFollow: boolean) {
    return this.eagerUserAction(
      userId,
      (cachedUser) => {
        const { isFollowing } = cachedUser;
        const numFollowers = cachedUser.user.numFollowers;
        if (isFollowing && !isFollow) {
          cachedUser.isFollowing = false;
          cachedUser.user.numFollowers = numFollowers - 1;
        } else if (!isFollowing && isFollow) {
          cachedUser.isFollowing = true;
          cachedUser.user.numFollowers = numFollowers + 1;
        }
        return () => {
          cachedUser.isFollowing = isFollowing;
          cachedUser.user.numFollowers = numFollowers;
        };
      },
      async () => {
        await jsonPost<void, FollowUserRequest>(`/api/social/follow_user`, {
          targetId: userId,
          isFollow,
        });

        // Chat message indicating a follow happens
        if (isFollow) {
          await this.deps.chatIo.sendMessage("chat", {
            kind: "follow",
            targetId: userId,
          });
        }

        // Invalidate followers
        // eslint-disable-next-line prefer-const
        let [cachedFollows, found] = await this.deps.clientCache.get(
          "userFollowedIds",
          this.deps.userId
        );
        if (found && cachedFollows) {
          if (!isFollow && cachedFollows.includes(userId)) {
            cachedFollows = cachedFollows.filter((e) => e !== userId);
            await this.deps.clientCache.set(
              this.DEFAULT_TTL,
              "userFollowedIds",
              this.deps.userId,
              cachedFollows
            );
            this.emitter.emit(
              "invalidateFollowedIds",
              this.deps.userId,
              cachedFollows
            );
          } else if (isFollow && !cachedFollows.includes(userId)) {
            cachedFollows.push(userId);
            await this.deps.clientCache.set(
              this.DEFAULT_TTL,
              "userFollowedIds",
              this.deps.userId,
              cachedFollows
            );
            this.emitter.emit(
              "invalidateFollowedIds",
              this.deps.userId,
              cachedFollows
            );
          }
        }

        return undefined;
      }
    );
  }

  async followedIds(userId?: BiomesId | null) {
    if (!userId) {
      return null;
    }

    let didCompute = false;
    const ret = await this.deps.clientCache.getOrCompute(
      this.DEFAULT_TTL,
      "userFollowedIds",
      userId,
      async () => {
        didCompute = true;
        try {
          const res = await jsonFetch<FollowListResponse>(
            pathWithQuery("/api/social/follow_list", {
              userId,
              direction: "outbound",
              numToFetch: 200,
            })
          );
          return res.users.map((e) => e.id);
        } catch (error) {
          if (error instanceof APIError) {
            return null;
          }
          throw error;
        }
      }
    );

    if (didCompute) {
      this.emitter.emit("invalidateFollowedIds", userId, ret);
    }
    return ret;
  }

  async onlineFollowedIds(userId?: BiomesId | null) {
    if (!userId) {
      return null;
    }

    ok(userId === this.deps.userId, "Online ids only supported for local user");
    const followedIds = await this.followedIds(userId);
    if (!followedIds) {
      return null;
    }

    const ret = [];
    for (const id of followedIds) {
      if (this.deps.table.has(id)) {
        ret.push(id);
      }
    }
    return ret;
  }

  async userInfoBundle(userId?: BiomesId | null, forceFetch = false) {
    if (!userId) {
      return null;
    }
    let didCompute = false;
    const ret = await this.deps.clientCache.maybeGetOrCompute(
      !forceFetch,
      this.DEFAULT_TTL,
      "userInfoBundle",
      userId,
      async () => {
        didCompute = true;
        try {
          const bundle =
            await this.deps.requestBatchers.userInfoBundleRequestBatcher.fetch(
              userId
            );
          if (!bundle) {
            return null;
          }
          await this.deps.clientCache.set(
            this.DEFAULT_TTL,
            "userInfoByName",
            (bundle.user.username ?? String(userId)).toLowerCase(),
            bundle
          );
          return bundle;
        } catch (error) {
          if (error instanceof APIError) {
            return null;
          }
          throw error;
        }
      }
    );

    if (didCompute) {
      this.emitter.emit("invalidateUserInfo", userId, ret);
    }
    return ret;
  }

  async autocompleteUserName(prefix: string): Promise<UserInfoBundle[]> {
    const bundles = await this.deps.clientCache.getByPrefix(
      "userInfoByName",
      prefix.toLowerCase()
    );
    bundles.filter((bundle) => bundle && bundle.user.username);
    return bundles as UserInfoBundle[];
  }

  async resolveUserNameOrId(usernameOrId: string) {
    const id = safeParseBiomesId(usernameOrId);
    if (id) {
      return id;
    }
    return (await this.resolveUserName(usernameOrId))?.user.id;
  }

  async resolveUserName(username: string) {
    let didCompute = false;
    const bundle = await this.deps.clientCache.getOrCompute(
      this.DEFAULT_TTL,
      "userInfoByName",
      username.toLowerCase(),
      async () => {
        didCompute = true;
        try {
          const bundle = await fetchUserInfoBundleByUsername(username);
          await this.deps.clientCache.set(
            this.DEFAULT_TTL,
            "userInfoBundle",
            bundle.user.id,
            bundle
          );
          return bundle;
        } catch (error: any) {
          if (isAPIErrorCode("not_found", error)) {
            return null;
          }
          throw error;
        }
      }
    );
    if (didCompute && bundle) {
      this.emitter.emit("invalidateUserInfo", bundle.user.id, bundle);
    }
    return bundle;
  }

  async inviteCodes(userId: BiomesId) {
    ok(
      userId === this.deps.userId,
      "Invite Codes only supported for local user"
    );
    let didCompute = false;
    const codes = await this.deps.clientCache.getOrCompute(
      this.DEFAULT_TTL,
      "inviteCodes",
      userId,
      async () => {
        didCompute = true;
        const response = await jsonFetch<InviteCodesResponse>(
          "/api/user/invite_codes"
        );
        await this.deps.clientCache.set(
          this.DEFAULT_TTL,
          "inviteCodes",
          userId,
          response.inviteCodes
        );

        return response.inviteCodes;
      }
    );

    if (didCompute && codes) {
      this.emitter.emit("invalidateInviteCodes", userId, codes);
    }
    return codes;
  }
}

export async function loadSocialManager(
  loader: RegistryLoader<ClientContext>
): Promise<SocialManager> {
  const deps = await loader.getAll(
    "userId",
    "clientCache",
    "chatIo",
    "table",
    "requestBatchers",
    "gardenHose"
  );
  return new SocialManager(deps);
}
