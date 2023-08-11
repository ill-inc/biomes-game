import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { Confirm } from "@/client/components/modals/Confirm";
import { MiniPhoneLikersList } from "@/client/components/social/MiniPhoneLikersList";
import {
  MiniPhoneUserAvatarLink,
  MiniPhoneUserLink,
} from "@/client/components/social/MiniPhoneUserLink";
import { WarpersListView } from "@/client/components/social/MiniPhoneWarpersList";
import { PhotoFeaturingStringLinked } from "@/client/components/social/PhotoFeaturingStringLinked";
import { ReportFlow } from "@/client/components/social/ReportFlow";
import { ActionButton } from "@/client/components/system/ActionButton";
import { DialogInputWithButton } from "@/client/components/system/DialogInputWithButton";
import { Img } from "@/client/components/system/Img";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { MinigamePlayButton } from "@/client/components/system/MinigamePlayButton";
import { WarpButton } from "@/client/components/system/WarpButton";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { MiniPhoneMoreItem } from "@/client/components/system/mini_phone/MiniPhoneMoreItem";
import { MiniPhoneScreenMoreMenu } from "@/client/components/system/mini_phone/MiniPhoneScreen";
import { MiniPhoneSubModal } from "@/client/components/system/mini_phone/MiniPhoneSubModal";
import { LeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneActionSheet } from "@/client/components/system/mini_phone/split_pane/PaneActionSheet";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { RightBarItem } from "@/client/components/system/mini_phone/split_pane/RightBarItem";
import { RightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { useShowingTemporaryURL } from "@/client/util/hooks";
import { useCachedPostBundle } from "@/client/util/social_manager_hooks";
import type {
  CommentPostRequest,
  CommentPostResponse,
} from "@/pages/api/social/comment_post";
import {
  absoluteWebServerURL,
  postPublicPermalink,
} from "@/server/web/util/urls";
import type { BiomesId } from "@/shared/ids";
import pluralize from "@/shared/plural";
import type { FeedPostBundle, UserBundle } from "@/shared/types";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { displayUsername } from "@/shared/util/helpers";
import { imageUrlForSize } from "@/shared/util/urls";
import { epochMsToDuration } from "@/shared/util/view_helpers";
import React, { useCallback, useEffect, useState } from "react";

export const PreviewComment: React.FunctionComponent<{
  comment: string;
  user: UserBundle;
}> = ({ comment, user }) => {
  return (
    <div className="attribution-container">
      <MiniPhoneUserAvatarLink user={user} />
      <div className="owner">
        <MiniPhoneUserLink userId={user.id}>
          {displayUsername(user.username)}
        </MiniPhoneUserLink>
        <div className="description">{comment}</div>
      </div>
    </div>
  );
};

export const MiniPhonePostDetailPage: React.FunctionComponent<{
  postId: BiomesId;
}> = ({ postId }) => {
  const { socialManager, userId, gardenHose } = useClientContext();
  const post = useCachedPostBundle(socialManager, postId);
  const [error, setError] = useError();
  const [likeButtonDisabled, setLikeButtonDisabled] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [copyLinkText, setCopyLinkText] = useState("Copy Link to Post");
  const [showMore, setShowMore] = useState(false);
  const context = useExistingMiniPhoneContext();
  const [showLikerList, setShowLikerList] = useState(false);
  const [showWarpersList, setShowWarpersList] = useState(false);
  const [commentFieldValue, setCommentFieldValue] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    gardenHose.publish({
      kind: "display_pdp",
    });

    return () => {
      gardenHose.publish({
        kind: "hide_pdp",
      });
    };
  }, []);

  const doLike = useCallback(async (isLiked: boolean) => {
    setLikeButtonDisabled(true);
    try {
      await socialManager.likePost(postId, isLiked);
    } catch (error) {
      setError(error);
    } finally {
      setLikeButtonDisabled(false);
    }
  }, []);

  const makeComment = useCallback(
    async (post: FeedPostBundle, commentText: string) => {
      try {
        setIsCommenting(true);
        await jsonPost<CommentPostResponse, CommentPostRequest>(
          "/api/social/comment_post",
          {
            comment: commentText,
            documentId: post.id,
            documentType: "post",
            to: post.author.id,
            nonce: Math.random(),
          }
        );
        await socialManager.postBundle(postId, true);
        setCommentFieldValue("");
      } catch (error: any) {
        setError(error);
      } finally {
        setIsCommenting(false);
      }
    },
    [post]
  );

  const doDelete = useCallback(async () => {
    setLikeButtonDisabled(true);
    try {
      await socialManager.deletePost(postId);
      context.close();
    } catch (error) {
      setError(error);
    }
  }, []);

  useShowingTemporaryURL(postPublicPermalink(postId));

  return (
    <SplitPaneScreen>
      <ScreenTitleBar title="Photo">
        <RightBarItem>
          <MiniPhoneMoreItem onClick={() => setShowMore(!showMore)} />
        </RightBarItem>
      </ScreenTitleBar>

      <LeftPane>
        {!post ? (
          <>
            <MaybeError error={error} />
            Loading
          </>
        ) : (
          <>
            <div className="padded-view">
              <div className="comments-list">
                <MaybeError error={error} />
                <div className="attribution-container">
                  <MiniPhoneUserAvatarLink user={post.author} />
                  <div className="owner">
                    <div className="attribution">
                      <MiniPhoneUserLink userId={post.author.id}>
                        {displayUsername(post.author.username)}
                      </MiniPhoneUserLink>
                      {` `}
                      <PhotoFeaturingStringLinked
                        post={post}
                        linkType="inline"
                      />
                    </div>
                    <div className="description">
                      {post.caption && <>{post.caption}</>}
                      <div className="location-timestamp">
                        <div className="timestamp">
                          {epochMsToDuration(post.createMs)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {post.commentBundle?.comments?.map((c) => (
                  <PreviewComment
                    comment={c.comment}
                    user={c.user}
                    key={c.commentId}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        <PaneBottomDock>
          {post && (
            <>
              <div className="action-container">
                <div className="actions">
                  <ActionButton
                    type="like"
                    tooltip="Like"
                    disabled={likeButtonDisabled}
                    filled={post?.isLikedByQuerier}
                    onClick={() => {
                      void doLike(!post?.isLikedByQuerier);
                    }}
                  />

                  {post?.allowWarping && (
                    <WarpButton
                      buttonType="action"
                      documentType="post"
                      document={post}
                    />
                  )}
                  {post?.minigame && (
                    <MinigamePlayButton
                      buttonType="action"
                      minigame={post.minigame}
                    />
                  )}
                </div>
                <div className="countables-container">
                  <div className="likes">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowLikerList(true);
                      }}
                    >
                      {pluralize("Like", post?.numLikes ?? 0, true)}
                    </a>
                  </div>
                  {post?.allowWarping && (
                    <div className="warps">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowWarpersList(true);
                        }}
                      >
                        {pluralize("Warp", post?.numWarps ?? 0, true)}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <DialogInputWithButton
                formClassName="mt-1"
                value={commentFieldValue}
                onSubmit={async () => {
                  void makeComment(post, commentFieldValue);
                }}
                onChange={(e) => {
                  setCommentFieldValue(e.target.value);
                }}
                showSaveButton={commentFieldValue != undefined}
                disabledSubmit={isCommenting}
                buttonText={isCommenting ? "Posting" : "Post"}
              />
            </>
          )}
        </PaneBottomDock>

        <PaneActionSheet
          showing={showLikerList}
          title="Likers"
          onClose={() => setShowLikerList(false)}
        >
          <MiniPhoneLikersList documentId={postId} documentType={"post"} />
        </PaneActionSheet>

        <PaneActionSheet
          showing={showWarpersList}
          title="Warpers"
          onClose={() => setShowWarpersList(false)}
        >
          <WarpersListView documentId={postId} documentType={"post"} />
        </PaneActionSheet>
      </LeftPane>
      <RightPane type="center">
        {!post ? (
          <>Loading...</>
        ) : (
          <Img
            src={imageUrlForSize("big", post.imageUrls)}
            className="preview pixelate"
          />
        )}
      </RightPane>

      <MiniPhoneScreenMoreMenu
        items={[
          {
            label: copyLinkText,
            onClick: () => {
              if (post) {
                const url = absoluteWebServerURL(postPublicPermalink(post.id));
                void navigator.clipboard.writeText(url);
                setCopyLinkText("Copied");
                setTimeout(() => {
                  setCopyLinkText("Copy Link to Post");
                  setShowMore(false);
                }, 500);
              }
            },
          },
          post?.userId !== userId
            ? {
                label: "Delete",
                type: "destructive",
                onClick: () => {
                  setShowDeleteMenu(true);
                  setShowMore(false);
                },
              }
            : {
                label: "Report",
                type: "destructive",
                onClick: () => {
                  setShowReportMenu(true);
                  setShowMore(false);
                },
              },
        ]}
        showing={showMore}
      />
      {showDeleteMenu && (
        <MiniPhoneSubModal
          onDismissal={() => {
            setShowDeleteMenu(false);
            context.close();
          }}
        >
          <Confirm
            title="Confirm Deletion"
            confirmText="Delete"
            onConfirm={() => {
              setShowDeleteMenu(false);
              void doDelete();
            }}
            onClose={() => {
              setShowDeleteMenu(false);
            }}
          >
            Would you really like to delete this photo?
          </Confirm>
        </MiniPhoneSubModal>
      )}
      {showReportMenu && (
        <MiniPhoneSubModal
          onDismissal={() => {
            setShowReportMenu(false);
          }}
        >
          <ReportFlow
            target={{
              kind: "post",
              targetId: postId,
            }}
            onClose={() => {
              setShowReportMenu(false);
            }}
          />
        </MiniPhoneSubModal>
      )}
    </SplitPaneScreen>
  );
};
