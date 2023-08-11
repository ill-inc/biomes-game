import type { LogicApi } from "@/server/shared/api/logic";
import type { IdGenerator } from "@/server/shared/ids/generator";
import { makePhotoWarpable } from "@/server/shared/social/posts";
import type { BDB } from "@/server/shared/storage";
import type { ServerTaskProcessor } from "@/server/shared/tasks/server_tasks/server_task_processor";
import type {
  DoneTaskIndicator,
  TaskRetryPolicy,
} from "@/server/shared/tasks/types";
import { DONE_TASK, JSONTaskNode } from "@/server/shared/tasks/types";
import { feedPostById } from "@/server/web/db/social";
import type { FirestoreFeedPost } from "@/server/web/db/types";
import type { Vec2f, Vec3f } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { pitchAndYaw } from "@/shared/math/linear";
import type { WithId } from "@/shared/util/type_helpers";

export async function enqueueMakePhotoWarpable(
  taskProcessor: ServerTaskProcessor,
  logicApi: LogicApi,
  db: BDB,
  idGenerator: IdGenerator,
  post: WithId<FirestoreFeedPost, BiomesId>,
  position: Vec3f,
  orientation: Vec2f
) {
  try {
    await makePhotoWarpable(
      db,
      idGenerator,
      logicApi,
      post,
      position,
      orientation
    );
  } catch (err: any) {
    log.error("Failed to make photo warpable, scheduling repair job", {
      err,
    });
    await taskProcessor.enqueue(
      `repair-photo:${post.id}`,
      RepairPhotoWarpabilityTask,
      {
        postId: post.id,
      },
      {
        originUserId: post.userId,
      }
    );
    return false;
  }

  return true;
}
export class RepairPhotoWarpabilityTask extends JSONTaskNode<{
  postId: BiomesId;
}> {
  static stableName = "repair-photo-warp";
  async run(): Promise<DoneTaskIndicator> {
    const post = await feedPostById(this.context.deps.db, this.state.postId);
    if (!post) {
      log.error("Scheduled a warp repair job on a non-existing post", {
        id: this.state.postId,
      });
      return DONE_TASK;
    } else if (post.portalEntityId) {
      log.warn("Warp repair job not needed but scheduled", {
        id: this.state.postId,
      });
      return DONE_TASK;
    }
    // We've lost the player knowledge, so reconstruct from camera.
    let warpPosition: Vec3f | undefined;
    let warpOrientation: Vec2f = [0, 0];
    for (const media of post.media ?? []) {
      if (!media.metadata) {
        continue;
      }
      warpPosition = media.metadata.coordinates;
      if (media.metadata.cameraLookAt) {
        warpOrientation = pitchAndYaw(media.metadata.cameraLookAt);
      }
    }
    if (!warpPosition) {
      log.warn("Cannot make photo warpable, it lacks coordinates");
      return DONE_TASK;
    }
    await makePhotoWarpable(
      this.context.deps.db,
      this.context.deps.idGenerator,
      this.context.deps.logicApi,
      post,
      warpPosition,
      warpOrientation
    );
    return DONE_TASK;
  }

  retryPolicy(): TaskRetryPolicy {
    return {
      baseMs: 5000,
      maxAttempts: 5,
      maxMs: 120 * 1000,
    };
  }
}

export const ALL_REPAIR_JOB_NODES = [RepairPhotoWarpabilityTask] as const;
