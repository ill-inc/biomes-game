import type { AsyncTask } from "@/client/util/tasks/types";
import spinnerIcon from "/public/hud/spinner.gif";
import errorIcon from "/public/hud/status-failed.png";
import successIcon from "/public/hud/status-success.png";

export function iconForTaskStatus(
  taskStatus: AsyncTask["status"]["kind"]
): string {
  switch (taskStatus) {
    case "error":
      return errorIcon.src;
    case "success":
      return successIcon.src;
    case "init":
    case "progress":
      return spinnerIcon.src;
  }
}
