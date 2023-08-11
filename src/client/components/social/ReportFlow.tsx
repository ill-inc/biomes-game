import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  DialogBox,
  DialogBoxContents,
  DialogBoxTitle,
} from "@/client/components/system/DialogBox";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeFillStatusBox } from "@/client/components/system/FillStatusBox";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { makeReport } from "@/client/game/util/report";
import type { ReportFlowTarget } from "@/pages/api/upload/report";
import type { ReportReasons } from "@/shared/asset_defs/reports";
import { reportReasonDescription } from "@/shared/asset_defs/reports";
import { assertNever } from "@/shared/util/type_helpers";
import type { ReactChild } from "react";
import React, { useCallback, useState } from "react";

export const ReportFlow: React.FunctionComponent<{
  target: ReportFlowTarget;
  onClose: () => any;
}> = ({ target, onClose }) => {
  const { rendererController } = useClientContext();
  const [error, _setError] = useError();
  const [reportDone, setReportDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const [reasonState, setReasonState] = useState<ReportReasons>(
    target.kind === "bug" || target.kind === "feedback" ? "other" : "default"
  );
  const [otherReason, setOtherReason] = useState("");

  const doReport = useCallback(async () => {
    setLoading(true);
    try {
      await makeReport(
        { rendererController },
        {
          target,
          reason: reasonState,
          otherReason,
        }
      );
      setReportDone(true);
    } finally {
      setLoading(false);
    }
  }, [reasonState, otherReason]);

  const makeOption = (reason: ReportReasons) => {
    return (
      <option value={reason}>
        {reason === "default"
          ? "Choose Reason..."
          : reportReasonDescription(reason)}
      </option>
    );
  };

  let payload: ReactChild | undefined = undefined;
  switch (target.kind) {
    case "profile":
      payload = (
        <>
          I think this account is...
          <select
            value={reasonState}
            onChange={(e) => setReasonState(e.target.value as ReportReasons)}
          >
            {makeOption("default")}
            {makeOption("explicit")}
            {makeOption("impersonation")}
            {makeOption("scam")}
            {makeOption("other")}
          </select>
          {reasonState === "other" && (
            <input
              type="text"
              placeholder="Reason"
              value={otherReason}
              onChange={(e) => {
                setOtherReason(e.target.value);
              }}
            />
          )}
        </>
      );

      break;

    case "group":
    case "post":
      payload = (
        <>
          <select
            value={reasonState}
            onChange={(e) => setReasonState(e.target.value as ReportReasons)}
          >
            {makeOption("default")}
            {makeOption("explicit")}
            {makeOption("scam")}
            {makeOption("other")}
          </select>
          {reasonState === "other" && (
            <input
              type="text"
              placeholder="Reason"
              value={otherReason}
              onChange={(e) => {
                setOtherReason(e.target.value);
              }}
            />
          )}
        </>
      );
      break;

    case "wakeUp":
    case "feedback":
    case "bug":
      payload = (
        <>
          <p>
            Your feedback will help make Biomes better. Please provide as much
            information as possible so we can help resolve your issue:
          </p>
          <textarea
            placeholder="Report issue or feedback..."
            value={otherReason}
            onChange={(e) => {
              setOtherReason(e.target.value);
            }}
            autoFocus
          />
        </>
      );
      break;

    default:
      assertNever(target);
  }

  return (
    <DialogBox>
      <DialogBoxTitle>Report</DialogBoxTitle>
      <DialogBoxContents>
        <MaybeError error={error} />
        <MaybeFillStatusBox
          type={loading ? "progress" : undefined}
          header="Reporting"
        />
        {reportDone ? (
          <>
            <p className="centered-text">
              Thank you for submitting your request.
            </p>
            <div className="dialog-button-group">
              <DialogButton onClick={onClose}>Done</DialogButton>
            </div>
          </>
        ) : (
          <>
            {payload}
            <div className="dialog-button-group">
              <DialogButton
                type="primary"
                onClick={doReport}
                disabled={
                  reasonState === "default" ||
                  (reasonState === "other" && otherReason.length === 0)
                }
              >
                Report
              </DialogButton>
              <DialogButton onClick={onClose}>Cancel</DialogButton>
            </div>
          </>
        )}
      </DialogBoxContents>
    </DialogBox>
  );
};
