import { WakeupMuckParticles } from "@/client/components/Particles";
import { setCanvasEffect } from "@/client/components/canvas_effects";
import { ClickToContinue } from "@/client/components/challenges/TalkDialogModalStep";
import { Typer } from "@/client/components/challenges/Typer";
import {
  CharacterPreview,
  makePreviewSlot,
} from "@/client/components/character/CharacterPreview";
import { EditCharacterColorSelector } from "@/client/components/character/EditCharacterColorSelector";
import {
  usePreviewAppearance,
  usePreviewHair,
} from "@/client/components/character/EditCharacterScreen";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { usePointerLockManager } from "@/client/components/contexts/PointerLockContext";
import { TalkToInput } from "@/client/components/modals/robot/TalkToRobotModal";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import type { ClientContextSubset } from "@/client/game/context";
import { makeWakeUpScreenshot } from "@/client/game/util/report";
import { saveUsername } from "@/client/util/auth";
import { isInitialUsername } from "@/server/web/util/username";
import {
  AppearanceChangeEvent,
  HairTransplantEvent,
  PlayerInitEvent,
} from "@/shared/ecs/gen/events";
import { reportFunnelStage } from "@/shared/funnel";
import { fireAndForget } from "@/shared/util/async";
import { motion } from "framer-motion";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { MathUtils, Spherical, Vector3 } from "three";

export type WakeUpState = "initial" | "name-entry" | "character" | "waking";

export function shouldPromptWakeupScreen(
  deps: ClientContextSubset<"resources" | "userId" | "clientConfig">
) {
  return (
    deps.clientConfig.forceCharacterSetup ||
    deps.resources.get("/ecs/c/player_status", deps.userId)?.init === false
  );
}

const WakeUpText: React.FunctionComponent<
  PropsWithChildren<{
    heading: string;
    onTypingComplete?: () => any;
    onClick?: () => any;
  }>
> = ({ heading, onTypingComplete, onClick, children }) => {
  return (
    <div
      className="flex w-1/2 flex-col content-center items-center gap-2 text-center"
      onClick={() => onClick?.()}
    >
      <Typer
        string={heading}
        extraClassNames="text-xxl font-semibold text-shadow-bordered"
        onTypeComplete={() => {
          onTypingComplete?.();
        }}
        beginTyping={true}
        shouldFinishTyping={false}
      />
      {children}
    </div>
  );
};

const CharacterWakeupContent: React.FunctionComponent<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const { userId, events } = useClientContext();
  const [previewAppearance, setPreviewAppearance] = usePreviewAppearance();
  const [previewHair, setPreviewHair, wearableOverrides] = usePreviewHair();

  useEffect(() => {
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
  }, [
    previewAppearance.eye_color_id,
    previewAppearance.hair_color_id,
    previewAppearance.head_id,
    previewAppearance.skin_color_id,
    previewHair?.id,
  ]);

  return (
    <>
      <WakeUpText heading="You try to picture someone...">
        <div className="preview-container h-48 w-1/2">
          <CharacterPreview
            previewSlot={makePreviewSlot("appearencePreview")}
            appearanceOverride={previewAppearance}
            wearableOverrides={wearableOverrides}
            controlTarget={new Vector3(0, 1, 0)}
            cameraPos={new Vector3().setFromSpherical(
              new Spherical(
                3.3,
                MathUtils.degToRad(65),
                MathUtils.degToRad(190)
              )
            )}
          />
        </div>
        <div className="edit-character w-1/2">
          <EditCharacterColorSelector
            previewAppearance={previewAppearance}
            setPreviewAppearance={setPreviewAppearance}
            setPreviewHair={setPreviewHair}
            previewHair={previewHair}
            showHeadShape={true}
            showShuffleOption={false}
          />
        </div>
        <DialogButton
          type="primary"
          size="xl"
          glow
          extraClassNames="w-1/2"
          onClick={() => {
            onComplete();
          }}
        >
          That&apos;s right
        </DialogButton>
      </WakeUpText>
    </>
  );
};

