import { ThreeObjectPreview } from "@/client/components/ThreeObjectPreview";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { MiniPhoneLikersList } from "@/client/components/social/MiniPhoneLikersList";
import { PreviewComment } from "@/client/components/social/MiniPhonePostDetailPage";
import {
  MiniPhoneUserAvatarLink,
  MiniPhoneUserLink,
} from "@/client/components/social/MiniPhoneUserLink";
import { WarpersListView } from "@/client/components/social/MiniPhoneWarpersList";
import { ReportFlow } from "@/client/components/social/ReportFlow";
import { ActionButton } from "@/client/components/system/ActionButton";
import { DialogInputWithButton } from "@/client/components/system/DialogInputWithButton";
import type { FillProps } from "@/client/components/system/FillStatusBox";
import { MaybeFillStatusBox } from "@/client/components/system/FillStatusBox";
import { Img } from "@/client/components/system/Img";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { WarpButton } from "@/client/components/system/WarpButton";
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
import type { GroupMesh } from "@/client/game/resources/groups";
import { useEffectAsync, useShowingTemporaryURL } from "@/client/util/hooks";
import { useCachedGroupBundle } from "@/client/util/social_manager_hooks";
import type {
  CommentPostRequest,
  CommentPostResponse,
} from "@/pages/api/social/comment_post";
import {
  absoluteWebServerURL,
  environmentGroupPublicPermalink,
} from "@/server/web/util/urls";
import {
  AdminUpdateInspectionTweaksEvent,
  CaptureGroupEvent,
  RepairGroupEvent,
  UnGroupEvent,
} from "@/shared/ecs/gen/events";
import { groupTensorBox } from "@/shared/game/group";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { scale, sub } from "@/shared/math/linear";
import pluralize from "@/shared/plural";
import { fireAndForget, sleep } from "@/shared/util/async";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { displayUsername } from "@/shared/util/helpers";
import { epochMsToDuration } from "@/shared/util/view_helpers";
import { compact } from "lodash";
import React, { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import avatarIcon from "/public/hud/avatar-placeholder.png";

export const MiniPhoneGroupDetailPage: React.FunctionComponent<{
  groupId: BiomesId;
  onClose?: () => any;
}> = ({ groupId, onClose }) => {
  const [error, setError] = useError();
  const objectPreviewRef = useRef<ThreeObjectPreview>(null);
  const {
    socialManager,
    reactResources,
    authManager,
    clientConfig,
    resources,
    rendererController,
    events,
    userId,
    voxeloo,
  } = useClientContext();
  const [mesh, setMesh] = useState<GroupMesh>();

  const groupBundle = useCachedGroupBundle(socialManager, groupId);

  const [sendStatus, setSendStatus] = useState<undefined | FillProps>();
  const [likeButtonDisabled, setLikeButtonDisabled] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [copyLinkText, setCopyLinkText] = useState("Copy Link to Build");
  const [showMore, setShowMore] = useState(false);
  const [showLikerList, setShowLikerList] = useState(false);
  const [showWarpersList, setShowWarpersList] = useState(false);
  const [commentFieldValue, setCommentFieldValue] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const clonePermitted = authManager.currentUser.hasSpecialRole("clone");

  useShowingTemporaryURL(
    environmentGroupPublicPermalink(groupId, groupBundle?.name),
    [groupBundle?.name]
  );

  useEffectAsync(async () => {
    const tensorBlob = groupBundle?.tensor;
    const placeableIds = groupBundle?.placeableIds;
    if (!tensorBlob) {
      setMesh(undefined);
      return;
    }
    reactResources.update("/groups/static/data", (val) => {
      val.tensor.delete();
      val.tensor = new voxeloo.GroupTensor();
      val.tensor.load(tensorBlob);
      val.box = groupTensorBox(val.tensor);
      val.placeableIds = placeableIds;
      return val;
    });
    const mesh = await reactResources.get("/groups/static/mesh");
    setMesh(mesh);
  }, [groupBundle]);

  const ungroupVoxels = async (groupId: BiomesId) => {
    await events.publish(
      new UnGroupEvent({ id: groupId, user_id: userId, remove_voxels: false })
    );
    setSendStatus({
      type: "success",
      footer: "Deconstructed!",
    });
    await sleep(3000);
    onClose?.();
  };

  const repairVoxels = async (groupId: BiomesId) => {
    await events.publish(
      new RepairGroupEvent({ id: groupId, user_id: userId })
    );
    setSendStatus({
      type: "success",
      footer: "Group repaired!",
    });
    await sleep(3000);
    onClose?.();
  };

  const doLike = useCallback(async (isLiked: boolean) => {
    setLikeButtonDisabled(true);
    try {
      await socialManager.likeGroup(groupId, isLiked);
    } catch (error: any) {
      setError(error);
    } finally {
      setLikeButtonDisabled(false);
    }
  }, []);

  const makeComment = useCallback(
    async (commentText: string) => {
      if (!groupBundle) return;
      try {
        setIsCommenting(true);
        await jsonPost<CommentPostResponse, CommentPostRequest>(
          "/api/social/comment_post",
          {
            comment: commentText,
            documentId: groupId,
            documentType: "environment_group",
            to: groupBundle.ownerBiomesUser?.id,
            nonce: Math.random(),
          }
        );
        await socialManager.groupBundle(groupId, true);
        setCommentFieldValue("");
      } catch (error: any) {
        setError(error);
      } finally {
        setIsCommenting(false);
      }
    },
    [groupBundle]
  );

  let ownerLink: JSX.Element | string;
  if (groupBundle?.ownerBiomesUser) {
    ownerLink = (
      <MiniPhoneUserLink userId={groupBundle.ownerBiomesUser.id}>
        {displayUsername(groupBundle.ownerBiomesUser.username)}
      </MiniPhoneUserLink>
    );
  } else {
    ownerLink = "Unknown";
  }

  const inspectionTweaks = reactResources.use(
    "/ecs/c/inspection_tweaks",
    groupBundle?.id ?? INVALID_BIOMES_ID
  );
  const inspectionHidden = inspectionTweaks?.hidden;

  if (error) {
    return (
      <div className="biomes-box">
        <h1> Error! </h1>
        <MaybeError error={error} />
      </div>
    );
  }

  const loading = groupBundle === undefined;
  const deleteGroupRole = authManager.currentUser.hasSpecialRole("deleteGroup");
  const repairGroupRole = authManager.currentUser.hasSpecialRole("repairGroup");
  const adminRole = authManager.currentUser.hasSpecialRole("admin");
  const ownsGroup = userId === groupBundle?.ownerBiomesUser?.id;

  return (
    <SplitPaneScreen>
      <ScreenTitleBar title={groupBundle?.name}>
        <RightBarItem>
          <MiniPhoneMoreItem onClick={() => setShowMore(!showMore)} />
        </RightBarItem>
      </ScreenTitleBar>
      <RightBarItem></RightBarItem>
      <LeftPane>
        {loading ? (
          <div> Loading... </div>
        ) : (
          <div className="padded-view">
            <div className="comments-list">
              <div className="attribution-container">
                {groupBundle?.ownerBiomesUser ? (
                  <MiniPhoneUserAvatarLink user={groupBundle.ownerBiomesUser} />
                ) : (
                  <Img className="avatar" src={avatarIcon.src} />
                )}
                <div className="owner">
                  <div>By {ownerLink}</div>
                  {groupBundle?.description && (
                    <div className="description">{groupBundle.description}</div>
                  )}
                </div>
                {groupBundle?.createMs && (
                  <div className="timestamp">
                    {epochMsToDuration(groupBundle.createMs)}
                  </div>
                )}
              </div>

              {(groupBundle?.commentBundle.comments.length ?? 0) > 0 && (
                <>
                  {groupBundle?.commentBundle.comments.map((c) => (
                    <PreviewComment
                      comment={c.comment}
                      user={c.user}
                      key={c.commentId}
                    />
                  ))}
                </>
              )}
              {sendStatus && (
                <MaybeFillStatusBox
                  type={sendStatus.type}
                  header={sendStatus.header}
                  footer={sendStatus.footer}
                />
              )}
            </div>
          </div>
        )}
        <PaneBottomDock>
          <div className="action-container">
            <div className="actions">
              <ActionButton
                type="like"
                tooltip="Like"
                disabled={likeButtonDisabled || !groupBundle}
                filled={groupBundle?.isLikedByQuerier}
                onClick={() => {
                  void doLike(!groupBundle?.isLikedByQuerier);
                }}
              />
              {groupBundle?.allowWarping && (
                <WarpButton
                  buttonType="action"
                  documentType="environment_group"
                  document={groupBundle}
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
                  {pluralize("Like", groupBundle?.numLikes ?? 0, true)}
                </a>
              </div>
              {groupBundle?.allowWarping && (
                <div className="warps">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowWarpersList(true);
                    }}
                  >
                    {pluralize("Warp", groupBundle?.numWarps ?? 0, true)}
                  </a>
                </div>
              )}
            </div>
          </div>
          {groupBundle && (
            <DialogInputWithButton
              formClassName="mt-1"
              value={commentFieldValue}
              onSubmit={async () => {
                void makeComment(commentFieldValue);
              }}
              onChange={(e) => {
                setCommentFieldValue(e.target.value);
              }}
              showSaveButton={commentFieldValue != undefined}
              disabledSubmit={isCommenting}
              buttonText={isCommenting ? "Posting" : "Post"}
            />
          )}
        </PaneBottomDock>

        <PaneActionSheet
          showing={showLikerList}
          title="Likers"
          onClose={() => setShowLikerList(false)}
        >
          <MiniPhoneLikersList
            documentId={groupId}
            documentType={"environment_group"}
          />
        </PaneActionSheet>

        <PaneActionSheet
          showing={showWarpersList}
          title="Warpers"
          onClose={() => setShowWarpersList(false)}
        >
          <WarpersListView
            documentId={groupId}
            documentType={"environment_group"}
          />
        </PaneActionSheet>
      </LeftPane>
      <RightPane type="center">
        <div className="preview-container">
          {mesh && (
            <ThreeObjectPreview
              object={mesh.three}
              ref={objectPreviewRef}
              controlTarget={
                mesh.box.v0 && mesh.box.v1
                  ? new THREE.Vector3(
                      ...scale(0.5, sub(mesh.box.v1, mesh.box.v0))
                    )
                  : undefined
              }
              autoRotate={true}
              allowZoom={true}
              allowPan={true}
              resources={resources}
              clientConfig={clientConfig}
              renderScale={rendererController.passRenderer?.pixelRatio()}
            />
          )}
        </div>
      </RightPane>
      <MiniPhoneScreenMoreMenu
        items={compact([
          {
            label: copyLinkText,
            onClick: () => {
              if (groupBundle) {
                const url = absoluteWebServerURL(
                  environmentGroupPublicPermalink(
                    groupBundle.id,
                    groupBundle.name
                  )
                );
                void navigator.clipboard.writeText(url);
                setCopyLinkText("Copied");
                setTimeout(() => {
                  setCopyLinkText("Copy Link to Build");
                  setShowMore(false);
                }, 500);
              }
            },
          },

          clonePermitted && groupBundle
            ? {
                label: "Copy to Inventory (Admin)",
                onClick: () => {
                  fireAndForget(
                    events.publish(
                      new CaptureGroupEvent({
                        id: groupBundle.id,
                        user_id: userId,
                      })
                    )
                  );
                },
              }
            : undefined,

          adminRole && groupBundle
            ? {
                label: "Copy Group ID (Admin)",
                onClick: () => {
                  void navigator.clipboard.writeText(`${groupBundle.id}`);
                },
              }
            : undefined,

          adminRole &&
            (inspectionHidden
              ? {
                  label: "Show Inspection (Admin)",
                  onClick: () => {
                    fireAndForget(
                      events.publish(
                        new AdminUpdateInspectionTweaksEvent({
                          id: userId,
                          entity_id: groupId,
                          hidden: false,
                        })
                      )
                    );
                  },
                }
              : {
                  label: "Hide Inspection (Admin)",
                  onClick: () => {
                    fireAndForget(
                      events.publish(
                        new AdminUpdateInspectionTweaksEvent({
                          id: userId,
                          entity_id: groupId,
                          hidden: true,
                        })
                      )
                    );
                  },
                }),

          repairGroupRole
            ? {
                label: "Repair (Admin)",
                type: "destructive",
                onClick: () => {
                  if (confirm("Are you sure you want to repair this?")) {
                    void repairVoxels(groupId);
                  }
                  setShowMore(false);
                },
              }
            : undefined,
          deleteGroupRole || ownsGroup
            ? {
                label: "Deconstruct",
                type: "destructive",
                onClick: () => {
                  if (confirm("Are you sure you want to deconstruct this?")) {
                    void ungroupVoxels(groupId);
                  }
                  setShowMore(false);
                },
              }
            : undefined,
          {
            label: "Report",
            type: "destructive",
            onClick: () => {
              setShowReportMenu(true);
              setShowMore(false);
            },
          },
        ])}
        showing={showMore}
      />

      {showReportMenu && (
        <MiniPhoneSubModal
          onDismissal={() => {
            setShowReportMenu(false);
          }}
        >
          <ReportFlow
            target={{
              kind: "group",
              targetId: groupId,
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
