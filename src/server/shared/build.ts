import { buildTimestamp } from "@/shared/build";

export function oldestAcceptableBuildTimestamp(): number | undefined {
  if (!buildTimestamp()) {
    return;
  }
  return Math.max(
    CONFIG.oldestAcceptableBuildTimestamp,
    buildTimestamp() - CONFIG.maximumClientBuildAgeMs
  );
}