const WakeUpContent: React.FunctionComponent<{ onWakeup: () => void }> = ({
  onWakeup,
}) => {
  const { userId, reactResources, socialManager } = useClientContext();
  const [state, setState] = useState<WakeUpState>("initial");
  const [nameEntry, setNameEntry] = useState(() => {
    const name = reactResources.get("/ecs/c/label", userId)?.text ?? "";
    if (isInitialUsername(name)) {
      return "";
    }
    return name;
  });
  const [error, setError] = useError();
  const [savingName, setSavingName] = useState(false);

  const doUsernameSave = async () => {
    if (nameEntry === reactResources.get("/ecs/c/label", userId)?.text) {
      setState("character");
      return;
    }

    setSavingName(true);
    try {
      await saveUsername(nameEntry);

      fireAndForget(socialManager.userInfoBundle(userId, true)); // Bust cache
      setState("character");
    } catch (error: any) {
      setError(error);
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => reportFunnelStage(`wakeUp:${state}`), [state]);

  const [showContinue, setShowContinue] = useState(false);
  const [showWakeupContinue, setShowWakeupContinue] = useState(false);
  switch (state) {
    case "initial":
      return (
        <div
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2"
          onClick={() => setState("name-entry")}
        >
          <WakeUpText
            heading="You are in a dark place with a mucky feeling..."
            onTypingComplete={() => setShowContinue(true)}
          />

          <span
            style={{ opacity: showContinue ? 1 : 0 }}
            onClick={() => {
              setState("name-entry");
            }}
          >
            <ClickToContinue customText="Click anywhere to continue" />
          </span>
        </div>
      );
    case "name-entry":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <WakeUpText heading="You vaguely recall a name..." key={state}>
            {error && (
              <span className="font-semibold">
                <MaybeError error={error} />
              </span>
            )}
            <motion.div
              className="flex w-1/2 flex-col gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <TalkToInput
                placeholder="Enter your username"
                value={nameEntry}
                spellcheck={false}
                onChange={(e) => {
                  setNameEntry(e.target.value);
                }}
                onEnter={doUsernameSave}
                extraClassName="text-center font-semibold"
              />
              <DialogButton
                type="primary"
                size="xl"
                glow
                disabled={nameEntry.length < 2 || savingName}
                onClick={doUsernameSave}
              >
                {savingName ? "Setting..." : "Set Name"}
              </DialogButton>
            </motion.div>
          </WakeUpText>
        </div>
      );
    case "character":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <CharacterWakeupContent
            onComplete={() => {
              setState("waking");
            }}
          />
        </div>
      );
    case "waking":
      return (
        <div
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2"
          onClick={() => {
            onWakeup();
          }}
        >
          <WakeUpText
            heading={`${nameEntry}... wake up... wake up...`}
            key={"2"}
            onTypingComplete={() => setShowWakeupContinue(true)}
          />
          <span
            style={{ opacity: showWakeupContinue ? 1 : 0 }}
            onClick={() => {
              setState("name-entry");
            }}
          >
            <ClickToContinue customText="Click anywhere to continue" />
          </span>
        </div>
      );
  }

  return <></>;
};

export const WakeUpScreen: React.FunctionComponent<{}> = ({}) => {
  const context = useClientContext();
  const { resources, gardenHose } = context;
  const pointerLockManager = usePointerLockManager();
  const [showScreen, setShowScreen] = useState(
    shouldPromptWakeupScreen(context)
  );

  if (!showScreen) {
    return <></>;
  }

  return (
    <div className="wake-up-container absolute z-[10001] flex h-full w-full flex-col bg-loading-bg">
      <WakeupMuckParticles />
      <WakeUpContent
        onWakeup={() => {
          pointerLockManager.focusAndLock();
          setCanvasEffect(resources, {
            kind: "wakeUp",
            onComplete: () => {
              gardenHose.publish({
                kind: "wake_up_complete",
              });

              fireAndForget(
                makeWakeUpScreenshot(context, {}),
                "Failed to do wakeup screenshot"
              );
            },
          });
          setTimeout(() => {
            setShowScreen(false);
          }, 1);
        }}
      />
    </div>
  );
};
