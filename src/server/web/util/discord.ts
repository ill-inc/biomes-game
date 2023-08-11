import { resolveAssetUrlUntyped } from "@/galois/interface/asset_paths";
import type { ForeignAccountProfile } from "@/server/shared/auth/types";
import type { SecretKey } from "@/server/shared/secrets";
import { getSecret } from "@/server/shared/secrets";
import type { BDB } from "@/server/shared/storage";
import type { WebServerContext } from "@/server/web/context";
import { feedPostById } from "@/server/web/db/social";
import type {
  FirestoreFeedPost,
  FirestoreUser,
  WithId,
} from "@/server/web/db/types";
import {
  fetchSingleUserBundleById,
  fetchUserBundlesByIds,
} from "@/server/web/db/users_fetch";
import {
  absoluteBucketURL,
  absoluteWebServerURL,
  googleErrorConsoleURL,
  observerURLForEntityId,
  postPublicPermalink,
  userPublicPermalink,
} from "@/server/web/util/urls";
import { staticUrlForAttribute } from "@/shared/bikkie/schema/binary";
import type { Item } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import type { FeedPostBundle, UserBundle } from "@/shared/types";
import { jsonPostAnyResponse } from "@/shared/util/fetch_helpers";
import { imageUrlForSize } from "@/shared/util/urls";
import { photoFeaturingString } from "@/shared/util/view_helpers";
import type {
  APIEmbedAuthor,
  APIEmbedThumbnail,
  MessageCreateOptions,
} from "discord.js";
import type { IncomingMessage } from "http";
import { UAParser } from "ua-parser-js";

export interface DiscordWebhook {
  username?: string;
  avatar_url?: string;
  content?: string;

  embeds?: {
    author?: {
      name?: string;
      url?: string;
      icon_url?: string;
    };
    title?: string;
    url?: string;
    description?: string;
    color?: number;
    thumbnail?: {
      url: string;
    };
    image?: {
      url: string;
    };

    footer?: {
      text?: string;
      icon_url?: string;
    };
  }[];
}

export type DiscordHookType =
  | "photo"
  | "new_users"
  | "environment_group"
  | "social"
  | "badge"
  | "deploy"
  | "user_report"
  | "review";
export type DiscordHookConfig = { [K in DiscordHookType]: SecretKey[] };

export function getDiscordWebhookURLs(type: DiscordHookType): string[] {
  if (!CONFIG.discordHooksEnabled) {
    return [];
  }

  if (process.env.NODE_ENV !== "production") {
    return [getSecret("discord-test-webhook-url")];
  }

  const ret: string[] = [];
  const secretKeys = CONFIG.discordHookConfig[type] ?? [];
  for (const key of secretKeys) {
    const v = getSecret(key);
    if (typeof v === "string") {
      ret.push(v);
    }
  }
  return ret;
}

export async function postToDiscord(
  type: DiscordHookType,
  hook: DiscordWebhook
) {
  await Promise.all(
    getDiscordWebhookURLs(type).map((url) =>
      jsonPostAnyResponse<DiscordWebhook>(url, hook)
    )
  );
}

export async function postWakeUpScreenshotToDiscord(
  user: WithId<FirestoreUser>,
  screenshotURL: string
) {
  await postToDiscord("new_users", {
    content: `${user.username} woke up with this view`,
    embeds: [
      {
        image: {
          url: screenshotURL,
        },
      },
    ],
  });
}

export async function postUserReportToDiscord(
  user: WithId<FirestoreUser>,
  issueId: string | undefined,
  title: string,
  screenshotURL: string | undefined
) {
  const viewString = issueId
    ? `[view](https://linear.app/ill-inc/issue/${issueId})`
    : "(Unable to create linear task)";
  await postToDiscord("user_report", {
    content: `${user.username} just made a report: ${title} ${viewString}`,
    embeds: !screenshotURL
      ? []
      : [
          {
            image: {
              url: screenshotURL,
            },
          },
        ],
  });
}

