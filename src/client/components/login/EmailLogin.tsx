import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError } from "@/client/components/system/MaybeError";
import React, { useEffect, useMemo, useRef, useState } from "react";

export const EmailLogin: React.FunctionComponent<{
  error?: any;
  loggingIn: boolean;
  onLogin: (email: string) => any;
  onCancelPressed: () => any;
}> = ({ error, loggingIn, onLogin, onCancelPressed }) => {
  const [emailAddress, setEmailAddress] = useState("");
  const emailField = useRef<HTMLInputElement>(null);

  const loginDisabled = useMemo(
    () => emailAddress.length === 0 || loggingIn,
    [emailAddress, loggingIn]
  );

  useEffect(() => {
    if (emailField.current) {
      emailField.current.focus();
    }
  }, []);

  return (
    <div className="biomes-box dialog email-sign-in">
      <div className="title-bar">
        <div className="title"> Log in </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!loginDisabled) {
            onLogin(emailAddress);
          }
        }}
      >
        <div className="dialog-contents">
          <MaybeError error={error} />

          <div className="email-sign-in">
            <section>
              <label> Email </label>
              <input
                type="email"
                ref={emailField}
                value={emailAddress}
                placeholder="your@email.com"
                onChange={(e) => {
                  setEmailAddress(e.target.value);
                }}
                autoComplete="username"
              />
            </section>
          </div>

          <section className="dialog-button-group">
            <DialogButton
              onClick={() => {
                onLogin(emailAddress);
              }}
              type="primary"
              disabled={loginDisabled}
            >
              {loggingIn ? "Sending..." : "Send Login Link"}
            </DialogButton>
            <DialogButton onClick={onCancelPressed}>Cancel</DialogButton>
          </section>
        </div>
      </form>
    </div>
  );
};
