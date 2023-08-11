import { Img } from "@/client/components/system/Img";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { MaybeLoadMoreRow } from "@/client/components/system/MaybeLoadMoreRow";
import { SegmentedControl } from "@/client/components/system/SegmentedControl";
import { sanitizeServerSideProps } from "@/client/util/next_helpers";
import type { UserPhotosResponse } from "@/pages/api/social/user_photos";
import StaticPage from "@/pages/static-page";
import type {
  InferWebServerSidePropsType,
  WebServerServerSidePropsContext,
} from "@/server/web/context";
import { fetchUserFeed } from "@/server/web/db/social";
import {
  fetchUserBundles,
  findUniqueByUsername,
} from "@/server/web/db/users_fetch";
import {
  absoluteWebServerURL,
  postPublicPermalink,
  userPublicPermalink,
} from "@/server/web/util/urls";
import type { PostsFeed, UserBundle } from "@/shared/types";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import { pathWithQuery } from "@/shared/util/helpers";
import {
  imageUrlForSize,
  ogMetadataForImage,
  profilePicThumbnailUrl,
} from "@/shared/util/urls";
import { ok } from "assert";
import type { GetServerSidePropsResult } from "next";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { BottomScrollListener } from "react-bottom-scroll-listener";

const pageTabs = ["photos"] as const;
type PageTab = (typeof pageTabs)[number];

type UserPageProps = {
  userBundle: UserBundle;
  initialPostsFeed: PostsFeed;
};

export const getServerSideProps = async (
  context: WebServerServerSidePropsContext
): Promise<GetServerSidePropsResult<UserPageProps>> => {
  const [username] = context.params?.["username"] ?? [];
  ok(username && typeof username === "string");

  const { db, worldApi } = context.req.context;
  const userRecord = await findUniqueByUsername(db, username);
  if (!userRecord) {
    return {
      notFound: true,
    };
  }

  const [userBundle] = await fetchUserBundles(db, userRecord);
  if (!userBundle) {
    return {
      notFound: true,
    };
  }

  const postsFeed = await fetchUserFeed(db, worldApi, userBundle.id);
  return {
    props: sanitizeServerSideProps({
      userBundle: JSON.parse(JSON.stringify(userBundle)),
      initialPostsFeed: JSON.parse(JSON.stringify(postsFeed)),
    }),
  };
};

export const UserPage: React.FunctionComponent<
  InferWebServerSidePropsType<typeof getServerSideProps>
> = ({ userBundle, initialPostsFeed }) => {
  const router = useRouter();
  const [username, tab] = router.query.username ?? [];
  const startIndex = pageTabs.indexOf(tab as PageTab);
  const [profileTabIndex, setProfileTabIndex] = useState(
    startIndex !== -1 ? startIndex : 0
  );

  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [postsFeed, setPostsFeed] = useState(initialPostsFeed);
  const [error, setError] = useError();

  const loadMorePosts = useCallback(async () => {
    if (!postsFeed.pagingToken || loadingMorePosts) {
      return;
    }

    setLoadingMorePosts(true);
    try {
      const userPhotos = await jsonFetch<UserPhotosResponse>(
        pathWithQuery(`/api/social/user_photos`, {
          userId: userBundle.id,
          pagingToken: postsFeed.pagingToken,
        })
      );
      setPostsFeed({
        posts: [...postsFeed.posts, ...userPhotos.postsFeed.posts],
        pagingToken: userPhotos.postsFeed.pagingToken,
      });
    } catch (error: any) {
      setError(error);
    } finally {
      setLoadingMorePosts(false);
    }
  }, [postsFeed, loadingMorePosts]);

  return (
    <StaticPage
      title={`Biomes | ${userBundle.username}`}
      openGraphMetadata={{
        ...ogMetadataForImage(userBundle.profilePicImageUrls ?? {}),
        description: `${userBundle.username} the intrepid Biomes swashbuckler`,
        title: `Biomes | ${userBundle.username}`,
        url: absoluteWebServerURL(
          userPublicPermalink(userBundle.id, userBundle.username)
        ),
      }}
    >
      <div className="permalink">
        <div className="profile-info">
          <img className="avatar" src={profilePicThumbnailUrl(userBundle.id)} />
          <div className="font-xlarge">{userBundle.username}</div>
          <div className="metrics">
            <div className="metric">
              <div className="font-large">{userBundle.numPhotos}</div>
              <div>Photos</div>
            </div>
            <div className="metric">
              <div className="font-large">{userBundle.numFollowers}</div>
              <div>Followers</div>
            </div>
            <div className="metric">
              <div className="font-large">{userBundle.numFollowing}</div>
              <div>Following</div>
            </div>
          </div>
        </div>
        <div className="content">
          <MaybeError error={error} />
          <div className="profile-tabs">
            <SegmentedControl
              index={profileTabIndex}
              onClick={(index) => {
                setProfileTabIndex(index);
                void router.push(
                  router.pathname,
                  `/u/${username}/${pageTabs.at(index)}`,
                  { shallow: true }
                );
              }}
              items={["Photos"]}
            />
          </div>
          {profileTabIndex == 0 && (
            <div className="posts-grid">
              {postsFeed.posts.map((photo) => (
                <div
                  className="thumbnail-wrapper link"
                  key={photo.id}
                  onClick={(ev) => {
                    ev.preventDefault();
                    void router.push(postPublicPermalink(photo.id));
                  }}
                >
                  <Img
                    src={imageUrlForSize("grid", photo.imageUrls)}
                    className="thumbnail"
                  />
                </div>
              ))}
              <MaybeLoadMoreRow
                canLoadMore={!!postsFeed.pagingToken}
                loading={loadingMorePosts}
                onLoadMore={loadMorePosts}
              />
            </div>
          )}
          <BottomScrollListener
            onBottom={() => {
              void loadMorePosts();
            }}
          />
        </div>
      </div>
    </StaticPage>
  );
};

export default UserPage;
