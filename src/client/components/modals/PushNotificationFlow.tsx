import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { log } from "@/shared/logging";
import React, { useCallback } from "react";

export const PushNotificationFlow: React.FunctionComponent<{
  onCancel?: () => any;
}> = ({ onCancel }) => {
  const { pushManager } = useClientContext();
  const [error, _setError] = useError();

  const onEnable = useCallback(async () => {
    onCancel?.();
    try {
      await pushManager.registerPushPermission();
    } catch (error: any) {
      log.error("Error while registering for push", {
        error,
      });
    }
  }, []);

  return (
    <div className="biomes-box dialog">
      <div className="title-bar">
        <div className="title">Push Notifications</div>
      </div>
      <div className="dialog-contents">
        <MaybeError error={error} />
        <div className="centered-text">
          Turn on notifications to be alerted when people interact with you in
          Biomes.
        </div>
        <div className="dialog-button-group">
          <DialogButton type="primary" onClick={onEnable}>
            Enable
          </DialogButton>
          <DialogButton
            onClick={() => {
              pushManager.setSoftDeclinePushPermissions();
              onCancel?.();
            }}
          >
            Not Now
          </DialogButton>
        </div>
      </div>
    </div>
  );
};
