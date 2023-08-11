import type { ProgressMessage } from "@/client/game/resources/chat";
import type { ClientReactResources } from "@/client/game/resources/types";
import type { AsyncTask } from "@/client/util/tasks/types";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";

// Allows you to set a task and invalidates if the set task status changes
export function useTask(
  initialTask?: AsyncTask
): [AsyncTask | undefined, Dispatch<SetStateAction<AsyncTask | undefined>>] {
  const [currentTask, setCurrentTask] = useState<AsyncTask | undefined>(
    initialTask
  );
  const invalidationVersionRef = useRef<number>(0);
  const [_, setInvalidationVersion] = useState<number>(0);
  useEffect(() => {
    if (!currentTask) {
      return;
    }

    const onStatusChange = () => {
      invalidationVersionRef.current += 1;
      setInvalidationVersion(invalidationVersionRef.current);
    };
    currentTask.emitter.addListener("onStatusChange", onStatusChange);
    return () => {
      currentTask.emitter.removeListener("onStatusChange", onStatusChange);
    };
  }, [currentTask]);

  return [currentTask, setCurrentTask];
}

export function rootTaskProgressCallback(reactResources: ClientReactResources) {
  return (task: AsyncTask) => {
    reactResources.set("/game_modal", {
      kind: "async_task",
      task,
    });
  };
}

export function attachAmbientProgressMonitor(
  resources: ClientReactResources,
  task: AsyncTask,
  callbacks: {
    successClick?: (task: AsyncTask) => any;
    progressClick?: (task: AsyncTask) => any;
    failureClick?: (task: AsyncTask, error: any) => any;
  } = {}
) {
  let timeoutHandle: NodeJS.Timeout | undefined = undefined;
  const updateMessage = (message: ProgressMessage, ttl?: number) => {
    resources.update("/activity/progress", (progressMessages) => {
      const idx = progressMessages.messages.findIndex(
        (e) => e.id === message.id
      );

      if (idx >= 0) {
        progressMessages.messages[idx] = message;
      } else {
        progressMessages.messages.push(message);
      }
    });

    if (ttl !== undefined) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      timeoutHandle = setTimeout(() => {
        resources.update("/activity/progress", (progressMessages) => {
          progressMessages.messages = progressMessages.messages.filter(
            (e) => e.id !== message.id
          );
        });
      }, ttl);
    }
  };

  const baseMessage: ProgressMessage = {
    id: Math.random(),
    status: "progress",
    body: `${task.viewMetadata.title}: starting`,
    onClick: () => {
      if (callbacks.progressClick) {
        callbacks.progressClick(task);
      }
    },
  };
  updateMessage(baseMessage);

  const successCB = () => {
    task.emitter.removeListener("onSuccess", successCB);
    task.emitter.removeListener("onFailure", failureCB);
    task.emitter.removeListener("onProgressChange", statusChangeCB);

    updateMessage(
      {
        ...baseMessage,
        status: "success",
        body: `${task.viewMetadata.title} succeeded`,
        onClick: () => {
          callbacks?.successClick?.(task);
        },
      },
      10 * 1000
    );
  };

  const failureCB = (error: any) => {
    task.emitter.removeListener("onSuccess", successCB);
    task.emitter.removeListener("onFailure", failureCB);
    task.emitter.removeListener("onProgressChange", statusChangeCB);

    updateMessage(
      {
        ...baseMessage,
        status: "error",
        body: `${task.viewMetadata.title} failed. Click to retry`,
        onClick: () => {
          callbacks?.failureClick?.(task, error);
        },
      },
      30 * 1000
    );
  };

  const statusChangeCB = () => {
    updateMessage({
      ...baseMessage,
      body: `${task.viewMetadata.title}...`,
    });
  };

  task.emitter.on("onFailure", failureCB);
  task.emitter.on("onSuccess", successCB);
  task.emitter.on("onProgressChange", statusChangeCB);
}
