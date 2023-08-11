import { DialogButton } from "@/client/components/system/DialogButton";
import {
  MiniPhoneCloseItem,
  MiniPhoneMoreItem,
} from "@/client/components/system/mini_phone/MiniPhoneMoreItem";
import React from "react";

export const FailedRequirements: React.FunctionComponent<{
  onOkay: () => unknown;
  onWaitlist: () => unknown;
  onTryAnyway: () => unknown;
}> = ({ onOkay, onWaitlist, onTryAnyway }) => {
  return (
    <div className="biomes-box dialog">
      <div className="title-bar">
        <div className="invisible">
          <MiniPhoneCloseItem />
        </div>
        <div className="title">Unsupported Device</div>
        <div className="">
          <MiniPhoneMoreItem onClick={() => onTryAnyway()} />
        </div>
      </div>
      <div className="dialog-contents text-center">
        <p>Sorry, your device is not yet supported.</p>
        <p>Try Biomes on Desktop!</p>
        <footer className="dialog-button-group">
          <DialogButton
            type="primary"
            onClick={() => {
              onWaitlist();
            }}
          >
            Join Waitlist
          </DialogButton>
          <DialogButton
            onClick={() => {
              onOkay();
            }}
          >
            Cancel
          </DialogButton>
        </footer>
      </div>
    </div>
  );
};
