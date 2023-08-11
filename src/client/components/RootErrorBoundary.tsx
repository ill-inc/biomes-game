import {
  DialogBox,
  DialogBoxContents,
  DialogBoxTitle,
} from "@/client/components/system/DialogBox";
import type { DialogButtonType } from "@/client/components/system/DialogButton";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError } from "@/client/components/system/MaybeError";
import { UnsupportedWebGLError } from "@/client/game/errors";
import { reportClientError } from "@/client/util/request_helpers";
import { resetSafeLocalData } from "@/client/util/resource_helpers";
import type { LogMessage } from "@/shared/logging";
import { addSink, log, removeSink } from "@/shared/logging";
import { messageFromError } from "@/shared/util/helpers";
import type { ErrorInfo, PropsWithChildren } from "react";
import React from "react";

interface ErrorState {
  hasError: true;
  error: unknown;
  busy?: boolean;
}

type StateType =
  | {
      hasError: false;
    }
  | ErrorState;

export type RootErrorBoundaryProps = {};

export class RootErrorBoundary extends React.Component<
  PropsWithChildren<RootErrorBoundaryProps>,
  StateType
> {
  private onFatalLog: (message: LogMessage) => Promise<void>;

  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };

    // It's not a normal private function because we want to bind this upfront.
    // The specific object reference of this function is important so that we
    // can pass the same thing to both addSink and removeSink.
    this.onFatalLog = async (message: LogMessage) => {
      if (message.severity === "ALERT" && !this.state.hasError) {
        reportClientError("FatalError", message.message, message);
        this.setState({
          hasError: true,
          error: new Error(message.message),
        });
      }
    };
  }

  componentDidMount() {
    addSink(this.onFatalLog);
  }
  componentWillUnmount() {
    removeSink(this.onFatalLog);
  }

  static getDerivedStateFromError(error: unknown): ErrorState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, reactInfo: ErrorInfo) {
    reportClientError("ReactError", error, {
      reactInfo,
    });
    log.error("Caught error during react render", {
      error,
      reactInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      const state = this.state;
      return (
        <div className="full-page-error">
          <ErrorDialog
            error={state.error}
            busy={Boolean(state.busy)}
            setBusy={() => this.setState({ ...state, busy: true })}
            cancelError={() => this.setState({ hasError: false })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

const ErrorDialog: React.FunctionComponent<{
  error: unknown;
  busy: boolean;
  setBusy: () => void;
  cancelError: () => void;
}> = ({ error, busy, setBusy, cancelError }) => {
  if (error instanceof UnsupportedWebGLError) {
    return (
      <UnsupportedWebGLErrorDialog
        error={error}
        busy={busy}
        setBusy={setBusy}
      />
    );
  } else {
    return (
      <UnknownErrorDialog
        error={error}
        busy={busy}
        setBusy={setBusy}
        cancelError={cancelError}
      />
    );
  }
};

const UnknownErrorDialog: React.FunctionComponent<{
  error: unknown;
  busy: boolean;
  setBusy: () => void;
  cancelError: () => void;
}> = ({ error, busy, setBusy, cancelError }) => {
  const message = messageFromError(error);
  return (
    <DialogBox>
      <DialogBoxTitle>Unexpected Error</DialogBoxTitle>
      <DialogBoxContents>
        <MaybeError error={message} />
        <div className="full-page-error-description">
          Something went wrong in Biomes. Our engineering team has been alerted.
          We recommend you try refreshing your browser.
        </div>
        <div className="dialog-button-group">
          <RefreshButton type="primary" busy={busy} setBusy={setBusy} />
          <DialogButton
            type="destructive"
            disabled={busy}
            onClick={() => {
              setBusy();
              void (async () => {
                await resetSafeLocalData();
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              })();
            }}
          >
            Clear Cache and Refresh
          </DialogButton>
          <DialogButton
            type="destructive"
            disabled={busy}
            onClick={() => {
              cancelError();
            }}
          >
            {" "}
            Try to Play Anyway
          </DialogButton>
        </div>
      </DialogBoxContents>
    </DialogBox>
  );
};

const UnsupportedWebGLErrorDialog: React.FunctionComponent<{
  error: UnsupportedWebGLError;
  busy: boolean;
  setBusy: () => void;
}> = ({ error, busy, setBusy }) => {
  return (
    <DialogBox>
      <DialogBoxTitle>Unsupported WebGL</DialogBoxTitle>
      <DialogBoxContents>
        <div className="full-page-error-description">
          {error.message} To learn more, see below.
        </div>
        <div className="dialog-button-group">
          <DialogButton
            type="primary"
            disabled={busy}
            onClick={() => {
              if (typeof window !== "undefined") {
                window.open(
                  "https://illinc.notion.site/Biomes-WebGL-Troubleshooting-FAQ-1be5f1c740044ddab5d9446cbdbf8f94?pvs=4",
                  "_blank"
                );
              }
            }}
          >
            {" "}
            See Possible Fixes
          </DialogButton>
          <RefreshButton type="normal" busy={busy} setBusy={setBusy} />
        </div>
      </DialogBoxContents>
    </DialogBox>
  );
};

const RefreshButton: React.FunctionComponent<{
  type: DialogButtonType;
  busy: boolean;
  setBusy: () => void;
}> = ({ type, busy, setBusy }) => {
  return (
    <DialogButton
      type={type}
      disabled={busy}
      onClick={() => {
        setBusy();
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }}
    >
      {" "}
      Refresh
    </DialogButton>
  );
};
