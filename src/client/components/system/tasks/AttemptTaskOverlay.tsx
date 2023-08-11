import { DialogButton } from "@/client/components/system/DialogButton";
import { Img } from "@/client/components/system/Img";
import { MaybeError } from "@/client/components/system/MaybeError";
import { MiniPhoneDialog } from "@/client/components/system/mini_phone/MiniPhoneDialog";
import { iconForTaskStatus } from "@/client/components/system/tasks/helpers";
import { useTask } from "@/client/util/tasks/manager";
import type { AsyncTask } from "@/client/util/tasks/types";

export const AttemptTaskOverlay: React.FunctionComponent<{
  task: AsyncTask;
  onSuccess: () => unknown;
  onCancel: () => unknown;
}> = ({ task, onCancel }) => {
  useTask(task);

  return (
    <MiniPhoneDialog extraClassName="mini-phone-rollover">
      <div className={`status-box biomes-box style-full`}>
        {task.viewMetadata.title && (
          <header> {task.viewMetadata.title} </header>
        )}
        {task.status.kind !== "progress" ? (
          <section className="icon-container">
            <Img src={iconForTaskStatus(task.status.kind)} />
          </section>
        ) : (
          <section className="loading-spinner">
            <Img src={iconForTaskStatus(task.status.kind)} />
          </section>
        )}
        {task.status.kind === "progress" && (
          <footer>{task.status.statusText}</footer>
        )}
        {task.status.kind === "error" && (
          <>
            <MaybeError error={task.status.error} />
            <div className="dialog-button-group">
              <DialogButton
                onClick={() => {
                  void task.attempt().catch(() => {});
                }}
                type="primary"
              >
                Retry
              </DialogButton>
              <DialogButton onClick={onCancel}>Cancel</DialogButton>
            </div>
          </>
        )}
      </div>
    </MiniPhoneDialog>
  );
};