export async function postJoinObserverLinkToDiscord(
  user: WithId<FirestoreUser>,
  foreignAuthProfile: ForeignAccountProfile,
  req: IncomingMessage
) {
  const userAgent = req.headers["user-agent"];
  const parsed = new UAParser(userAgent);
  const cvalsURL = absoluteWebServerURL(`/admin/user/${user.id}/cvals`);
  const adminURL = absoluteWebServerURL(`/admin/user/${user.id}`);
  const googleConsoleURL = googleErrorConsoleURL(user.id);
  const observerURL = absoluteWebServerURL(observerURLForEntityId(user.id));
  const go = {
    content: `${
      foreignAuthProfile.username ?? "user"
    } just signed up for Biomes (${foreignAuthProfile.email}) via ${
      foreignAuthProfile.provider
    } [watch their first steps](<${observerURL}>) | [CVALS](<${cvalsURL}>) | [ERRORS](<${googleConsoleURL}>) | [ADMIN](<${adminURL}>) [browser=${
      parsed.getBrowser().name ?? "unknown browser"
    }, os=${parsed.getOS().name ?? "unknown os"}, device=${
      parsed.getDevice().type ?? "unknown device"
    }, cpu=${parsed.getCPU().architecture ?? "unknown cpu"}]`,
  };
  await postToDiscord("new_users", go);
}

export async function postFollowToDiscord(
  context: WebServerContext,
  followerId: BiomesId,
  targetId: BiomesId
) {
  const [follower, target] = await fetchUserBundlesByIds(
    context.db,
    followerId,
    targetId
  );

  if (!follower || !target) {
    return;
  }

  return postToDiscord("social", {
    username: "Biomes",
    content: `[${follower.username}](<${absoluteWebServerURL(
      userPublicPermalink(follower.id, follower.username)
    )}>) followed [${target.username}](<${absoluteWebServerURL(
      userPublicPermalink(target.id, target.username)
    )}>)`,
  });
}

export async function postLikeToDiscord(
  context: WebServerContext,
  likerId: BiomesId,
  feedPost: WithId<FirestoreFeedPost>
) {
  if (!feedPost.media?.length) {
    return;
  }

  const [liker, author] = await fetchUserBundlesByIds(
    context.db,
    likerId,
    feedPost.userId
  );
  if (!liker || !author) {
    return;
  }

  const media = feedPost.media[0];

  return postToDiscord("social", {
    username: "Biomes",
    content: `[${liker.username}](<${absoluteWebServerURL(
      userPublicPermalink(liker.id, liker.username)
    )}>) liked [${author.username}](<${absoluteWebServerURL(
      userPublicPermalink(author.id, author.username)
    )}>)'s [photo${spaceQuoteIfNonNullish(
      media.caption
    )}](<${absoluteWebServerURL(postPublicPermalink(feedPost.id))}>)`,
  });
}

function spaceQuoteIfNonNullish(v?: string) {
  if (v) {
    return ` "${v}"`;
  }
  return "";
}

export async function postCommentToDiscord(
  context: WebServerContext,
  commenterId: BiomesId,
  feedPostId: BiomesId,
  comment: string
) {
  const feedPost = await feedPostById(context.db, feedPostId);
  if (!feedPost || !feedPost.media?.length) {
    return;
  }

  const [liker, author] = await fetchUserBundlesByIds(
    context.db,
    commenterId,
    feedPost.userId
  );
  if (!liker || !author) {
    return;
  }

  const media = feedPost.media[0];

  return postToDiscord("social", {
    username: "Biomes",
    content: `[${liker.username}](<${absoluteWebServerURL(
      userPublicPermalink(liker.id, liker.username)
    )}>) commented on [${author.username}](<${absoluteWebServerURL(
      userPublicPermalink(author.id, author.username)
    )}>)'s [photo${spaceQuoteIfNonNullish(
      media.caption
    )}](<${absoluteWebServerURL(
      postPublicPermalink(feedPost.id)
    )}>): ${comment}`,
  });
}

