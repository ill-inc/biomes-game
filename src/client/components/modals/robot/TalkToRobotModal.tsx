import type { QuestStepBundle } from "@/client/components/challenges/helpers";
import {
  replaceUsernameInDescription,
  shouldCloseDialog,
  useRelevantStepsForEntity,
} from "@/client/components/challenges/helpers";
import {
  TalkDialogModal,
  TalkToNpcQuestView,
  textAndFinalStepToDialog,
} from "@/client/components/challenges/TalkDialogModal";
import type {
  TalkDialogInfo,
  TalkDialogStepAction,
} from "@/client/components/challenges/TalkDialogModalStep";
import {
  GenericTalkDialogModalStep,
  TalkDialogModalStep,
} from "@/client/components/challenges/TalkDialogModalStep";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { questCategoryToIconSource } from "@/client/components/map/helpers";
import { EntityProfilePic } from "@/client/components/social/EntityProfilePic";
import { useWithUnseenEmptyTransition } from "@/client/util/hooks";
import {
  useCachedUserInfo,
  useCachedUsername,
} from "@/client/util/social_manager_hooks";
import type { RobotVisitorMessageRequest } from "@/pages/api/social/robot_visitor_message";
import { BikkieIds } from "@/shared/bikkie/ids";
import { UpdateRobotNameEvent } from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import { idToNpcType, relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { fireAndForget } from "@/shared/util/async";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { compact } from "lodash";
import React, { useCallback, useEffect, useState } from "react";

export const ImmersiveSignModal: React.FunctionComponent<{
  entityId: BiomesId;
}> = ({ entityId }) => {
  const clientContext = useClientContext();
  const { resources, reactResources } = clientContext;
  const onClose = () => {
    reactResources.set("/game_modal", { kind: "empty" });
  };
  const item = relevantBiscuitForEntityId(resources, entityId);

  const dialog = textAndFinalStepToDialog({
    clientContext,
    text: item?.npcDefaultDialog ?? "<text>This is a sign</text>",
  });

  return (
    <TalkDialogModal entityId={entityId}>
      <GenericTalkDialogModalStep
        entityId={entityId}
        id="sign"
        dialog={dialog}
        title={"Sign"}
        onClose={onClose}
      />
    </TalkDialogModal>
  );
};

export const TalkToRobotModal: React.FunctionComponent<{
  entityId: BiomesId;
  onClose: () => void;
}> = ({ entityId, onClose }) => {
  const clientContext = useClientContext();
  const { reactResources, userId } = clientContext;
  const [label, createdBy] = reactResources.useAll(
    ["/ecs/c/label", entityId],
    ["/ecs/c/created_by", entityId]
  );
  const name = label?.text;

  const [completedSetup, setCompletedSetup] = useState(false);

  useEffect(() => {
    const defaultName = idToNpcType(BikkieIds.biomesRobot).displayName;
    if (name && name !== defaultName) {
      setCompletedSetup(true);
    }
  }, []);
  const createdByPlayer = createdBy?.id === userId;

  return (
    <div className="font-mono">
      {createdByPlayer ? (
        completedSetup ? (
          <RobotSelectAction entityId={entityId} onClose={onClose} />
        ) : (
          <RobotIntroduction
            entityId={entityId}
            setCompletedSetup={setCompletedSetup}
          />
        )
      ) : (
        <RobotGreetGuest entityId={entityId} onClose={onClose} />
      )}
    </div>
  );
};

const RobotGreetGuest: React.FunctionComponent<{
  entityId: BiomesId;
  onClose: () => void;
}> = ({ entityId, onClose }) => {
  const clientContext = useClientContext();
  const { reactResources, userId } = clientContext;
  const [label, createdBy] = reactResources.useAll(
    ["/ecs/c/label", entityId],
    ["/ecs/c/created_by", entityId]
  );

  const creatorName = useCachedUsername(createdBy?.id);
  const [messageToCreator, setMessageToCreator] = useState("");

  const sendMsgToCreator = useCallback(() => {
    if (createdBy && messageToCreator) {
      fireAndForget(
        jsonPost<void, RobotVisitorMessageRequest>(
          "/api/social/robot_visitor_message",
          {
            message: {
              robotId: entityId,
              visitorId: userId,
              message: messageToCreator.trim(),
            },
            to: createdBy.id,
          }
        )
      );
    }
  }, [messageToCreator]);

  const dialog: TalkDialogInfo[] = [
    {
      text: replaceUsernameInDescription(
        clientContext,
        `Greetings {username}, I am ${label?.text} who protects this area.${
          creatorName
            ? ` Should I let **${creatorName}** know you swung by?`
            : ""
        }`
      ),
      actions: compact([
        {
          name: "Goodbye",
          onPerformed: onClose,
        },
        creatorName
          ? {
              name: "Leave a Note",
              type: "primary",
              onPerformed: () => {},
            }
          : undefined,
      ]),
    },
    {
      text: `What would you like me to say to **${creatorName}**?`,
      actions: [
        {
          name: "Cancel",
          onPerformed: onClose,
        },
        {
          name: "Send",
          type: "primary",
          onPerformed: sendMsgToCreator,
          disabled: !messageToCreator.trim(),
        },
      ],
      children: (
        <TalkToInput
          value={messageToCreator}
          onChange={(e) => setMessageToCreator(e.target.value)}
          onEnter={() => sendMsgToCreator()}
        />
      ),
    },
    {
      text: `Okay, I let **${creatorName}** know you said "${messageToCreator}".`,
    },
  ];

  return (
    <TalkDialogModal entityId={entityId}>
      <TalkDialogModalStep
        id={entityId}
        entityId={entityId}
        onClose={onClose}
        dialog={dialog}
      />
    </TalkDialogModal>
  );
};

export const TalkToInput: React.FunctionComponent<{
  value: string;
  placeholder?: string;
  extraClassName?: string;
  spellcheck?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => any;
  onEnter: () => any;
}> = ({
  value,
  placeholder,
  spellcheck,
  extraClassName,
  onChange,
  onEnter,
}) => {
  return (
    <input
      autoFocus
      type="text"
      spellCheck={spellcheck}
      placeholder={placeholder}
      className={`h-7 rounded-l p-1 px-2 text-xl text-shadow-bordered focus:border focus:border-white ${extraClassName}`}
      value={value}
      onChange={onChange}
      onKeyUp={(e) => {
        if (e.code === "Enter") {
          onEnter?.();
        } else if (e.code === "Space") {
          e.stopPropagation();
        }
      }}
    />
  );
};

const RobotSelectAction: React.FunctionComponent<{
  entityId: BiomesId;
  onClose: () => void;
}> = ({ entityId, onClose }) => {
  const clientContext = useClientContext();
  const { resources, reactResources, mapManager } = clientContext;

  const [currentStepBundle, setCurrentStepBundle] = useState<
    QuestStepBundle | undefined
  >();
  const trueAllRelevantSteps = useRelevantStepsForEntity(entityId);
  const allRelevantSteps = useWithUnseenEmptyTransition(
    trueAllRelevantSteps,
    trueAllRelevantSteps.length === 0,
    1000
  );
  const [trackedQuestId] = mapManager.react.useTrackedQuestId();

  // If there is a tracked quest, automatically jump the player
  // into the corresponding quest dialog.
  useEffect(() => {
    const trackedStep = allRelevantSteps.find(
      (step) => step.questBundle.biscuit.id === trackedQuestId
    );
    if (trackedStep && !trackedStep.stepCompleted) {
      setCurrentStepBundle(trackedStep);
    }
  }, [trackedQuestId, allRelevantSteps]);

  // If the current step bundle is an unaccepted quest, show the transmissions screen instead
  useEffect(() => {
    if (currentStepBundle && currentStepBundle.isFirstStep) {
      reactResources.set("/game_modal", {
        kind: "generic_miniphone",
        rootPayload: {
          type: "robot_transmission",
          stepBundle: currentStepBundle,
          robotId: entityId,
        },
      });
    }
  }, [currentStepBundle]);

  const onStepComplete = async (stepId: BiomesId, challengeId: BiomesId) => {
    const alreadyOpenQuests = new Set(
      [...trueAllRelevantSteps].map((e) => e.questBundle.biscuit.id)
    );
    const closeDialogInfo = await shouldCloseDialog(
      resources,
      entityId,
      // Chain to the next quest if it wasn't open at the time of initiating talk to npc
      (newStepId, newChallengeId) =>
        newStepId !== stepId &&
        (challengeId === newChallengeId ||
          !alreadyOpenQuests.has(newChallengeId))
    );

    if (closeDialogInfo.closeDialog) {
      onClose();
    } else {
      setCurrentStepBundle(closeDialogInfo.newStep);
    }
  };

  const dialogActions: TalkDialogStepAction[] = [];
  const uncompletedSteps = allRelevantSteps.filter(
    (step) => !step.stepCompleted
  );

  uncompletedSteps.map((stepBundle) => {
    const categoryIcon = questCategoryToIconSource(
      stepBundle.questBundle.biscuit.questCategory,
      true
    );
    const npcIcon = stepBundle.questBundle.biscuit.questGiver ? (
      <div className="absolute left-2">
        <EntityProfilePic
          entityId={stepBundle.questBundle.biscuit.questGiver}
        />
        <img
          className="absolute right-0 top-0 w-3 translate-x-[40%] translate-y-[-40%]"
          src={categoryIcon}
        />
      </div>
    ) : undefined;
    dialogActions.push({
      name: stepBundle.questBundle.biscuit.displayName,
      type: "normal-filled",
      onPerformed: () => {
        setCurrentStepBundle(stepBundle);
      },
      icon: {
        view: npcIcon,
        src: questCategoryToIconSource(
          stepBundle.questBundle.biscuit.questCategory
        ),
      },
    });
  });

  const dialog = [
    {
      text: replaceUsernameInDescription(
        clientContext,
        dialogActions.length === 0 ? "No transmissions" : "Transmissions"
      ),
      actions: dialogActions,
    },
  ];

  return (
    <>
      {currentStepBundle ? (
        <TalkToNpcQuestView
          talkingToNPCId={entityId}
          stepBundle={currentStepBundle}
          onClose={onClose}
          onStepComplete={onStepComplete}
        />
      ) : (
        <div>
          <TalkDialogModal entityId={entityId}>
            <TalkDialogModalStep
              buttonLayout="vertical"
              id={entityId}
              entityId={entityId}
              onClose={onClose}
              dialog={dialog}
            >
              <div className="flex justify-center">
                <button
                  className="w-full text-shadow-bordered"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </TalkDialogModalStep>
          </TalkDialogModal>
        </div>
      )}
    </>
  );
};

const RobotIntroduction: React.FunctionComponent<{
  entityId: BiomesId;
  setCompletedSetup: (val: boolean) => void;
}> = ({ entityId, setCompletedSetup }) => {
  const clientContext = useClientContext();
  const { socialManager, events, userId } = clientContext;
  const user = useCachedUserInfo(socialManager, userId);
  const [robotName, setRobotName] = useState("");

  useEffect(() => {
    setRobotName(`${user?.user.username}’s Robot`);
  }, [user]);

  const updateRobotName = () => {
    fireAndForget(
      events.publish(
        new UpdateRobotNameEvent({
          id: userId,
          player_id: userId,
          entity_id: entityId,
          name: robotName,
        })
      )
    );
  };

  const dialog: TalkDialogInfo[] = [
    {
      text: replaceUsernameInDescription(
        clientContext,
        "Greetings {username}, a pleasure to meet you. I am your friendly Biomes Robot."
      ),
    },
    {
      text: "What a beautiful area you have chosen. My job is to protect it! Let's take a moment to get things set up.",
    },
    {
      text: "Would you care to give me a friendly name?",
      actions: [
        {
          onPerformed: updateRobotName,
          name: "Set Name",
          type: "primary",
          disabled: !robotName,
        },
      ],
      children: (
        <TalkToInput
          extraClassName={"text-center"}
          value={robotName}
          onChange={(e) => setRobotName(e.target.value)}
          onEnter={updateRobotName}
        />
      ),
    },
    {
      text: "You're all done!",
      actions: [
        {
          name: "Finish",
          onPerformed: () => setCompletedSetup(true),
        },
      ],
    },
  ];

  return (
    <TalkDialogModal entityId={entityId}>
      <TalkDialogModalStep
        id={entityId}
        entityId={entityId}
        onClose={() => {}}
        dialog={dialog}
      />
    </TalkDialogModal>
  );
};
