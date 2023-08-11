import { MaybeError } from "@/client/components/system/MaybeError";
import React from "react";

export const EmailWaiting: React.FunctionComponent<{
  error?: any;
}> = ({ error }) => {
  return (
    <div className="biomes-box dialog create-new-account">
      <div className="title-bar">
        <div className="title"> Check Your Inbox </div>
      </div>
      <div className="dialog-contents">
        <MaybeError error={error} />
        <footer className="dialog-button-group">
          <div className="centered-text">
            Check your inbox for a magic login link!
          </div>
        </footer>
      </div>
    </div>
  );
};