export async function postPhotoToDiscord(
  context: WebServerContext,
  feedPostBundle: FeedPostBundle
) {
  const title = feedPostBundle.caption ?? "A Biomes Photo";
  const featuringString = photoFeaturingString(feedPostBundle);

  return postToDiscord("photo", {
    username: "Biomes",
    embeds: [
      {
        author: {
          name: `${feedPostBundle.author.username} snapped a photo${
            featuringString.length > 0 ? " " + featuringString : ""
          }`,
          icon_url: feedPostBundle.author.profilePicImageUrls.webp_320w!,
          url: absoluteWebServerURL(
            userPublicPermalink(
              feedPostBundle.author.id,
              feedPostBundle.author.username
            )
          ),
        },
        image: {
          url: feedPostBundle.imageUrls.webp_1280w!,
        },
        title,
        url: absoluteWebServerURL(postPublicPermalink(feedPostBundle.id)),
      },
    ],
  });
}

export function doReplacements(
  title: string,
  senderBundle: UserBundle | undefined
) {
  return title.replace(/\{username\}/g, senderBundle?.username ?? "Someone");
}

export function formatAuthorEmbed(
  author: UserBundle | undefined
): APIEmbedAuthor | undefined {
  if (!author) {
    return;
  }

  return {
    name: author.username ?? "user",
    icon_url: author.profilePicImageUrls.webp_320w!,
    url: absoluteWebServerURL(userPublicPermalink(author.id, author.username)),
  };
}

export function formatPostThumbnail(
  post: FirestoreFeedPost | undefined
): APIEmbedThumbnail | undefined {
  const media = post?.media?.[0];
  if (!media || !media.cloudImageLocations.webp_320w) {
    return;
  }

  return {
    url: absoluteBucketURL(
      media.cloudBucket,
      imageUrlForSize("thumbnail", media.cloudImageLocations) ??
        media.cloudImageLocations.webp_320w
    ),
  };
}

export async function fetchPostThumbnail(
  db: BDB,
  id?: BiomesId
): Promise<APIEmbedThumbnail | undefined> {
  if (!id) {
    return undefined;
  }

  const post = await feedPostById(db, id);
  return formatPostThumbnail(post ?? undefined);
}

export async function simpleUserTextNotification(
  text: string
): Promise<MessageCreateOptions> {
  return { embeds: [{ title: text }] };
}

export async function simpleUserNotification(
  db: BDB,
  title: string,
  id?: BiomesId
): Promise<MessageCreateOptions | undefined> {
  if (!id) {
    return;
  }

  const userBundle = await fetchSingleUserBundleById(db, id);
  return {
    embeds: [
      {
        title: doReplacements(title, userBundle),
        url: absoluteWebServerURL(userPublicPermalink(id)),
        author: formatAuthorEmbed(userBundle),
      },
    ],
  };
}

export async function simpleItemThumbnailUserNotification(
  db: BDB,
  title: string,
  item?: Item,
  id?: BiomesId
): Promise<MessageCreateOptions | undefined> {
  if (!id) {
    return;
  }

  let iconUrl: string | undefined;
  if (item?.icon) {
    iconUrl = staticUrlForAttribute(item.icon);
  } else if (item?.galoisIcon) {
    iconUrl = resolveAssetUrlUntyped(`icons/${item.galoisIcon}`);
  }

  const userBundle = await fetchSingleUserBundleById(db, id);
  return {
    embeds: [
      {
        title: doReplacements(title, userBundle),
        url: absoluteWebServerURL(userPublicPermalink(id)),
        author: formatAuthorEmbed(userBundle),
        image: iconUrl
          ? {
              url: iconUrl,
            }
          : undefined,
      },
    ],
  };
}

export async function simplePostNotification(
  db: BDB,
  title: string,
  postId: BiomesId,
  senderId?: BiomesId
): Promise<MessageCreateOptions | undefined> {
  if (!postId) {
    return;
  }

  const userBundle = senderId
    ? await fetchSingleUserBundleById(db, senderId)
    : undefined;
  return {
    embeds: [
      {
        title: doReplacements(title, userBundle),
        url: absoluteWebServerURL(postPublicPermalink(postId)),
        author: formatAuthorEmbed(userBundle),
        image: await fetchPostThumbnail(db, postId),
      },
    ],
  };
}
