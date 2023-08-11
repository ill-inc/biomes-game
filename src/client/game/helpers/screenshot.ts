import type { ClientContextSubset } from "@/client/game/context";
import type { ImageCrop, ImageSpec } from "@/client/game/helpers/game_camera";
import {
  composeAndCropImage,
  findTaggedObjectsInPost,
} from "@/client/game/helpers/game_camera";
import { getTypedStorageItem } from "@/client/util/typed_local_storage";
import { ok } from "assert";
import { first } from "lodash";
import { Vector3 } from "three";

import { CSS_3D_CONTAINER_CLASSNAME } from "@/client/components/css3d/helpers";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { sleep } from "@/shared/util/async";
import domtoimage from "dom-to-image-more";
import { useCallback, useEffect, useState } from "react";

const BASE_INCLUSION_DISTANCE = 30;

async function extractImagesFromHTML(
  element: HTMLElement | undefined,
  scaleFactor: number
): Promise<ImageSpec[]> {
  const images: ImageSpec[] = [];
  if (element && element.dataset.items && parseInt(element.dataset.items) > 0) {
    images.unshift({
      url: await domtoimage.toPng(element, {
        bgcolor: "black",
      }),
      baseScale: 1.0 / scaleFactor,
    });
  }

  return images;
}

const MAX_SCREENSHOT_DELAY_MS = 500;

interface CaptureRequest {
  time: number;
  rect: DOMRect;
}

export function useScreenshotter(
  deps: ClientContextSubset<
    | "audioManager"
    | "table"
    | "resources"
    | "reactResources"
    | "rendererController"
    | "mailman"
    | "userId"
    | "voxeloo"
  >
): {
  screenshotting: boolean;
  takeScreenshot: (brect: DOMRect) => void;
} {
  const { screenshotting, thumbnailsLoading } = deps.reactResources.use(
    "/is_taking_screenshot"
  );
  const { time } = deps.reactResources.use("/clock");
  const [request, setRequest] = useState<CaptureRequest | undefined>();

  useEffect(() => {
    if (request === undefined) {
      return;
    }

    // Take a screenshot, ignoring the loading status of the thumbnails,
    // if none has been taken after MAX_SCREENSHOT_DELAY_MS.
    if (time - request.time > MAX_SCREENSHOT_DELAY_MS / 1000) {
      takeScreenshot(false);
    } else {
      takeScreenshot(true);
    }
  }, [time, request, thumbnailsLoading, screenshotting]);

  const takeScreenshot = useCallback(
    (waitForThumbnails: boolean) => {
      if (thumbnailsLoading > 0 && waitForThumbnails) {
        return;
      }
      if (screenshotting && request !== undefined) {
        void captureScreenshot(deps, request.rect).finally(() => {
          deps.reactResources.set("/is_taking_screenshot", {
            screenshotting: false,
            thumbnailsLoading: 0,
          });
          setRequest(undefined);
        });
      }
    },
    [screenshotting, request, thumbnailsLoading]
  );

  const requestScreenshot = useCallback(
    (brect: DOMRect) => {
      if (!screenshotting) {
        deps.reactResources.set("/is_taking_screenshot", {
          screenshotting: true,
          thumbnailsLoading,
        });
        // This sleep is called so we give time for the thumbnails to start
        // loading and increase the thumbnailsLoading count, if required.
        void sleep(50).then(() => {
          setRequest({
            time: secondsSinceEpoch(),
            rect: brect,
          });
        });
      }
    },
    [screenshotting, request, thumbnailsLoading]
  );

  return {
    screenshotting,
    takeScreenshot: requestScreenshot,
  };
}

export async function captureScreenshot(
  deps: ClientContextSubset<
    | "audioManager"
    | "table"
    | "resources"
    | "reactResources"
    | "rendererController"
    | "mailman"
    | "userId"
    | "voxeloo"
  >,
  brect: DOMRect
) {
  try {
    const doCSSCap = deps.reactResources.get("/tweaks").useCSSCapture;
    deps.rendererController.renderingEnabled = false;
    const selection = deps.reactResources.get("/hotbar/selection");
    ok(selection.kind === "camera");
    const camera = deps.reactResources.get("/scene/camera");

    // Capture a screenshot such that the short edge > 1024 length in true pixels
    const currentRenderSize = deps.rendererController.getCanvasSize();

    const printResolution = getTypedStorageItem("settings.cam.printResolution");

    const desiredShortEdgeLength = printResolution ? 4096 : 1200;
    const scaleFactor = Math.max(
      1,
      Math.max(
        desiredShortEdgeLength / currentRenderSize[0],
        desiredShortEdgeLength / currentRenderSize[1]
      )
    );

    const ret = deps.rendererController.captureScreenshot({
      width: currentRenderSize[0] * scaleFactor,
      height: currentRenderSize[1] * scaleFactor,
    });

    if (!ret) {
      deps.mailman.showChatError("Error while capturing photo...");
      return;
    }

    // Crop out what the preview suggested was being captured

    const imageURLs: ImageSpec[] = [
      {
        url: ret.screenshotDataUri,
        baseScale: 1.0,
      },
    ];

    if (doCSSCap ?? true) {
      const css3dElement = first(
        document.getElementsByClassName(CSS_3D_CONTAINER_CLASSNAME)
      ) as HTMLElement | undefined;
      imageURLs.unshift(
        ...(await extractImagesFromHTML(css3dElement, scaleFactor))
      );
    }

    const imageURL = await composeAndCropImage(
      imageURLs,
      brect.width * scaleFactor,
      brect.height * scaleFactor,
      brect.x * scaleFactor,
      brect.y * scaleFactor
    );

    // Determine what was captured via NDC projection accounting for image crop
    const normedImageCrop: ImageCrop = {
      normX: (scaleFactor * brect.x) / ret.width,
      normY: (scaleFactor * brect.y) / ret.height,
      normWidth: (scaleFactor * brect.width) / ret.width,
      normHeight: (scaleFactor * brect.height) / ret.height,
    };

    const inclusionDistance =
      BASE_INCLUSION_DISTANCE *
      (selection.mode.kind === "fps"
        ? 1 + Math.log2(selection.mode.zoom ?? 1)
        : 1);

    const taggedObjects = findTaggedObjectsInPost(
      deps,
      camera,
      ret.screenshotMatrixWorldInverse,
      ret.screenshotProjectionMatrix,
      normedImageCrop,
      inclusionDistance
    );

    const localPlayer = deps.reactResources.get("/scene/local_player");

    const shotPosition = new Vector3();
    const shotDirection = new Vector3();
    camera.three.getWorldPosition(shotPosition);
    camera.three.getWorldDirection(shotDirection);

    const activeMinigame = deps.reactResources.get(
      "/ecs/c/playing_minigame",
      deps.userId
    );

    deps.rendererController.renderingEnabled = true;
    deps.reactResources.set("/game_modal", {
      kind: "generic_miniphone",
      allowClickToDismiss: false,
      rootPayload: {
        type: "post_photo",
        item: {
          taggedObjects,
          position: localPlayer.player.position,
          orientation: localPlayer.player.orientation,
          shotCoordinates: shotPosition.toArray(),
          shotLookAt: shotDirection.toArray(),
          photoDataURI: imageURL,
          cameraMode: selection.mode.modeType,
          shotInMinigameId: activeMinigame?.minigame_id,
          shotInMinigameInstanceId: activeMinigame?.minigame_instance_id,
          shotInMinigameType: activeMinigame?.minigame_type,
        },
      },
    });
  } finally {
    deps.rendererController.renderingEnabled = true;
  }
}
