import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { ToastHUDNotif } from "@/client/components/toast/ToastHUDNotif";
import { addToast, removeToast } from "@/client/components/toast/helpers";
import { cleanEmitterCallback } from "@/client/util/helpers";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { useEffect } from "react";

export const ToastsHUD: React.FunctionComponent<{}> = ({}) => {
  const { resources, reactResources, gardenHose } = useClientContext();
  const toast = reactResources.use("/toast");
  useEffect(
    () =>
      cleanEmitterCallback(gardenHose, {
        challenge_step_begin: (e) => {
          if ((e.triggerProgress.children?.length ?? 0) === 0) {
            addToast(resources, {
              kind: "new",
              id: `${e.stepId}-new`,
              message: e.triggerProgress.progressString,
            });
          }
        },
        challenge_step_progress: (e) => {
          if (
            (e.triggerProgress.children?.length ?? 0) === 0 &&
            (e.previousProgress ?? 0) < e.progress
          ) {
            addToast(resources, {
              kind: "progress",
              id: `${e.stepId}-progress-${e.triggerProgress.progressString}`,
              message: e.triggerProgress.progressString,
            });
          }
        },
        challenge_step_complete: (e) => {
          if (e.triggerProgress.payload.kind === "challengeClaimRewards")
            return;
          if ((e.triggerProgress.children?.length ?? 0) === 0) {
            addToast(resources, {
              kind: "complete",
              id: `${e.stepId}-complete`,
              message: e.triggerProgress.progressString,
            });
          }
        },
      }),
    []
  );

  return (
    <div className="absolute bottom-[65%] left-0 flex w-full flex-col items-center justify-center text-l font-medium text-shadow-bordered">
      {toast.value.map((e) => (
        <ToastHUDNotif
          key={e.id}
          message={e}
          onComplete={(message) => {
            removeToast(resources, message.id);
          }}
          delay={e.time && Math.max(e.time - secondsSinceEpoch(), 0)}
        />
      ))}
    </div>
  );
};
