import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError } from "@/client/components/system/MaybeError";
import React, { useMemo, useState } from "react";

export const DevCreate: React.FunctionComponent<{
  error?: any;
  title?: string;
  subtitle?: string | JSX.Element;
  loggingIn: boolean;
  prepopulateUsernameOrId?: string;
  onDevSignUp: (usernameOrId: string) => any;
  onCancelPressed: () => any;
}> = ({
  error,
  title,
  subtitle,
  loggingIn,
  prepopulateUsernameOrId,
  onDevSignUp,
  onCancelPressed,
}) => {
  const [usernameOrId, setUsernameOrId] = useState(
    prepopulateUsernameOrId ?? ""
  );

  const createDisabled = useMemo(
    () => usernameOrId.length === 0 || loggingIn,
    [usernameOrId, loggingIn]
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
            onDevSignUp(usernameOrId);
          }
        }}
      >
        <div className="dialog-contents">
          {subtitle && <header className="login-subtitle"> {subtitle}</header>}
          <MaybeError error={error} />

          <section className="email-sign-in">
            <label>Username or ID</label>
            <input
              type="text"
              value={usernameOrId}
              placeholder="1234"
              onChange={(e) => {
                setUsernameOrId(e.target.value);
              }}
              autoComplete="username"
            />
          </section>

          <div className="dialog-button-group">
            <DialogButton
              onClick={() => {
                onDevSignUp(usernameOrId);
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
