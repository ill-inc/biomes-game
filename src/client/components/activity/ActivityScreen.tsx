import { NotificationRow } from "@/client/components/activity/NotificationRow";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { DialogButton } from "@/client/components/system/DialogButton";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { useIsObserving } from "@/client/util/observer";
import { WATERMARK_MESSAGE_KINDS } from "@/shared/chat/messages";
import { log } from "@/shared/logging";
import { assertNever } from "@/shared/util/type_helpers";
import { partition, sortBy } from "lodash";
import React, { useEffect, useMemo, useState } from "react";

export const PushPermissionsNudge: React.FunctionComponent<{}> = ({}) => {
  const { pushManager } = useClientContext();
  const [version, setVersion] = useState(0);
  const observing = useIsObserving();

  if (observing) {
    return <></>;
  }

  const status = pushManager.hardPermissionsStatus();
  switch (status) {
    case "granted":
      return <></>;
    case "denied":
      return (
        <div className="activity-push-permission">
          Push Notifications are disabled <br />
          <a
            href="https://help.aweber.com/hc/en-us/articles/360051180914-How-do-I-reset-my-browser-permissions-if-Web-Push-Notifications-are-blocked-"
            target="_blank"
            rel="noreferrer"
          >
            See How to Enable
          </a>
        </div>
      );

    case "default":
      return (
        <div className="activity-push-permission">
          <DialogButton
            onClick={() => {
              setVersion(version + 1);
              void (async () => {
                try {
                  await pushManager.registerPushPermission();
                } catch (error: any) {
                  setVersion(version + 1);
                  log.error("Error registering permissions", { error });
                }
              })();
            }}
          >
            Enable Push Notifications
          </DialogButton>
        </div>
      );
      break;

    default:
      assertNever(status);
  }

  return <></>;
};

export const NotificationsScreen: React.FunctionComponent<{}> = ({}) => {
  const { reactResources, notificationsManager } = useClientContext();

  const [readNotifications, unreadNotifications] = useMemo(() => {
    const notifications = reactResources.get("/activity");
    return partition(
      sortBy(notifications.messages ?? [], (e) => -e.createdAt).filter(
        (m) => !WATERMARK_MESSAGE_KINDS.has(m.message.kind)
      ),
      (e) => e.createdAt <= notificationsManager.getWatermark("read")
    );
  }, [reactResources.version("/activity")]);

  useEffect(() => {
    void notificationsManager.markAs("read");
  }, [unreadNotifications.length]);

  return (
    <PaneLayout type="scroll">
      {readNotifications.length + unreadNotifications.length === 0 ? (
        <div className="padded-view-auto-height">No Notifications</div>
      ) : (
        <div className="notifications-list">
          {unreadNotifications.length > 0 && (
            <>
              <label>Unread</label>
              <ul>
                {unreadNotifications.map((e) => (
                  <NotificationRow key={e.id} envelope={e} viewType="list" />
                ))}
              </ul>
            </>
          )}
          {readNotifications.length > 0 && (
            <>
              <label>Read</label>
              <ul>
                {readNotifications.map((e) => (
                  <NotificationRow key={e.id} envelope={e} viewType="list" />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </PaneLayout>
  );
};
