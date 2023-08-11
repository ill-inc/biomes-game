import {
  CharacterPreview,
  makePreviewSlot,
} from "@/client/components/character/CharacterPreview";
import { EditCharacterContent } from "@/client/components/character/EditCharacterContent";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useOwnedItems } from "@/client/components/inventory/helpers";
import { captureProfilePicScreenshot } from "@/client/components/inventory/SelfInventoryScreen";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { LeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { RightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import type { ThreeObjectPreview } from "@/client/components/ThreeObjectPreview";
import type { LoadedPlayerMesh } from "@/client/game/resources/player_mesh";
import { saveUsername } from "@/client/util/auth";
import type { SelfProfileResponse } from "@/pages/api/social/self_profile";
import type { UpdateProfilePictureRequest } from "@/pages/api/upload/profile_picture";
import { isAPIErrorCode } from "@/shared/api/errors";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { AppearanceComponent } from "@/shared/ecs/gen/components";
import {
  AppearanceChangeEvent,
  HairTransplantEvent,
  PlayerInitEvent,
} from "@/shared/ecs/gen/events";
import { fireAndForget } from "@/shared/util/async";
import { jsonFetch, jsonPost } from "@/shared/util/fetch_helpers";
import { useCallback, useEffect, useRef, useState } from "react";
import { MathUtils, Spherical, Vector3 } from "three";

export function usePreviewAppearance() {
  const { reactResources, userId } = useClientContext();
  const appearanceComponent = reactResources.use(
    "/ecs/c/appearance_component",
    userId
  ) as AppearanceComponent;

  return useState(appearanceComponent.appearance);
}

export function usePreviewHair() {
  const { reactResources, userId } = useClientContext();
  const ownedItems = useOwnedItems(reactResources, userId);
  const wearingHair = ownedItems.wearing?.items.get(BikkieIds.hair);
  const [previewHair, setPreviewHair] = useState(wearingHair);

  const wearableOverrides = new Map(ownedItems.wearing?.items) ?? new Map();
  if (previewHair) {
    wearableOverrides.set(BikkieIds.hair, previewHair);
  } else {
    wearableOverrides.delete(BikkieIds.hair);
  }

  return [previewHair, setPreviewHair, wearableOverrides] as const;
}

export const EditCharacterScreen: React.FunctionComponent<{
  type: "edit_character";
}> = ({}) => {
  const { reactResources, events, gardenHose, socialManager, userId } =
    useClientContext();
  const playerStatus = reactResources.use("/ecs/c/player_status", userId);
  const cancellable = Boolean(playerStatus?.init);

  const [error, setError] = useError();
  const [previewAppearance, setPreviewAppearance] = usePreviewAppearance();
  const [previewHair, setPreviewHair, wearableOverrides] = usePreviewHair();

  const [usernameField, setUsernameField] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");
  const profilePicPrep = useRef<[string, string] | undefined>();
  const miniPhone = useExistingMiniPhoneContext();

  const [badUsernameReason, setBadUsernameReason] = useState<
    undefined | string
  >();

  useEffect(() => {
    setBadUsernameReason(undefined);
  }, [usernameField]);

  const saveSettings = useCallback(async () => {
    if (badUsernameReason) {
      return;
    }

    setError("");
    try {
      setSaving(true);
      const isInit = !playerStatus?.init;
      if (currentUsername !== usernameField) {
        await saveUsername(usernameField);
      }

      if (profilePicPrep.current) {
        await jsonPost<void, UpdateProfilePictureRequest>(
          "/api/upload/profile_picture",
          {
            photoDataURI: profilePicPrep.current[0],
            hash: profilePicPrep.current[1],
          }
        );
        void socialManager.userInfoBundle(userId, true);
      }

      fireAndForget(events.publish(new PlayerInitEvent({ id: userId })));

      fireAndForget(
        events.publish(
          new AppearanceChangeEvent({
            id: userId,
            appearance: previewAppearance,
          })
        )
      );

      fireAndForget(
        events.publish(
          new HairTransplantEvent({
            id: userId,
            newHairId: previewHair?.id,
          })
        )
      );

      if (isInit) {
        gardenHose.publish({
          kind: "player_init",
        });
      }

      miniPhone.close();
    } catch (error: any) {
      if (isAPIErrorCode("bad_param", error)) {
        setBadUsernameReason(error.message);
      } else {
        setError(error);
      }
    } finally {
      setSaving(false);
    }
  }, [
    previewAppearance,
    usernameField,
    badUsernameReason,
    currentUsername,
    previewHair,
  ]);

  // Populate username
  useEffect(() => {
    if (!playerStatus?.init) {
      return;
    }
    void (async () => {
      try {
        const res = await jsonFetch<SelfProfileResponse>(
          "/api/social/self_profile"
        );
        setUsernameField(res.user.username ?? "");
        setCurrentUsername(res.user.username ?? "");
      } catch (error: any) {
        setError(error);
      }
    })();
  }, [badUsernameReason]);

  const onMeshChange = useCallback(
    (mesh: LoadedPlayerMesh, renderer: ThreeObjectPreview) => {
      // Timeout because otherwise we are in a T pose
      setTimeout(() => {
        const screenshot = captureProfilePicScreenshot(renderer);
        if (screenshot) {
          profilePicPrep.current = [screenshot, mesh.hash];
        }
      }, 100);
    },
    []
  );

  return (
    <>
      <SplitPaneScreen>
        <ScreenTitleBar title="Your Character" disableLeftBar={!cancellable} />
        <LeftPane>
          <form
            className="edit-character padded-view"
            onSubmit={(e) => {
              e.preventDefault();
              void saveSettings();
            }}
          >
            <MaybeError error={error} />
            <EditCharacterContent
              previewAppearance={previewAppearance}
              setPreviewAppearance={setPreviewAppearance}
              previewHair={previewHair}
              setPreviewHair={setPreviewHair}
              username={usernameField}
              onUsernameChange={setUsernameField}
              usernameError={badUsernameReason}
              usernameDisabled={saving}
              signingUp={!cancellable}
            />
          </form>
          <PaneBottomDock>
            <div className="dialog-button-group">
              <Tooltipped tooltip={badUsernameReason}>
                <DialogButton
                  type="primary"
                  disabled={!!badUsernameReason || !usernameField || saving}
                  onClick={saveSettings}
                >
                  Save
                </DialogButton>
              </Tooltipped>
              {cancellable && (
                <DialogButton
                  disabled={false}
                  onClick={() => miniPhone.close()}
                >
                  Cancel
                </DialogButton>
              )}
            </div>
          </PaneBottomDock>
        </LeftPane>
        <RightPane type="center">
          <div className="preview-container">
            <CharacterPreview
              previewSlot={makePreviewSlot("appearencePreview")}
              appearanceOverride={previewAppearance}
              wearableOverrides={wearableOverrides}
              controlTarget={new Vector3(0, 1, 0)}
              onMeshChange={onMeshChange}
              cameraPos={new Vector3().setFromSpherical(
                new Spherical(
                  3.3,
                  MathUtils.degToRad(65),
                  MathUtils.degToRad(190)
                )
              )}
            />
          </div>
        </RightPane>
      </SplitPaneScreen>
      <div className="large-contents-container"></div>
    </>
  );
};
