import type { Camera } from "@/client/game/resources/camera";
import type { ClientResources } from "@/client/game/resources/types";

import { getCameraDirection } from "@/shared/game/spatial";
import type { BiomesId } from "@/shared/ids";
import { faceToOrientation } from "@/shared/math/normals";
import type { Rotation } from "@/shared/math/rotation";
import {
  normalizeRotation,
  orientationToRotation,
} from "@/shared/math/rotation";

export function highlightGroup(
  resources: ClientResources,
  groupId: BiomesId,
  animated: boolean = true
) {
  resources.update("/groups/highlighted_groups", (groupHighlights) => {
    groupHighlights.set(groupId, {
      opacity: 0.5,
      animated,
      createdAtMs: Date.now(),
    });
  });
}

export function cameraRotationForGroup(camera: Camera): Rotation {
  const camDir = getCameraDirection(camera.three);
  const camOrientation = faceToOrientation(camDir);
  return orientationToRotation(camOrientation);
}

export function combineRotation(
  base: Rotation,
  srcRotation?: number
): Rotation {
  return normalizeRotation((srcRotation ?? 0) + base);
}
