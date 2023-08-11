import { NpcDialogView } from "@/client/components/challenges/QuestViews";
import {
  maybeTranslateDialogText,
  npcTypeForNpcId,
} from "@/client/components/challenges/helpers";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useSelectedLanguage } from "@/client/components/inventory/LanguageSelector";
import type { DialogButtonType } from "@/client/components/system/DialogButton";
import { DialogButton } from "@/client/components/system/DialogButton";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { VoiceChat } from "@/client/components/system/VoiceChat";
import { cleanListener } from "@/client/util/helpers";
import { useEffectAsync } from "@/client/util/hooks";

import type { Voice } from "@/shared/ecs/gen/components";
import type { BiomesId } from "@/shared/ids";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { AnimatePresence, motion } from "framer-motion";
import type { PropsWithChildren, ReactNode } from "react";
import React, { useCallback, useEffect, useState } from "react";

export interface TalkDialogInfo {
  text: string;
  children?: React.ReactNode;
  actions?: TalkDialogStepAction[];
}

export interface TalkDialogStep {
  id: string | BiomesId | number;
  entityId: BiomesId;
  dialog: TalkDialogInfo[];
}

export interface TalkDialogStepAction {
  name: string;
  type?: DialogButtonType;
  tooltip?: string;
  disabled?: boolean;
  onPerformed: () => void;
  icon?: { view?: ReactNode; src?: string; text?: string };
}

export type ButtonLayout = "horizontal-rectangle" | "vertical";

export const ClickToContinue: React.FunctionComponent<{
  className?: string;
  customText?: string;
}> = ({ className, customText }) => {
  return (
    <motion.div
      className={`select-none font-semibold ${className} text-med text-shadow-bordered`}
      initial={{ x: "0%" }}
      animate={{ x: "0%", scale: [1, 0.9, 1] }}
      transition={{ repeat: Infinity, repeatDelay: 1 }}
    >
      {customText ?? "Click to continue"}
    </motion.div>
  );
};

export const TalkDialogModalStep: React.FunctionComponent<
  PropsWithChildren<{
    id: string | BiomesId | number;
    entityId: BiomesId;
    dialog: TalkDialogInfo[];
    onClose?: () => void;
    buttonLayout?: ButtonLayout;
  }>
> = ({
  id,
  entityId,
  dialog,
  buttonLayout = "horizontal-rectangle",
  onClose,
  children,
}) => {
  const { reactResources, resources } = useClientContext();

  const [label, npcMetadata] = reactResources.useAll(
    ["/ecs/c/label", entityId],
    ["/ecs/c/npc_metadata", entityId]
  );

  const npcType = npcTypeForNpcId(reactResources, npcMetadata?.type_id);
  const relevantBiscuit = relevantBiscuitForEntityId(resources, entityId);

  return (
    <GenericTalkDialogModalStep
      entityId={entityId}
      title={
        label?.text ??
        npcType?.displayName ??
        relevantBiscuit?.displayName ??
        "Entity"
      }
      dialog={dialog}
      buttonLayout={buttonLayout}
      id={id}
      onClose={onClose}
    >
      {children}
    </GenericTalkDialogModalStep>
  );
};

function defaultVoiceForEntityId(entityId: BiomesId): Voice {
  const allVoices = [
    ["Ada", "Rb6wDVt4As6GIBwMEmLo"],
    ["Adam", "pNInz6obpgDQGcFmaJgB"],
    ["Adewale", "vD3fnZOnBAZAFnsxeA4q"],
    ["Antoni", "ErXwobaYiN019PkySvjV"],
    ["Arnold", "VR6AewLTigWG4xSOukaG"],
    ["Bella", "EXAVITQu4vr4xnSDxMaL"],
    ["Brim", "PwftKFfZxUEGOrJgcaZ2"],
    ["Bruce", "OnRugliPnYuPahOe6foh"],
    ["Domi", "AZnzlk1XvdvUeBnXmlld"],
    ["Elli", "MF3mGyEYCl7XYWbV9V6O"],
    ["Josh", "TxGEqnHWrfWFTfGW9XjX"],
    ["Matthew", "GjAqk1Kl3r0UbWJCIEde"],
    ["Rachel", "21m00Tcm4TlvDq8ikWAM"],
    ["Sam", "yoZ06aMxZJJ28mfd3POQ"],
    ["Wayne", "TRSrL0HMQMWj1tMy22mU"],
  ];

  return {
    voice: allVoices[entityId % allVoices.length][1],
  };
}

export const GenericTalkDialogModalStep: React.FunctionComponent<
  PropsWithChildren<{
    entityId: BiomesId;
    title: string;
    dialog: TalkDialogInfo[];
    buttonLayout?: ButtonLayout;
    onClose?: () => any;
    id: string | BiomesId | number;
  }>
