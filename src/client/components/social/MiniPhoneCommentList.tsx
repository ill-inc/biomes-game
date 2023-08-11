import {
  MiniPhoneUserAvatarLink,
  MiniPhoneUserLink,
} from "@/client/components/social/MiniPhoneUserLink";
import type { SocialMiniPhonePayload } from "@/client/components/social/types";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { MaybeGridSpinner } from "@/client/components/system/MaybeGridSpinner";
import { MaybeLoadMoreRow } from "@/client/components/system/MaybeLoadMoreRow";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import {
  MiniPhoneDialog,
  MiniPhoneDialogButtons,
  MiniPhoneDialogContent,
} from "@/client/components/system/mini_phone/MiniPhoneDialog";
import {
  MiniPhoneScreen,
  MiniPhoneScreenContent,
  MiniPhoneScreenTitle,
} from "@/client/components/system/mini_phone/MiniPhoneScreen";
import type { KeyCode } from "@/client/game/util/keyboard";
import type { CommentListResponse } from "@/pages/api/social/comment_list";
import type {
  CommentPostRequest,
  CommentPostResponse,
} from "@/pages/api/social/comment_post";
import type { BiomesId } from "@/shared/ids";
import type { BatchCommentBundle, SocialDocumentType } from "@/shared/types";
import { jsonFetch, jsonPost } from "@/shared/util/fetch_helpers";
import { dictToQueryString, displayUsername } from "@/shared/util/helpers";
import React, { useCallback, useEffect, useRef, useState } from "react";

export const MiniPhoneCommentList: React.FunctionComponent<{
  documentId: BiomesId;
  documentType: SocialDocumentType;
  to?: BiomesId;
  commentBundle?: BatchCommentBundle;
}> = ({ documentId, documentType, to, commentBundle }) => {
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(commentBundle?.comments || []);
  const [error, setError] = useError();
  const [isCommenting, setIsCommenting] = useState(false);
  const commentField = useRef<HTMLInputElement>(null);

  const [pagingToken, setPagingToken] = useState(commentBundle?.pagingToken);
  const [loading, setLoading] = useState(false);

  const miniPhone = useExistingMiniPhoneContext<SocialMiniPhonePayload>();

  const loadPage = useCallback(
    async (pagingToken?: string) => {
      setLoading(true);
      try {
        const queryString = dictToQueryString({
          documentId,
          documentType,
          pagingToken,
        });
        const res = await jsonFetch<CommentListResponse>(
          `/api/social/comment_list?${queryString}`
        );
        setComments([...comments, ...res.comments]);
        setPagingToken(res.pagingToken);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [comments]
  );

  const makeComment = useCallback(
    async (commentText: string) => {
      try {
        setIsCommenting(true);
        const ret = await jsonPost<CommentPostResponse, CommentPostRequest>(
          "/api/social/comment_post",
          {
            comment: commentText,
            documentId,
            documentType,
            to,
            nonce: Math.random(),
          }
        );

        setCommentText("");
        setComments([...comments, ret.comment]);
      } catch (error: any) {
        setError(error);
      } finally {
        setIsCommenting(false);
      }
    },
    [comments]
  );

  useEffect(() => {
    if (commentBundle?.pagingToken) {
      void loadPage(commentBundle.pagingToken);
    }
    commentField.current?.focus();
  }, []);

  return (
    <MiniPhoneScreen>
      <MiniPhoneScreenTitle>Comments</MiniPhoneScreenTitle>
      <MiniPhoneScreenContent>
        <MiniPhoneDialog extraClassName="comments">
          <MaybeError error={error} />
          <MiniPhoneDialogContent
            style="pin-top"
            onBottom={() => {
              if (!loading && pagingToken) {
                void loadPage(pagingToken);
              }
            }}
          >
            {comments.map((e) => (
              <div
                className="comment"
                key={e.commentId}
                onClick={() => {
                  miniPhone.pushNavigationStack({
                    type: "profile",
                    userId: e.user.id,
                  });
                }}
              >
                <MiniPhoneUserAvatarLink user={e.user} />
                <div className="text">
                  <MiniPhoneUserLink userId={e.user.id}>
                    {displayUsername(e.user.username)}
                  </MiniPhoneUserLink>
                  <br />
                  {e.comment}
                </div>
              </div>
            ))}
            <MaybeGridSpinner isLoading={loading} />
            <MaybeLoadMoreRow
              loading={loading}
              canLoadMore={!!pagingToken}
              onLoadMore={() => {
                void loadPage(pagingToken);
              }}
            />
          </MiniPhoneDialogContent>
          <MiniPhoneDialogButtons>
            <input
              type="text"
              size={100}
              maxLength={100}
              ref={commentField}
              placeholder="Enter a comment..."
              value={commentText}
              onChange={(e) => {
                setCommentText(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.repeat) return;
                const lk = e.code as KeyCode;
                if (lk === "Enter") {
                  void makeComment(commentText);
                }
              }}
            />
            <DialogButton
              type="primary"
              disabled={isCommenting}
              onClick={() => {
                void makeComment(commentText);
              }}
            >
              {isCommenting ? "Commenting..." : "Comment"}
            </DialogButton>
          </MiniPhoneDialogButtons>
        </MiniPhoneDialog>
      </MiniPhoneScreenContent>
    </MiniPhoneScreen>
  );
};
