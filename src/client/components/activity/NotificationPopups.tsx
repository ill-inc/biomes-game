import {
  MotionProgressNotificationRow,
  NotificationRow,
} from "@/client/components/activity/NotificationRow";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { Envelope } from "@/shared/chat/types";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect } from "react";

export const NotificationPopupRow: React.FunctionComponent<{
  popup: Envelope;
}> = ({ popup }) => {
  return <NotificationRow envelope={popup} viewType="popup" />;
};

export const NotificationPopups: React.FunctionComponent<{}> = ({}) => {
  const { reactResources, notificationsManager } = useClientContext();
  const [popups, progress] = reactResources.useAll(
    ["/activity/popup"],
    ["/activity/progress"]
  );

  useEffect(() => {
    if (popups.messages.length === 0 && progress.messages.length === 0) {
      return;
    }
    const timeout = setTimeout(() => {
      void notificationsManager.markAs("popped");
    }, 10000);
    return () => clearTimeout(timeout);
  }, [popups.messages.length, progress.messages.length]);

  return (
    <ul className={`notifications-hud notifications-list`}>
      <AnimatePresence custom="popLayout">
        {progress.messages.map((progressMessage) => (
          <MotionProgressNotificationRow
            layout
            progressMessage={progressMessage}
            key={`progress-message-${progressMessage.id}`}
            initial={{ x: "100%", opacity: 1 }}
            animate={{ x: "0%", opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", bounce: 0.25 }}
          />
        ))}

        {popups.messages.map((bundle, i) => (
          <motion.div
            layout
            key={`notification-message-${i}`}
            initial={{ x: "100%", opacity: 1 }}
            animate={{ x: "0%", opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", bounce: 0.25 }}
          >
            <NotificationPopupRow popup={bundle} />
          </motion.div>
        ))}
      </AnimatePresence>
    </ul>
  );
};
