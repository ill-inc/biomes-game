import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { MiniPhone } from "@/client/components/system/mini_phone/MiniPhone";
import { useNewMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { MiniPhoneAsyncTaskRootScreen } from "@/client/components/system/tasks/MiniPhoneAsyncTaskRootScreen";
import type { AsyncTask } from "@/client/util/tasks/types";
import { assertNever } from "@/shared/util/type_helpers";
import type { ReactChild } from "react";
import React, { useCallback } from "react";

export type AsyncTaskMiniPhonePayload = {
  kind: "async_task";
  task: AsyncTask;
};

export function renderAsyncTaskMiniPhone(
  payload: AsyncTaskMiniPhonePayload,
  onClose: () => any
): ReactChild {
  switch (payload.kind) {
    case "async_task":
      return (
        <MiniPhoneAsyncTaskRootScreen
          onCancel={onClose}
          onSuccess={onClose}
          task={payload.task}
        />
      );
    default:
      assertNever(payload.kind);
      throw new Error("unreachable");
  }
}

export const MiniPhoneAsyncTaskController: React.FunctionComponent<{
  rootScreen: AsyncTaskMiniPhonePayload;
  onClose: () => any;
}> = ({ rootScreen, onClose }) => {
  const [error, _setError] = useError();
  const navContext = useNewMiniPhoneContext<AsyncTaskMiniPhonePayload>(
    onClose,
    [rootScreen]
  );

  const renderNav = useCallback(
    (payload: AsyncTaskMiniPhonePayload): ReactChild => {
      return renderAsyncTaskMiniPhone(payload, onClose);
    },
    [navContext]
  );

  return (
    <MiniPhone
      renderPayload={renderNav}
      existingContext={navContext}
      onClose={onClose}
      displayType="social"
    >
      <MaybeError error={error} />
    </MiniPhone>
  );
};
