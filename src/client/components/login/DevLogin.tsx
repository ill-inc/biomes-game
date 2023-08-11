import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError } from "@/client/components/system/MaybeError";
import React, { useEffect, useMemo, useRef, useState } from "react";

export const DevLogin: React.FunctionComponent<{
  error?: any;
  loggingIn: boolean;
  defaultUsernameOrId?: string;
  onLogin: (usernameOrId: string) => any;
  onCancelPressed: () => any;
}> = ({ error, loggingIn, defaultUsernameOrId, onLogin, onCancelPressed }) => {
  const [usernameOrId, setUsernameOrId] = useState(defaultUsernameOrId || "");
  const usernameOrIdField = useRef<HTMLInputElement>(null);

  const loginDisabled = useMemo(
    () => usernameOrId.length === 0 || loggingIn,
    [usernameOrId, loggingIn]
  );

  useEffect(() => {
    if (usernameOrIdField.current) {
      usernameOrIdField.current.focus();
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
            onLogin(usernameOrId);
          }
        }}
      >
        <div className="dialog-contents">
          <MaybeError error={error} />

          <div className="email-sign-in">
            <section>
              <label> Username or ID </label>
              <input
                type="text"
                ref={usernameOrIdField}
                value={usernameOrId}
                placeholder={defaultUsernameOrId || "1234"}
                onChange={(e) => {
                  setUsernameOrId(e.target.value);
                }}
              />
            </section>
          </div>

          <section className="dialog-button-group">
            <DialogButton
              onClick={() => {
                onLogin(usernameOrId);
              }}
              type="primary"
              disabled={loginDisabled}
            >
              {loggingIn ? "Logging in..." : "Login"}
            </DialogButton>
            <DialogButton
              onClick={() => {
                onLogin("__new");
              }}
              disabled={loggingIn}
            >
              Create New Account
            </DialogButton>
            <DialogButton onClick={onCancelPressed}>Cancel</DialogButton>
          </section>
        </div>
      </form>
    </div>
  );
};
