import { LoginRelatedControllerContext } from "@/client/components/static_site/LoginRelatedControllerContext";
import {
  DialogBox,
  DialogBoxContents,
  DialogBoxTitle,
} from "@/client/components/system/DialogBox";
import { DialogButton } from "@/client/components/system/DialogButton";
import { HUDModal } from "@/client/components/system/HUDModal";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import styles from "@/client/styles/new_site.module.css";
import { checkLoggedIn } from "@/client/util/auth";
import { useEffectAsync } from "@/client/util/hooks";
import type { WaitlistSignupRequest } from "@/pages/api/auth/waitlist_signup";
import {
  PLAYER_PROFILE_URL,
  SPLASH_CAPTCHA_PUBLIC_SITEKEY,
} from "@/shared/constants";
import type { BiomesId } from "@/shared/ids";
import { jsonPost } from "@/shared/util/fetch_helpers";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

const LoginFlowController = dynamic(
  () => import("@/client/components/login/LoginFlowController"),
  {
    loading: () => (
      <div className="biomes-box dialog login-flow">
        <div className="dialog-contents">Loading...</div>
      </div>
    ),
  }
);
export const LoginRelatedController: React.FunctionComponent<
  PropsWithChildren<{
    onLogin?: () => unknown;
    defaultUsernameOrId?: BiomesId | string;
    customTitle?: string;
  }>
> = ({ onLogin, defaultUsernameOrId, customTitle, children }) => {
  const nextRouter = useRouter();
  const isLoggedIn = useRef(false);
  const [showLoginFlow, setShowLoginFlow] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [isSignedUp, setIsSignedUp] = useState(false);
  const loginFlowTypeRef = useRef<"create" | "login" | undefined>();
  const [error, setError] = useError();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showCaptchaSignup, setShowCaptchaSignup] = useState(false);
  const [captchaValue, setCaptchaValue] = useState<string | undefined>();
  const [showSignup, setShowSignup] = useState(false);

  const handleLogin = useCallback(async () => {
    if (onLogin) {
      onLogin();
    } else {
      location.href = "/";
    }
  }, [nextRouter]);

  const handleWaitlistSubmit = useCallback(
    (forceCaptchaValue?: string) => {
      if (!waitlistEmail.match(/\S+@\S+\.\S+/)) {
        setError("Please enter a valid email address.");
        return;
      }

      if (!showCaptchaSignup) {
        setShowCaptchaSignup(true);
        return;
      }

      const cv = forceCaptchaValue ?? captchaValue;
      if (!cv) {
        setError("Please pass captcha");
        return;
      }
      setError(null);

      void handleWaitlistSignup(waitlistEmail, cv);
    },
    [waitlistEmail, captchaValue, showCaptchaSignup]
  );

  const handleWaitlistSignup = useCallback(
    async (emailAddress: string, captchaValue: string) => {
      try {
        await jsonPost<void, WaitlistSignupRequest>(
          "/api/auth/waitlist_signup",
          {
            email: emailAddress,
            captchaValue: captchaValue,
          }
        );
        setIsSignedUp(true);
        setShowSignup(false);
      } catch (error: any) {
        setError(error);
      } finally {
      }
    },
    []
  );

  useEffectAsync(async () => {
    isLoggedIn.current = Boolean(await checkLoggedIn());
  });

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSignup]);

  return (
    <LoginRelatedControllerContext.Provider
      value={{
        showLogin() {
          setShowLoginFlow(true);
        },
        showSignUp() {
          setShowSignup(true);
        },
        showingModal: showLoginFlow || showSignup || isSignedUp,
      }}
    >
      {showLoginFlow && (
        <HUDModal
          allowClickToDismiss={false}
          onDismissal={() => {
            setShowLoginFlow(false);
          }}
        >
          <LoginFlowController
            onCancel={() => setShowLoginFlow(false)}
            onCreate={handleLogin}
            onLogin={handleLogin}
            forcedFlow={loginFlowTypeRef.current}
            defaultUsernameOrId={String(defaultUsernameOrId ?? "")}
            customTitle={customTitle}
          />
        </HUDModal>
      )}

      {showSignup && (
        <HUDModal
          onDismissal={() => {
            setIsSignedUp(false);
          }}
        >
          <DialogBox extraClassName={styles.waitlistDialog}>
            <DialogBoxTitle>Join the Waitlist</DialogBoxTitle>
            <DialogBoxContents>
              <MaybeError error={error} />
              <form>
                <section className="dialog-button-group">
                  <input
                    type="email"
                    ref={inputRef}
                    value={waitlistEmail}
                    onChange={(e) => {
                      e.preventDefault();
                      setWaitlistEmail(e.target.value);
                    }}
                    placeholder="Email address"
                  />
                  <DialogButton
                    type="primary"
                    onClick={() => {
                      handleWaitlistSubmit();
                    }}
                  >
                    Join
                  </DialogButton>
                  <DialogButton
                    onClick={() => {
                      setShowSignup(false);
                    }}
                  >
                    Cancel
                  </DialogButton>
                </section>
              </form>
              {showCaptchaSignup && (
                <div className="splash-captcha-wrap">
                  <ReCAPTCHA
                    sitekey={SPLASH_CAPTCHA_PUBLIC_SITEKEY}
                    onChange={(token) => {
                      if (token) {
                        setCaptchaValue(token);
                        setShowCaptchaSignup(false);
                        handleWaitlistSubmit(token);
                      }
                    }}
                  />
                </div>
              )}
            </DialogBoxContents>
          </DialogBox>
        </HUDModal>
      )}

      {isSignedUp && (
        <HUDModal
          onDismissal={() => {
            setIsSignedUp(false);
          }}
        >
          <DialogBox>
            <DialogBoxTitle>You&apos;re on the list!</DialogBoxTitle>
            <DialogBoxContents>
              <p className="centered-text">
                For the earliest access, please fill out your player profile.
              </p>
              <DialogButton
                type="primary"
                onClick={() => {
                  window.open(PLAYER_PROFILE_URL, "_blank");
                }}
              >
                Fill Out Player Profile
              </DialogButton>
              <DialogButton
                onClick={() => {
                  setIsSignedUp(false);
                }}
              >
                Done
              </DialogButton>
            </DialogBoxContents>
          </DialogBox>
        </HUDModal>
      )}
      {children}
    </LoginRelatedControllerContext.Provider>
  );
};
