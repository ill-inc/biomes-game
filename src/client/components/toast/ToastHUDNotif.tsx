import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { InteractionErrorToastMessage } from "@/client/components/toast/types";
import { ToastMessage } from "@/client/components/toast/types";
import { useLocationNameForPosition } from "@/client/util/location_helpers";
import { assertNever } from "@/shared/util/type_helpers";
import { motion } from "framer-motion";
import { useMemo } from "react";

const InteractionErrorToastRender: React.FunctionComponent<{
  toast: InteractionErrorToastMessage;
}> = ({ toast }) => {
  const { reactResources, permissionsManager } = useClientContext();
  const hardnessToItem = useMemo(() => {
    return new Map<number, string>([
      [0, ""],
      [1, ""],
      [2, ""],
      [3, "wooden"],
      [4, "stone"],
      [5, "silver"],
      [6, "gold"],
      [7, "diamond"],
    ]);
  }, []);
  const player = reactResources.use("/scene/local_player");
  const locationName = useLocationNameForPosition(
    toast.error.kind === "acl_permission"
      ? toast.error.pos
      : player.player.position
  );

  const message = useMemo(() => {
    switch (toast.error.kind) {
      case "acl_permission": {
        const maybeRobotId = permissionsManager.robotIdAt(
          reactResources,
          toast.error.pos
        );
        if (maybeRobotId) {
          if (locationName) {
            return `${locationName} is protected`;
          } else {
            return `This land is protected`;
          }
        }

        const verbAndSubject =
          toast.error.action === "placeRobot"
            ? "place a robot"
            : toast.error.action;
        return `Looks like I can't ${verbAndSubject} here.`;
      }
      case "hardness": {
        if (toast.error.hardnessClass >= 8) {
          return "Looks like I can't break this";
        } else {
          return `I need a ${hardnessToItem.get(
            toast.error.hardnessClass
          )} tool to break this.`;
        }
      }
      case "message":
        return toast.error.message;

      default:
        assertNever(toast.error);
    }
  }, [
    toast.error,
    locationName,
    reactResources,
    hardnessToItem,
    player.player.position,
  ]);

  if (!message) {
    return <></>;
  }

  return <div>{message}</div>;
};

const ToastMessage: React.FunctionComponent<{
  message: ToastMessage;
}> = ({ message }) => {
  switch (message.kind) {
    case "new":
    case "complete":
    case "progress":
    case "basic":
      return (
        <>
          {message.message.split("\n").map((e, i) => {
            return (
              <div key={i}>
                {message.kind === "new" && (
                  <div style={{ color: "var(--secondary-gray)" }}>
                    New Objective
                  </div>
                )}

                {message.kind === "complete" && <div>Objective Complete</div>}
                <div>{e}</div>
              </div>
            );
          })}
        </>
      );
    case "interaction_error":
      return <InteractionErrorToastRender toast={message} />;
  }

  return <></>;
};

export const ToastHUDNotif: React.FunctionComponent<{
  message: ToastMessage;
  onComplete: (message: ToastMessage) => unknown;
  delay?: number;
}> = ({ message, onComplete, delay }) => {
  const newStep = message.kind === "new";
  let textColor = "";
  switch (message.kind) {
    case "interaction_error":
      textColor = "text-light-red";
      break;
    case "progress":
      textColor = "text-yellow";
      break;
    default:
      textColor = "text-white";
  }
  return (
    <motion.div
      className={`${textColor} absolute bottom-0 text-center`}
      key={message.id}
      initial={{ opacity: 0, scale: 0.75, y: -50 }}
      animate={{
        opacity: newStep ? [null, 1, 1, 1, 1, 0] : [null, 1, 0],
        scale: [null, 1, 1],
        y: newStep ? -50 : -100,

        transition: {
          times: [0, 0.1, 1],
          duration: newStep ? 3.5 : 2.5,
          delay: (newStep ? 2.5 : 0) + (delay ?? 0),
          scale: { type: "spring", bounce: 0.5 },
        },
      }}
      onAnimationComplete={() => {
        onComplete(message);
      }}
    >
      <ToastMessage message={message} />
    </motion.div>
  );
};
