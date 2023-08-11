import type { ToastMessage } from "@/client/components/toast/types";
import type { ClientResources } from "@/client/game/resources/types";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { remove } from "lodash";

const MIN_TOAST_DELAY_SECONDS = 0.6;

export function addToast(
  resources: ClientResources,
  toastMessage: ToastMessage
) {
  resources.update("/toast", (t) => {
    const existingIndex = t.value.findIndex((e) => e.id === toastMessage.id);
    const alreadyExists = existingIndex !== -1;
    if (alreadyExists) {
      t.value[existingIndex] = {
        ...t.value[existingIndex],
        ...toastMessage,
      };
    } else {
      // Delay these into the future, to prevent overlaps
      const latestToastTime =
        t.value.length > 0 ? t.value[t.value.length - 1].time : undefined;
      const time = latestToastTime
        ? Math.max(
            secondsSinceEpoch(),
            latestToastTime + MIN_TOAST_DELAY_SECONDS
          )
        : secondsSinceEpoch();
      t.value.push({
        ...toastMessage,
        time,
      });
    }
  });
}

export function removeToast(
  resources: ClientResources,
  id: ToastMessage["id"]
) {
  resources.update("/toast", (t) => {
    remove(t.value, (e) => e.id === id);
  });
}
