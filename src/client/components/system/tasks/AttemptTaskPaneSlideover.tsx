import { PaneSlideover } from "@/client/components/system/mini_phone/split_pane/PaneSlideover";
import { AttemptTaskOverlay } from "@/client/components/system/tasks/AttemptTaskOverlay";
import { useTask } from "@/client/util/tasks/manager";
import type { AsyncTask } from "@/client/util/tasks/types";
import { useEffect, useState } from "react";

export const AttemptTaskPaneSlideover: React.FunctionComponent<{
  task?: AsyncTask;
}> = ({ task }) => {
  useTask(task);
  const [showing, setShowing] = useState(!!task);

  useEffect(() => {
    if (task?.status?.kind === "success") {
      setTimeout(() => {
        setShowing(false);
      }, 2000);
    } else if (task) {
      setShowing(true);
    } else if (task === undefined) {
      setShowing(false);
    }
  }, [task]);

  return (
    <PaneSlideover showing={showing}>
      {task ? (
        <AttemptTaskOverlay
          onSuccess={() => {}}
          onCancel={() => setShowing(false)}
          task={task}
        />
      ) : (
        <div />
      )}
    </PaneSlideover>
  );
};