> = ({
  entityId,
  title,
  dialog,
  onClose,
  buttonLayout = "horizontal-rectangle",
  id,
  children,
}) => {
  const { reactResources } = useClientContext();
  const [beginTyping, setBeginTyping] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);
  const [dialogIndex, setDialogIndex] = useState(0);
  const [shouldFinishTyping, setShouldFinishTyping] = useState(false);

  const voice =
    reactResources.use("/ecs/c/voice", entityId) ??
    defaultVoiceForEntityId(entityId);

  const currentDialog = dialog[dialogIndex] as TalkDialogInfo | undefined;

  const hasActions = !!currentDialog?.actions?.length;

  const finishTyping = () => {
    if (!typingComplete) {
      setShouldFinishTyping(true);
    }
  };

  const goNext = useCallback(() => {
    const isLastStep = dialogIndex >= dialog.length - 1;
    if (isLastStep) {
      onClose?.();
    } else {
      setTypingComplete(false);
      setDialogIndex((idx) => idx + 1);
    }
  }, [dialogIndex, dialog, setDialogIndex, typingComplete]);

  useEffect(() => {
    setBeginTyping(true);
    setTypingComplete(false);
    setShouldFinishTyping(false);
  }, [setTypingComplete, setBeginTyping, dialogIndex]);

  useEffect(() => {
    setDialogIndex(0);
  }, [id]);

  useEffect(() => {
    const advance = () => {
      if (!typingComplete) {
        finishTyping();
      } else if (!hasActions) {
        goNext();
      }
    };
    return cleanListener(window, {
      keyup: (e: KeyboardEvent) => {
        if (e.code === "Space" || e.code === "KeyF") {
          advance();
        }
      },
      mouseup: () => {
        advance();
      },
    });
  }, [hasActions, typingComplete, dialogIndex, dialog]);

  if (!currentDialog) {
    return <>{children}</>;
  }

  const chatVoices = reactResources.get("/tweaks").chatVoices;

  const [language] = useSelectedLanguage();
  const chatTranslation = reactResources.get("/tweaks").chatTranslation;
  const [translatedText, setTranslatedText] = useState<string | undefined>();
  const [translatedSpokenText, setTranslatedSpokenText] = useState<
    string | undefined
  >();
  useEffectAsync(async () => {
    setTranslatedText(undefined);
    setTranslatedSpokenText(undefined);
    const { shownText, spokenText } = await maybeTranslateDialogText(
      reactResources,
      dialog[dialogIndex].text,
      language
    );
    setTranslatedText(shownText);
    setTranslatedSpokenText(spokenText);
  }, [dialog.at(dialogIndex)?.text, language]);

  const actions: TalkDialogStepAction[] = currentDialog.actions ?? [];

  const showNpcAcceptContainer =
    typingComplete && (currentDialog.children || actions.length > 0);
  return (
    <>
      {!!translatedSpokenText?.length && chatVoices && (
        <VoiceChat
          text={translatedSpokenText}
          voice={voice.voice}
          language={chatTranslation ? language : undefined}
        />
      )}
      <AnimatePresence>
        <motion.div
          key={`${id}-${dialogIndex}`}
          className="npc-quest-dialog-container"
          layout
        >
          <motion.div layout className="npc-quest-dialog select-none">
            <div className="npc-name">{title}</div>
            {translatedText && (
              <NpcDialogView
                text={translatedText}
                onTypeComplete={() => {
                  setTypingComplete(true);
                }}
                beginTyping={beginTyping}
                shouldFinishTyping={shouldFinishTyping}
              />
            )}
          </motion.div>
          {showNpcAcceptContainer && (
            <motion.div
              className="npc-accept-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              layout
              transition={{ duration: 0.5 }}
            >
              {currentDialog.children}
              {currentDialog.actions?.length && (
                <div
                  className={`flex ${
                    buttonLayout === "vertical" ? "flex-col" : ""
                  } gap-1`}
                >
                  {actions.map((e, i) => {
                    return (
                      <Tooltipped
                        wrapperExtraClass="w-full max-w-[60%] mx-auto"
                        key={i}
                        tooltip={e.tooltip}
                      >
                        <DialogButton
                          size="xl"
                          disabled={e.disabled}
                          type={e.type ?? undefined}
                          glow={e.type === "primary"}
                          extraClassNames={`items-center flex flex-row
                            ${!e.tooltip ? "w-full max-w-[60%] mx-auto" : ""}
                          `}
                          onClick={() => {
                            e.onPerformed();
                            goNext();
                          }}
                        >
                          {e.icon?.view && <>{e.icon.view}</>}
                          <div className="flex-1">{e.name}</div>
                        </DialogButton>
                      </Tooltipped>
                    );
                  })}
                </div>
              )}
              {children}
            </motion.div>
          )}
        </motion.div>
        {typingComplete && actions.length === 0 && (
          <ClickToContinue
            customText={
              dialogIndex === dialog.length - 1
                ? "Click to close"
                : "Click to continue"
            }
            className="fixed bottom-2"
          />
        )}
      </AnimatePresence>
    </>
  );
};
