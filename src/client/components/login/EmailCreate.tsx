import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError } from "@/client/components/system/MaybeError";
import React, { useMemo, useState } from "react";

export const EmailCreate: React.FunctionComponent<{
  error?: any;
  title?: string;
  disclaimer?: string | JSX.Element;
  loggingIn: boolean;
  prepopulateEmail?: string;
  onEmailSignUp: (email: string) => any;
  onCancelPressed: () => any;
}> = ({
  error,
  title,
  disclaimer,
  loggingIn,
  prepopulateEmail,
  onEmailSignUp,
  onCancelPressed,
}) => {
  const [emailAddress, setEmailAddress] = useState(prepopulateEmail ?? "");

  const createDisabled = useMemo(
    () => emailAddress.length === 0 || loggingIn,
    [emailAddress, loggingIn]
  );

  return (
    <div className="biomes-box dialog create-new-account">
      {title && (
        <div className="title-bar no-border">
          <div className="title">{title} </div>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!createDisabled) {
            onEmailSignUp(emailAddress);
          }
        }}
      >
        <div className="dialog-contents">
          {disclaimer && <header className="subtitle"> {disclaimer}</header>}
          <MaybeError error={error} />

          <section className="email-sign-in">
            <label>Email</label>
            <input
              type="email"
              value={emailAddress}
              placeholder="your@email.com"
              onChange={(e) => {
                setEmailAddress(e.target.value);
              }}
              autoComplete="username"
            />
          </section>

          <div className="dialog-button-group">
            <DialogButton
              onClick={() => {
                onEmailSignUp(emailAddress);
              }}
              type="primary"
              disabled={createDisabled}
            >
              {loggingIn ? "Creating..." : "Create Account"}
            </DialogButton>
            <DialogButton onClick={onCancelPressed}>Cancel</DialogButton>
          </div>
        </div>
      </form>
    </div>
  );
};
