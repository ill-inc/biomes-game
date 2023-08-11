import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";

import { SelectPhotoScreen } from "@/client/components/system/SelectPhotoScreen";
import { useUserCanAction } from "@/client/util/permissions_manager_hooks";

import { ChangePictureFrameContentsEvent } from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { assertNever } from "@/shared/util/type_helpers";
import React from "react";

export const ChangeFrameContentsScreen: React.FunctionComponent<{
  placeableId: BiomesId;
}> = ({ placeableId }) => {
  const { reactResources, events, userId } = useClientContext();
  const canChange = useUserCanAction(placeableId, "destroy");

  return (
    <SelectPhotoScreen
      onPhotoSelected={(photo) => {
        switch (photo.kind) {
          case "photo":
            {
              void (async () => {
                if (!canChange) {
                  log.warn("No permissions to change picture frame contents");
                } else {
                  await events.publish(
                    new ChangePictureFrameContentsEvent({
                      id: placeableId,
                      photo_id: photo.id,
                      user_id: userId,
                    })
                  );
                }
                reactResources.set("/game_modal", { kind: "empty" });
              })();
            }
            break;

          case "minigame":
            {
              void (async () => {
                if (!canChange) {
                  log.warn("No permissions to change picture frame contents");
                } else {
                  await events.publish(
                    new ChangePictureFrameContentsEvent({
                      id: placeableId,
                      minigame_id: photo.id,
                      user_id: userId,
                    })
                  );
                }
                reactResources.set("/game_modal", { kind: "empty" });
              })();
            }
            break;

          default:
            assertNever(photo);
        }
      }}
    />
  );
};
