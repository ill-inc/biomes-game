import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { SocialMiniPhonePayload } from "@/client/components/social/types";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeFillStatusBox } from "@/client/components/system/FillStatusBox";
import { Img } from "@/client/components/system/Img";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { LeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { RightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import type { KeyCode } from "@/client/game/util/keyboard";
import { cleanListener } from "@/client/util/helpers";
import { useMountedRef } from "@/client/util/hooks";
import {
  attachAmbientProgressMonitor,
  rootTaskProgressCallback,
} from "@/client/util/tasks/manager";
import { PostPhotoTask } from "@/client/util/tasks/social_tasks";
import type { CameraMode, MinigameType } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import type { Vec2, Vec3 } from "@/shared/math/types";
import type { PostTaggedObject } from "@/shared/types";
import React, { useCallback, useEffect, useRef, useState } from "react";

export interface PostCaptureItem {
  photoDataURI: string;
  position: Vec3;
  orientation: Vec2;
  shotCoordinates: Vec3;
  shotLookAt: Vec3;
  taggedObjects: PostTaggedObject[];
  cameraMode: CameraMode;
  shotInMinigameId?: BiomesId;
  shotInMinigameInstanceId?: BiomesId;
  shotInMinigameType?: MinigameType;
}

export const MiniPhonePostCaptureFlow: React.FunctionComponent<{
  item: PostCaptureItem;
}> = ({ item }) => {
  const { chatIo, reactResources, gardenHose, socialManager, userId } =
    useClientContext();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useError();
  const miniPhone = useExistingMiniPhoneContext<SocialMiniPhonePayload>();
  const isMounted = useMountedRef();
  const [showSuccess] = useState(false);
  const captionField = useRef<HTMLTextAreaElement>(null);
  const allowWarping = true;

  const uploadFeedPost = useCallback(async () => {
    setUploading(true);
    const caption = captionField.current ? captionField.current.value : "";
    try {
      const task = new PostPhotoTask(
        {
          ...item,
          allowWarping,
          caption,
        },
        chatIo
      );

      gardenHose.publish({
        kind: "photo_post_attempt",
      });

      task.emitter.on("onSuccess", () => {
        socialManager.eagerInvalidatePhotoPage(userId);
        gardenHose.publish({
          kind: "photo_post",
        });
      });

      task.emitter.on("onFailure", () => {
        gardenHose.publish({
          kind: "photo_post_error",
        });
      });

      attachAmbientProgressMonitor(reactResources, task, {
        progressClick: rootTaskProgressCallback(reactResources),
        failureClick: rootTaskProgressCallback(reactResources),
        successClick: () => {
          reactResources.set("/game_modal", {
            kind: "generic_miniphone",
            rootPayload: {
              type: "social_detail",
              documentId: task.feedPostBundle!.id,
              documentType: "post",
            },
          });
        },
      });
      void task.attempt();
      miniPhone.close();
    } catch (error: any) {
      if (isMounted.current) {
        setUploading(false);
        setError(error);
      }
    }
  }, [miniPhone.close, allowWarping]);

  useEffect(() => {
    if (captionField.current) {
      captionField.current.focus();
    }
    gardenHose.publish({
      kind: "show_post_capture",
    });

    return () => {
      gardenHose.publish({
        kind: "hide_post_capture",
      });
    };
  }, []);

  useEffect(() => {
    if (captionField.current) {
      cleanListener(captionField.current, {
        keydown: (e) => {
          if (e.repeat) return;
          const lk = e.code as KeyCode;
          if (isMounted.current && lk === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void uploadFeedPost();
          }
        },
      });
    }
  }, []);

  return (
    <SplitPaneScreen extraClassName="post-capture-flow">
      <ScreenTitleBar title="Post Photo" />
      <LeftPane>
        <div className="padded-view">
          <MaybeFillStatusBox
            type={uploading ? "progress" : showSuccess ? "success" : undefined}
            footer={showSuccess ? "Your Photo Is Posted!" : "Posting..."}
          />
          <MaybeError error={error} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void uploadFeedPost();
            }}
          >
            <textarea
              className="post-caption"
              ref={captionField}
              maxLength={100}
              placeholder="Caption..."
            />
          </form>
        </div>
        <PaneBottomDock>
          <DialogButton
            type="primary"
            onClick={() => uploadFeedPost()}
            disabled={uploading}
          >
            {uploading ? "Posting..." : "Post ↵"}
          </DialogButton>
        </PaneBottomDock>
      </LeftPane>
      <RightPane type="center">
        <Img src={item.photoDataURI} />
      </RightPane>
    </SplitPaneScreen>
  );
};
