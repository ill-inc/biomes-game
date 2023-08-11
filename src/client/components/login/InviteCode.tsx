import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError } from "@/client/components/system/MaybeError";
import type { ValidateInviteCodeResponse } from "@/pages/api/auth/validate_invite_code";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import { pathWithQuery } from "@/shared/util/helpers";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

function normalizeInviteCode(code: string) {
  return code.trim();
}

export const InviteCode: React.FunctionComponent<{
  error: any;
  setError: (error: any) => unknown;
  onInviteCodeValidated: (inviteCode: string) => unknown;
  onCancelPressed: () => unknown;
}> = ({ error, onInviteCodeValidated, setError, onCancelPressed }) => {
  const [inviteCode, setInviteCode] = useState("");
  const [validating, setValidating] = useState(false);
  const inviteField = useRef<HTMLInputElement>(null);

  const inviteButtonDisabled = useMemo(
    () => inviteCode.length === 0 || validating,
    [inviteCode, validating]
  );

  const validateInviteCode = useCallback(async (inviteCode: string) => {
    setValidating(true);
    const normalizedInviteCode = normalizeInviteCode(inviteCode);
    try {
      const response = await jsonFetch<ValidateInviteCodeResponse>(
        pathWithQuery("/api/auth/validate_invite_code", {
          inviteCode: normalizedInviteCode,
        })
      );
      if (response.isValid) {
        onInviteCodeValidated(normalizedInviteCode);
        return;
      } else {
        setError(
          new Error(
            `The invite code '${normalizedInviteCode}' is invalid or is no longer available`
          )
        );
        setInviteCode("");
      }
    } catch (error: any) {
      setError(error);
    } finally {
      setValidating(false);
    }
  }, []);

  useEffect(() => {
    if (inviteField.current) {
      inviteField.current.focus();
    }
  }, []);

  return (
    <div className="biomes-box dialog">
      <div className="title-bar">
        <div className="title">Invite Code</div>
      </div>
      <form
        onSubmit={(e) => {
          if (inviteCode) {
            e.preventDefault();
            void validateInviteCode(inviteCode);
          }
        }}
      >
        <div className="dialog-contents">
          <p>Enter an invite code to create an account.</p>
          <p>
            If you don&apos;t have an invite, join our Discord server for
            automatic access
          </p>
          <MaybeError error={error} />
          <section className="email-sign-in">
            <section>
              <input
                type="text"
                ref={inviteField}
                value={inviteCode}
                placeholder="Invite Code"
                onChange={(e) => {
                  setInviteCode(e.target.value);
                }}
              />
            </section>
          </section>
          <footer className="dialog-button-group">
            <DialogButton
              type="primary"
              dontPreventDefault
              onClick={() => {
                void validateInviteCode(inviteCode);
              }}
              disabled={inviteButtonDisabled}
            >
              {validating ? "Validating" : "Validate"}
            </DialogButton>
            <DialogButton onClick={onCancelPressed}>Cancel</DialogButton>
          </footer>
        </div>
      </form>
    </div>
  );
};
