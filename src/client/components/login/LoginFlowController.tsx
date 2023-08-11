import { DevCreate } from "@/client/components/login/DevCreate";
import { DevLogin } from "@/client/components/login/DevLogin";
import { EmailCreate } from "@/client/components/login/EmailCreate";
import { EmailLogin } from "@/client/components/login/EmailLogin";
import { EmailWaiting } from "@/client/components/login/EmailWaiting";
import { FailedRequirements } from "@/client/components/login/FailedRequirements";
import { InviteCode } from "@/client/components/login/InviteCode";
import type { LoginMethod } from "@/client/components/login/LoginMethodPicker";
import { LoginMethodPicker } from "@/client/components/login/LoginMethodPicker";
import { useLoginRelatedControllerContext } from "@/client/components/static_site/LoginRelatedControllerContext";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import {
  AccountDoesntExistError,
  AccountExistsError,
  devLogin,
  emailLogin,
  foreignLogin,
} from "@/client/util/auth";
import type { ForeignAuthProviderName } from "@/server/shared/auth/providers";
import { reportFunnelStage } from "@/shared/funnel";
import { meetsSignInRequirements } from "@/shared/util/helpers";
import Link from "next/link";
import {
  default as React,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import iconEmail from "/public/hud/icon-16-email.png";
import iconDiscord from "/public/hud/icon-discord-vector.png";
import iconGoogle from "/public/hud/icon-google-vector.png";
import iconTwitch from "/public/hud/icon-twitch-vector.png";

type BasicLoginFlowStage = {
  kind:
    | "failed-requirements"
    | "create-or-sign-up"
    | "create"
    | "login"
    | "email-login"
    | "email-waiting"
    | "dev-login";
};

type EmailCreateStage = {
  kind: "email-create";
  prepopulateEmail?: string;
};

type DevCreateStage = {
  kind: "dev-create";
  prepopulateUsernameOrId?: string;
};

type CreateFnStage = {
  kind: "create-fn";
  signUpFn: () => Promise<void>;
};

type InviteCodeStage = {
  kind: "invite-code";
  postCodeDestination: LoginFlowStage;
};

export type LoginFlowStage =
  | BasicLoginFlowStage
  | InviteCodeStage
  | EmailCreateStage
  | DevCreateStage
  | CreateFnStage;

export const LoginFlowController: React.FunctionComponent<{
  onCancel: () => unknown;
  onLogin: () => unknown;
  onCreate: () => unknown;
  forcedFlow?: "create" | "login";
  defaultUsernameOrId?: string;
  customTitle?: string;
}> = ({
  onCancel,
  onLogin,
  onCreate,
  forcedFlow,
  defaultUsernameOrId,
  customTitle,
}) => {
  const [error, setError] = useError();
  const [loggingIn, setLoggingIn] = useState(false);
  const validatedInviteCodeRef = useRef<string | undefined>();
  const loginRelated = useLoginRelatedControllerContext();
  const rootStage = useMemo((): LoginFlowStage => {
    if (forcedFlow === "create") {
      return validatedInviteCodeRef.current
        ? { kind: "create" }
        : { kind: "invite-code", postCodeDestination: { kind: "create" } };
    } else if (forcedFlow === "login") {
      return { kind: "login" };
    }

    return { kind: "create-or-sign-up" };
  }, [validatedInviteCodeRef.current]);

  const failedRequirements = useMemo((): LoginFlowStage | undefined => {
    if (meetsSignInRequirements()) {
      return undefined;
    }

    return {
      kind: "failed-requirements",
    };
  }, []);

  const [stage, setStage] = useState<LoginFlowStage>(
    failedRequirements ?? rootStage
  );

  useEffect(() => {
    reportFunnelStage("shownLoginFlow");
  }, []);

  // Transition between stages without error persisting
  const setStageAndClearError = useCallback(
    (stage: LoginFlowStage) =>
      Promise.all([setStage(stage), setError(), setLoggingIn(false)]),
    []
  );

  const ensureInviteCodeStagePassedStage = useCallback(
    (newStage: LoginFlowStage): LoginFlowStage => {
      if (
        validatedInviteCodeRef.current &&
        validatedInviteCodeRef.current.length > 0
      ) {
        return newStage;
      } else {
        return {
          kind: "invite-code",
          postCodeDestination: newStage,
        };
      }
    },
    []
  );

  // Wrap login and create functions to be account exists/doesnt exist aware
  const wrapLogin = useCallback(
    <T extends any[]>(
      loginFn: (...args: T) => any,
      createFn: (...args: T) => any,
      promptCreate = true,
      nextStage?: LoginFlowStage
    ) => {
      return async (...args: T) => {
        try {
          setLoggingIn(true);
          await loginFn(...args);
          setLoggingIn(false);
          if (nextStage !== undefined) {
            await setStageAndClearError(nextStage);
          } else {
            reportFunnelStage("finishedLoginFlow");
            onLogin();
          }
        } catch (error) {
          setLoggingIn(false);
          if (error instanceof AccountDoesntExistError) {
            if (promptCreate) {
              await setStageAndClearError(
                ensureInviteCodeStagePassedStage({
                  kind: "create-fn",
                  signUpFn: (
                    () => () =>
                      createFn(...args)
                  )(),
                })
              );
            } else {
              await createFn(...args);
            }
          } else {
            setError(error);
          }
        }
      };
    },
    []
  );

  const wrapCreate = useCallback(
    <T extends any[]>(
      createFn: (...args: T) => any,
      existsFn?: (...args: T) => any,
      nextStage?: LoginFlowStage
    ) => {
      return async (...args: T) => {
        try {
          setLoggingIn(true);
          await createFn(...args);
          setLoggingIn(false);
          if (nextStage !== undefined) {
            await setStageAndClearError(nextStage);
          } else {
            reportFunnelStage("finishedLoginFlow");
            onCreate();
          }
        } catch (error) {
          setLoggingIn(false);
          if (error instanceof AccountExistsError) {
            setError("Account exists.");
            if (existsFn) {
              await existsFn(...args);
            }
          } else {
            setError(error);
          }
        }
      };
    },
    []
  );

  // For email, go to the email create screen instead of making an account
  const doEmailLogin = useCallback(
    wrapLogin(
      emailLogin,
      async (emailAddress) => {
        await setStageAndClearError(
          ensureInviteCodeStagePassedStage({
            kind: "email-create",
            prepopulateEmail: emailAddress,
          })
        );
      },
      false,
      {
        kind: "email-waiting",
      }
    ),
    []
  );
  const doEmailCreate = useCallback(
    wrapCreate(emailLogin, undefined, {
      kind: "email-waiting",
    }),
    []
  );

  // For dev, go to the dev choice screen instead of making an account
  const doDevLogin = useCallback(
    wrapLogin(
      devLogin,
      async (usernameOrId) => {
        await setStageAndClearError(
          ensureInviteCodeStagePassedStage({
            kind: "dev-create",
            prepopulateUsernameOrId: usernameOrId,
          })
        );
      },
      false
    ),
    []
  );
  const doDevCreate = useCallback(wrapCreate(devLogin, undefined), []);

  const doForeignCreate = useCallback(
    wrapCreate((provider: ForeignAuthProviderName) =>
      foreignLogin(provider, validatedInviteCodeRef.current)
    ),
    []
  );

  const doForeignLogin = useCallback(
    wrapLogin(
      (provider: ForeignAuthProviderName) => foreignLogin(provider),
      doForeignCreate
    ),
    []
  );

  const subtitleDisclaimer = "Biomes is currently in Early Access";

  const signupDisclaimer = (
    <>
      By continuing you accept the{" "}
      <Link href="/terms-of-service" target="_blank">
        Terms of Use{" "}
      </Link>
      and{" "}
      <Link href="/privacy-policy" target="_blank">
        Privacy Policy
      </Link>
      .
    </>
  );

  const PROD_LOGIN_METHODS: LoginMethod[] = [
    {
      name: "Twitch",
      showByDefault: true,
      icon: iconTwitch.src,
      onLogin: () => doForeignLogin("twitch"),
      onCreate: () => doForeignCreate("twitch"),
    },
    {
      name: "Discord",
      showByDefault: true,
      icon: iconDiscord.src,
      onLogin: () => doForeignLogin("discord"),
      onCreate: () => doForeignCreate("discord"),
    },
    {
      name: "Google",
      icon: iconGoogle.src,
      showByDefault: true,
      onLogin: () => doForeignLogin("google"),
      onCreate: () => doForeignCreate("google"),
    },
    {
      name: "E-mail",
      icon: iconEmail.src,
      disclaimer: "Requires Invite Code",
      onLogin: () => setStageAndClearError({ kind: "email-login" }),
      onCreate: () => setStageAndClearError({ kind: "email-create" }),
    },
  ];

  const DEV_LOGIN_METHODS: LoginMethod[] = [
    {
      name: "Dev",
      showByDefault: true,
      icon: iconEmail.src,
      onLogin: () => setStageAndClearError({ kind: "dev-login" }),
      onCreate: () => setStageAndClearError({ kind: "dev-create" }),
    },
  ];

  const LOGIN_METHODS: LoginMethod[] = [
    ...PROD_LOGIN_METHODS,
    ...(process.env.NODE_ENV === "development" ? DEV_LOGIN_METHODS : []),
  ];

  switch (stage.kind) {
    case "failed-requirements":
      return (
        <FailedRequirements
          onTryAnyway={() => {
            void setStageAndClearError(rootStage);
          }}
          onWaitlist={() => {
            onCancel();
            loginRelated.showSignUp();
          }}
          onOkay={() => {
            onCancel();
          }}
        />
      );
    case "create-or-sign-up":
    case "login":
      return (
        <LoginMethodPicker
          error={error}
          title={customTitle ?? "Biomes Early Access"}
          disclaimer={signupDisclaimer}
          methods={LOGIN_METHODS}
        >
          <div>
            <DialogButton size="marge" onClick={onCancel}>
              Cancel
            </DialogButton>
          </div>
        </LoginMethodPicker>
      );

    case "invite-code":
      return (
        <InviteCode
          onCancelPressed={() => {
            if (rootStage.kind === "invite-code") {
              onCancel();
              return;
            }
            void setStageAndClearError(rootStage);
          }}
          onInviteCodeValidated={(inviteCode) => {
            validatedInviteCodeRef.current = inviteCode;
            void setStageAndClearError(stage.postCodeDestination);
          }}
          error={error}
          setError={setError}
        />
      );
      break;
    case "email-login":
      return (
        <EmailLogin
          error={error}
          loggingIn={loggingIn}
          onCancelPressed={() => setStageAndClearError(rootStage)}
          onLogin={doEmailLogin}
        />
      );
    case "dev-login":
      return (
        <DevLogin
          error={error}
          loggingIn={loggingIn}
          onCancelPressed={() => setStageAndClearError(rootStage)}
          onLogin={doDevLogin}
          defaultUsernameOrId={defaultUsernameOrId}
        />
      );
    case "create":
      return (
        <LoginMethodPicker
          error={error}
          title="Create New Account"
          subtitle={subtitleDisclaimer}
          disclaimer={signupDisclaimer}
          methods={LOGIN_METHODS}
          create={true}
        >
          <DialogButton onClick={onCancel}>Cancel</DialogButton>
        </LoginMethodPicker>
      );
    case "dev-create":
      return (
        <DevCreate
          error={error}
          loggingIn={loggingIn}
          title="Create New Account"
          subtitle={signupDisclaimer}
          onCancelPressed={() => setStageAndClearError({ kind: "create" })}
          prepopulateUsernameOrId={stage.prepopulateUsernameOrId}
          onDevSignUp={(usernameOrId) => {
            void doDevCreate(usernameOrId, validatedInviteCodeRef.current);
          }}
        />
      );
    case "email-create":
      return (
        <EmailCreate
          error={error}
          loggingIn={loggingIn}
          title="Create New Account"
          disclaimer={signupDisclaimer}
          onCancelPressed={() => setStageAndClearError({ kind: "create" })}
          prepopulateEmail={stage.prepopulateEmail}
          onEmailSignUp={(emailAddress) => {
            void doEmailCreate(emailAddress, validatedInviteCodeRef.current);
          }}
        />
      );
    case "email-waiting":
      return <EmailWaiting error={error} />;
    case "create-fn":
      return (
        <div className="biomes-box dialog create-new-account">
          <div className="title-bar no-border">
            <div className="title">Create Account</div>
          </div>
          <div className="dialog-contents">
            <MaybeError error={error} />
            <div className="login-subtitle">
              No existing account found. {signupDisclaimer}
            </div>
            <footer className="dialog-button-group">
              <DialogButton
                onClick={() => {
                  void stage.signUpFn();
                }}
                disabled={loggingIn}
                type="primary"
              >
                Create Account
              </DialogButton>
              <DialogButton onClick={() => setStageAndClearError(rootStage)}>
                Cancel
              </DialogButton>
            </footer>
          </div>
        </div>
      );
  }
};

export default LoginFlowController;
