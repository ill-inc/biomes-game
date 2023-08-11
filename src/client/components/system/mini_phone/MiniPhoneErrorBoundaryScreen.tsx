import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError } from "@/client/components/system/MaybeError";
import { MiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { MiniPhoneFixedScreen } from "@/client/components/system/mini_phone/MiniPhoneFixedScreen";
import {
  MiniPhoneScreen,
  MiniPhoneScreenContent,
  MiniPhoneScreenTitle,
} from "@/client/components/system/mini_phone/MiniPhoneScreen";
import { reportClientError } from "@/client/util/request_helpers";
import { log } from "@/shared/logging";
import { messageFromError } from "@/shared/util/helpers";
import type { ErrorInfo, PropsWithChildren } from "react";
import React from "react";

type StateType = {
  error: boolean;
  errorBusy?: boolean;
  errorMessage?: string;
};

export type MiniphoneErrorBoundaryProps = {};

export class MiniPhoneErrorBoundary extends React.Component<
  PropsWithChildren<MiniphoneErrorBoundaryProps>,
  StateType
> {
  static contextType = MiniPhoneContext;
  declare context: React.ContextType<typeof MiniPhoneContext>;
  constructor(props: MiniphoneErrorBoundaryProps) {
    super(props);
    this.state = { error: false };
  }

  static getDerivedStateFromError(error: any) {
    return { error: true, errorMessage: messageFromError(error) };
  }

  componentDidCatch(error: Error, reactInfo: ErrorInfo) {
    reportClientError("ReactError", error, { reactInfo });
    log.error("Caught error during miniphone react render", {
      error,
      reactInfo,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <MiniPhoneScreen>
          <MiniPhoneScreenTitle>Error In Component</MiniPhoneScreenTitle>
          <MiniPhoneScreenContent>
            <MiniPhoneFixedScreen style="center">
              <MaybeError error={this.state.errorMessage ?? "Unknown Error"} />
              Something went wrong in this component. Our engineering team has
              been alerted.
              <div className="dialog-button-group">
                <DialogButton
                  type="primary"
                  disabled={this.state.errorBusy}
                  onClick={() => {
                    this.context?.close();
                  }}
                >
                  Close
                </DialogButton>
                <DialogButton
                  disabled={this.state.errorBusy}
                  onClick={() => {
                    this.setState({ errorBusy: true });
                    if (typeof window !== "undefined") {
                      window.location.reload();
                    }
                  }}
                >
                  Refresh Browser
                </DialogButton>
              </div>
            </MiniPhoneFixedScreen>
          </MiniPhoneScreenContent>
        </MiniPhoneScreen>
      );
    }
    return this.props.children;
  }
}
