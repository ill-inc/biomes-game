import { z } from "zod";

export const zReportReasons = z.enum([
  "default",
  "explicit",
  "impersonation",
  "quick",
  "scam",
  "other",
]);

export type ReportReasons = z.infer<typeof zReportReasons>;

export const REPORT_REASON_TITLES = {
  default: "Unknown",
  explicit: "Explicit or Sensitive Content",
  impersonation: "Impersonation",
  scam: "Scam",
  quick: "Quick In-Game Report",
  other: "Other",
} as const;

export function reportReasonDescription(reportReason: ReportReasons): string {
  return REPORT_REASON_TITLES[reportReason] ?? reportReason;
}
