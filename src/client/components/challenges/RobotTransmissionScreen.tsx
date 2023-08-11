import { DecoratedNpcText } from "@/client/components/challenges/QuestViews";
import SimpleTextScreen from "@/client/components/challenges/SimpleTextScreen";
import { TalkToItemDisplay } from "@/client/components/challenges/TalkDialogModal";
import type { QuestStepBundle } from "@/client/components/challenges/helpers";
import { progressQuestAtEntity } from "@/client/components/challenges/helpers";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { DialogButton } from "@/client/components/system/DialogButton";
import { useEffect, useState } from "react";

import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import { EntityProfilePic } from "@/client/components/social/EntityProfilePic";
import type { BiomesId } from "@/shared/ids";
import pluralize from "pluralize";

export const RobotTranmissionScreen: React.FunctionComponent<{
  robotId: BiomesId;
  stepBundle: QuestStepBundle;
}> = ({ robotId, stepBundle }) => {
  const { resources, reactResources, events, userId } = useClientContext();
  const [chosenRewardIndex, setChosenRewardIndex] = useState(0);

  useEffect(() => {
    resources.update("/scene/local_player", (localPlayer) => {
      localPlayer.talkingToNpc = robotId;
    });
    return () => {
      resources.update("/scene/local_player", (localPlayer) => {
        localPlayer.talkingToNpc = undefined;
      });
    };
  }, []);

  const [npcName] = useLatestAvailableComponents(
    stepBundle.questBundle.biscuit.questGiver,
    "label"
  );

  return (
    <SimpleTextScreen>
      <div className="visible flex  flex-[1_1_auto] flex-col gap-2 overflow-x-visible font-mono text-l">
        <div className="mb-2 text-xxl font-semibold">
          {stepBundle.questBundle.biscuit.displayName}
        </div>
        <DecoratedNpcText
          text={stepBundle.dialogText ?? ""}
          highlightClass="font-semibold"
        />
        {stepBundle.questBundle.biscuit.questGiver && (
          <div className="mt-1 flex items-center gap-1">
            --
            <EntityProfilePic
              extraClassName="bg-translucent-white"
              entityId={stepBundle.questBundle.biscuit.questGiver}
            />{" "}
            {npcName?.text ?? "Unknown"}
          </div>
        )}
      </div>
      <div className="flex-0 flex flex-col gap-2 font-mono">
        {stepBundle.rewardsList && stepBundle.rewardsList.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-sm">
              {stepBundle.rewardsList.length > 1
                ? "Choose Rewards"
                : `Enclosed ${pluralize(
                    "Item",
                    stepBundle.rewardsList[0].size
                  )}`}
            </div>
            <TalkToItemDisplay
              containerClassName="flex gap-0.6"
              items={stepBundle.rewardsList}
              chosenItemIndex={chosenRewardIndex}
              setChosenItemIndex={setChosenRewardIndex}
            />
          </div>
        )}
        <div className="flex gap-1">
          <DialogButton
            type="normal"
            size="large"
            onClick={() => reactResources.set("/game_modal", { kind: "empty" })}
          >
            Close
          </DialogButton>
          <DialogButton
            type="primary"
            size="large"
            onClick={async () => {
              const res = await progressQuestAtEntity(
                stepBundle,
                robotId,
                userId,
                resources,
                events,
                undefined
              );
              if (res.kind === "newStep" && res.newStep) {
                reactResources.set("/game_modal", {
                  kind: "generic_miniphone",
                  rootPayload: {
                    type: "robot_transmission",
                    stepBundle: res.newStep,
                    robotId,
                  },
                });
              } else {
                reactResources.set("/game_modal", {
                  kind: "empty",
                });
              }
            }}
          >
            Accept Quest
          </DialogButton>
        </div>
      </div>
    </SimpleTextScreen>
  );
};
