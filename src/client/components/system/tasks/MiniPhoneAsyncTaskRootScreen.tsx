import { MiniPhoneFixedScreen } from "@/client/components/system/mini_phone/MiniPhoneFixedScreen";
import {
  MiniPhoneScreen,
  MiniPhoneScreenContent,
  MiniPhoneScreenTitle,
} from "@/client/components/system/mini_phone/MiniPhoneScreen";
import { AttemptTaskOverlay } from "@/client/components/system/tasks/AttemptTaskOverlay";
import type { AsyncTask } from "@/client/util/tasks/types";
import React from "react";

export const MiniPhoneAsyncTaskRootScreen: React.FunctionComponent<{
  task: AsyncTask;
  onCancel: () => unknown;
  onSuccess: () => unknown;
}> = ({ task, onCancel, onSuccess }) => {
  return (
    <MiniPhoneScreen>
      <MiniPhoneScreenTitle>Task</MiniPhoneScreenTitle>
      <MiniPhoneScreenContent>
        <MiniPhoneFixedScreen>
          <AttemptTaskOverlay
            task={task}
            onCancel={onCancel}
            onSuccess={onSuccess}
          />
        </MiniPhoneFixedScreen>
      </MiniPhoneScreenContent>
    </MiniPhoneScreen>
  );
};
