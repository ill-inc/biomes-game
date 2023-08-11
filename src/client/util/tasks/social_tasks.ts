import type { PostCaptureItem } from "@/client/components/social/MiniPhonePostCaptureFlow";
import type { ChatIo } from "@/client/game/chat/io";
import { StateMachineTask } from "@/client/util/tasks/types";
import type {
  PostPhotoRequest,
  PostPhotoResponse,
} from "@/pages/api/upload/photo";
import { timeAsyncCode } from "@/shared/metrics/performance_timing";
import type { FeedPostBundle } from "@/shared/types";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { ok } from "assert";

export interface PostPhotoItemDescription extends PostCaptureItem {
  allowWarping: boolean;
  caption: string;
}

export class PostPhotoTask extends StateMachineTask {
  private state: "start" | "chat_send" | "done" = "start";

  public feedPostBundle?: FeedPostBundle;

  constructor(private item: PostPhotoItemDescription, private chatIo: ChatIo) {
    super();
    this.viewMetadata = {
      title: "Posting photo",
    };
  }

  async step(): Promise<void> {
    switch (this.state) {
      case "start":
        await this.doPostPhoto();
        this.state = "chat_send";
        break;
      case "chat_send":
        await this.doChatSend();
        this.state = "done";
        break;
      case "done":
        break;
    }
  }

  done(): boolean {
    return this.state === "done";
  }

  async doPostPhoto() {
    this.setProgress("Sending request to server");
    const res = await timeAsyncCode<PostPhotoResponse>("Feed upload", () =>
      jsonPost<PostPhotoResponse, PostPhotoRequest>("/api/upload/photo", {
        allowWarping: this.item.allowWarping,
        photoDataURI: this.item.photoDataURI,
        position: this.item.position,
        orientation: this.item.orientation,
        shotCoordinates: this.item.shotCoordinates,
        shotLookAt: this.item.shotLookAt,
        cameraMode: this.item.cameraMode,
        taggedObjects: this.item.taggedObjects,
        caption: this.item.caption,
        shotInMinigameId: this.item.shotInMinigameId,
        shotInMinigameInstanceId: this.item.shotInMinigameInstanceId,
        shotInMinigameType: this.item.shotInMinigameType,
      })
    );

    this.feedPostBundle = res.feedPostBundle;
  }

  async doChatSend() {
    ok(this.feedPostBundle);
    this.setProgress("Sending chat message");
    void this.chatIo.sendMessage("yell", {
      kind: "photo",
      postId: this.feedPostBundle.id,
    });
  }
}
