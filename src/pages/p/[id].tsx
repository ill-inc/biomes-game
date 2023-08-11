import { Img } from "@/client/components/system/Img";
import { sanitizeServerSideProps } from "@/client/util/next_helpers";
import StaticPage from "@/pages/static-page";
import type {
  InferWebServerSidePropsType,
  WebServerServerSidePropsContext,
} from "@/server/web/context";
import { fetchFeedPostBundleById } from "@/server/web/db/social";
import {
  absoluteWebServerURL,
  postPublicPermalink,
  userPublicPermalink,
} from "@/server/web/util/urls";
import { parseBiomesId } from "@/shared/ids";
import type { FeedPostBundle } from "@/shared/types";
import {
  imageUrlForSize,
  ogMetadataForImage,
  profilePicThumbnailUrl,
} from "@/shared/util/urls";
import { epochMsToDuration } from "@/shared/util/view_helpers";
import type { GetServerSidePropsResult } from "next";
import React from "react";

type PostPageProps = {
  post: FeedPostBundle;
};

export const getServerSideProps = async (
  context: WebServerServerSidePropsContext
): Promise<GetServerSidePropsResult<PostPageProps>> => {
  const postId = parseBiomesId(context.params?.["id"]);
  const { db, worldApi } = context.req.context;

  const post = await fetchFeedPostBundleById(db, worldApi, postId);
  if (!post) {
    return {
      notFound: true,
    };
  }

  return {
    props: sanitizeServerSideProps({
      post,
    }),
  };
};

export const PostPage: React.FunctionComponent<
  InferWebServerSidePropsType<typeof getServerSideProps>
> = ({ post }) => {
  return (
    <StaticPage
      title={`Biomes | ${post.author.username}'s Photo`}
      openGraphMetadata={{
        ...ogMetadataForImage(post.imageUrls ?? {}),
        description: post.caption
          ? post.caption
          : `A photo taken in Biomes by ${post.author.username}`,
        title: `Biomes | ${post.author.username}'s Photo`,
        url: absoluteWebServerURL(postPublicPermalink(post.id)),
      }}
    >
      <section className="permalink">
        <div className="content">
          <div className="post-attribution">
            <div className="post-author">
              <a
                href={userPublicPermalink(
                  post?.author.id,
                  post.author.username
                )}
              >
                <img src={profilePicThumbnailUrl(post?.author.id)} />
              </a>

              <a
                href={userPublicPermalink(
                  post?.author.id,
                  post?.author.username
                )}
              >
                {post?.author.username}
              </a>
            </div>

            <div className="post-date secondary-gray">
              {epochMsToDuration(post?.createMs)}
            </div>
          </div>

          <Img
            src={imageUrlForSize("big", post.imageUrls)}
            onClick={() => {}}
            className="preview"
          />
        </div>
      </section>
    </StaticPage>
  );
};

export default PostPage;
