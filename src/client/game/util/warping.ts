import {
  beginOrUpdateWarpEffect,
  finishWarpEffect,
} from "@/client/components/canvas_effects";
import type {
  ClientContextKeysFor,
  ClientContextSubset,
  ClientContextSubsetFor,
} from "@/client/game/context";
import type { WarpToRequest } from "@/pages/api/admin/warp_to";
import type {
  WarpHomeRequest,
  WarpHomeResponse,
} from "@/pages/api/homestone/warp_home";
import type {
  CreateOrJoinMinigameRequest,
  CreateOrJoinMinigameResponse,
} from "@/pages/api/minigames/create_or_join";
import type { ChatMessage } from "@/shared/chat/messages";
import type { WarpHomeReason } from "@/shared/ecs/gen/types";
import type { WarpHomeDestination } from "@/shared/firehose/events";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { Vec3 } from "@/shared/math/types";
import type { FeedPostBundle, GroupDetailBundle } from "@/shared/types";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { getNowMs } from "@/shared/util/helpers";

export interface WarpingInfo {
  startTime: number;
}

export async function respawn(
  deps: ClientContextSubsetFor<typeof warpToDestination>,
  destination: WarpHomeDestination
) {
  const localPlayer = deps.resources.get("/scene/local_player");
  const health = deps.resources.get("/ecs/c/health", deps.userId);
  if (health && localPlayer.playerStatus === "dead") {
    localPlayer.playerStatus = "respawning";
    try {
      await warpToDestination(deps, destination, "respawn");
    } catch (error: any) {
      if (localPlayer.playerStatus === "respawning") {
        localPlayer.playerStatus = "dead";
      }

      throw error;
    }
  }
}

export async function warpToDestination(
  deps: ClientContextSubsetFor<typeof initiateWarp>,
  destination: WarpHomeDestination,
  reason: WarpHomeReason = "homestone"
) {
  await initiateWarp(
    deps,
    async () => {
      await jsonPost<WarpHomeResponse, WarpHomeRequest>(
        "/api/homestone/warp_home",
        { destination, reason }
      );
    },
    reason === "homestone"
      ? {
          kind: "emote",
          emote_type: "warpHome",
        }
      : undefined
  );
}

export async function createOrJoinMinigame(
  deps: ClientContextSubsetFor<typeof initiateWarp>,
  minigameId: BiomesId
) {
  try {
    await jsonPost<CreateOrJoinMinigameResponse, CreateOrJoinMinigameRequest>(
      "/api/minigames/create_or_join",
      {
        minigameId: minigameId,
      }
    );
  } finally {
    await deps.chatIo.sendMessage("chat", {
      kind: "minigame_join",
      minigameId: minigameId,
    });
  }
}

export async function warpToGroup(
  deps: ClientContextSubset<
    "socialManager" | "gardenHose" | ClientContextKeysFor<typeof initiateWarp>
  >,
  group: GroupDetailBundle
) {
  deps.gardenHose.publish({
    kind: "warp_group",
  });
  await initiateWarp(
    deps,
    async () => {
      await deps.socialManager.warpGroup(group);
    },
    {
      kind: "warp",
      documentType: "environment_group",
      documentId: group.id,
    }
  );
}

export async function warpToPost(
  deps: ClientContextSubset<
    "socialManager" | "gardenHose" | ClientContextKeysFor<typeof initiateWarp>
  >,
  post: FeedPostBundle
) {
  deps.gardenHose.publish({
    kind: "warp_post",
  });
  await initiateWarp(deps, async () => deps.socialManager.warpPost(post), {
    kind: "warp",
    documentType: "post",
    documentId: post.id,
  });
}

export async function warpToPosition(
  deps: ClientContextSubsetFor<typeof initiateWarp>,
  position: Vec3,
  entityId?: BiomesId
) {
  const warpFn = async () => {
    await jsonPost<void, WarpToRequest>("/api/admin/warp_to", {
      position,
      entityId,
    });
  };
  if (entityId) {
    void warpFn();
  } else {
    await initiateWarp(deps, warpFn);
  }
}

export async function warpToEntity(
  deps: ClientContextSubsetFor<typeof initiateWarp>,
  entityId: BiomesId
) {
  const pos = deps.resources.get("/ecs/c/position", entityId);
  if (pos) {
    await warpToPosition(deps, [...pos.v]);
  }
}

async function initiateWarp(
  deps: ClientContextSubset<"chatIo" | "resources" | "userId">,
  warp: () => Promise<unknown>,
  messageOnSuccess?: ChatMessage
) {
  const localPlayer = deps.resources.get("/scene/local_player");
  localPlayer.warpingInfo = {
    startTime: getNowMs(),
  };
  beginOrUpdateWarpEffect(deps.resources);
  try {
    await warp();

    if (messageOnSuccess) {
      await deps.chatIo.sendMessage("chat", messageOnSuccess);
    }
  } catch (error) {
    log.error("Failed to warp", { error });
    finishWarpEffect(deps.resources);
    throw error;
  } finally {
    localPlayer.warpingInfo = undefined;
  }
}
