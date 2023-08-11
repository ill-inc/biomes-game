import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import type { GroupDetailBundle } from "@/shared/types";
import { zFeedPostBundle, zUserBundle } from "@/shared/types";
import { jsonFetch, jsonPost } from "@/shared/util/fetch_helpers";
import { pathWithQuery } from "@/shared/util/helpers";
import { z } from "zod";

export const zResolveUsernameResponse = z.object({
  isFollowing: z.boolean(),
  user: zUserBundle,
});

export type ResolveUsernameResponse = z.infer<typeof zResolveUsernameResponse>;

export const zPostResponse = z.object({
  post: zFeedPostBundle,
});

export type PostResponse = z.infer<typeof zPostResponse>;

export const zUserInfoBundle = z.object({
  isFollowing: z.boolean(),
  user: zUserBundle,
});

export type UserInfoBundle = z.infer<typeof zUserInfoBundle>;

export const zUserInfoBatchResponse = zUserInfoBundle.nullable().array();
export type UserInfoBatchResponse = z.infer<typeof zUserInfoBatchResponse>;

export const zPostBatchResponse = z.object({
  posts: zFeedPostBundle.optional().array(),
});
export type PostBatchResponse = z.infer<typeof zPostBatchResponse>;

export const zPostBatchRequest = z.object({
  ids: z.array(zBiomesId).max(2000),
});
export type PostBatchRequest = z.infer<typeof zPostBatchRequest>;

export async function fetchUserInfoBundle(userId: BiomesId) {
  return jsonFetch<UserInfoBundle>(
    pathWithQuery("/api/social/user_info", {
      userId,
    })
  );
}

export async function fetchUserInfoBundles(userIds: BiomesId[]) {
  return jsonFetch<UserInfoBatchResponse>(
    pathWithQuery("/api/social/user_info_batch", {
      ids: userIds.join(","),
    })
  );
}

export async function fetchUserInfoBundleByUsername(username: string) {
  return jsonFetch<ResolveUsernameResponse>(
    pathWithQuery("/api/social/resolve_username", {
      username,
    })
  );
}

export async function fetchPostBundle(postId: BiomesId) {
  return jsonFetch<PostResponse>(
    pathWithQuery("/api/social/post", {
      postId: postId,
    })
  );
}

export async function fetchPostBundles(postIds: BiomesId[]) {
  return jsonPost<PostBatchResponse, PostBatchRequest>(
    "/api/social/post_batch",
    {
      ids: postIds,
    }
  );
}

export async function fetchGroupBundle(groupId: BiomesId) {
  return jsonFetch<GroupDetailBundle>(`/api/bundles/group/${groupId}/detail`);
}
