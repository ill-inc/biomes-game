import {
  QuestHUDSteps,
  TalkToNpcStepDetails,
} from "@/client/components/challenges/QuestViews";
import { viewableStepsForChallenge } from "@/client/components/challenges/helpers";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { DialogButton } from "@/client/components/system/DialogButton";
import { PaneActionSheet } from "@/client/components/system/mini_phone/split_pane/PaneActionSheet";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import type { QuestBundle } from "@/client/game/resources/challenges";
import type { ProgressQuestsRequest } from "@/pages/api/admin/quests/progress";
import { ResetChallengeEvent } from "@/shared/ecs/gen/events";
import { fireAndForget } from "@/shared/util/async";
import { jsonPost } from "@/shared/util/fetch_helpers";
import React from "react";

export const PannableMapLeftPaneQuestSheet: React.FunctionComponent<{
  quest: QuestBundle | undefined;
  setQuest: (v: QuestBundle | undefined) => unknown;
}> = React.memo(({ quest, setQuest }) => {
  const clientContext = useClientContext();
  const [trackingQuest, setTrackingQuest] =
    clientContext.mapManager.react.useTrackingQuestStatus(quest?.biscuit.id);
  const stepsToShow = quest
    ? viewableStepsForChallenge(quest.progress)
    : undefined;
  const isAdmin = clientContext.authManager.currentUser.hasSpecialRole("admin");
  return (
    <PaneActionSheet
      size="action-sheet"
      title={quest?.biscuit.displayName}
      onClose={() => {
        setQuest(undefined);
      }}
      showing={quest !== undefined}
    >
      {quest && (
        <div className="padded-view flex select-text flex-col gap-1">
          {stepsToShow &&
            stepsToShow.map((step) => (
              <div className="flex flex-col gap-1" key={step.id}>
                <TalkToNpcStepDetails step={step} />
              </div>
            ))}
          <div className="mt-1 font-semibold">Objectives</div>
          {quest.progress && <QuestHUDSteps progress={quest.progress} />}
        </div>
      )}
      {quest && (
        <PaneBottomDock>
          <div className="horizontal-button-group">
            <DialogButton
              type={!trackingQuest ? "primary" : undefined}
              disabled={trackingQuest}
              onClick={() => {
                setTrackingQuest(true);
              }}
            >
              Track
            </DialogButton>
            <DialogButton
              onClick={() => {
                fireAndForget(
                  (async () =>
                    clientContext.events.publish(
                      new ResetChallengeEvent({
                        id: clientContext.userId,
                        challenge_id: quest.biscuit.id,
                      })
                    ))()
                );
                setQuest(undefined);
              }}
            >
              Leave Quest
            </DialogButton>
            {isAdmin && (
              <DialogButton
                onClick={() => {
                  void jsonPost<void, ProgressQuestsRequest>(
                    "/api/admin/quests/progress",
                    {
                      userId: clientContext.userId,
                      questId: quest.biscuit.id,
                    }
                  );
                }}
              >
                (Admin) Progress
              </DialogButton>
            )}
          </div>
        </PaneBottomDock>
      )}
    </PaneActionSheet>
  );
});
