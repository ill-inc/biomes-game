import { userPublicPermalink } from "@/server/web/util/urls";
import type { FeedPostBundle } from "@/shared/types";
import { imageUrlForSize, profilePicThumbnailUrl } from "@/shared/util/urls";
import { epochMsToDuration } from "@/shared/util/view_helpers";
import { Img } from "@react-email/img";

export const SimplePermalink: React.FunctionComponent<{
  post: FeedPostBundle;
}> = ({ post }) => {
  return (
    <section className="permalink">
      <div className="content">
        <div className="post-attribution">
          <div className="post-author">
            <a
              href={userPublicPermalink(post?.author.id, post.author.username)}
            >
              <img src={profilePicThumbnailUrl(post?.author.id)} />
            </a>

            <a
              href={userPublicPermalink(post?.author.id, post?.author.username)}
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
  );
};
