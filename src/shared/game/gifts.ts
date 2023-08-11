import { secondsSinceEpochToDate } from "@/shared/ecs/config";

export function resetGiveGiftDate(lastGiftTimeSeconds?: number) {
  // Reset if the gifts were last given before midnight UTC
  const resetDate = secondsSinceEpochToDate(lastGiftTimeSeconds ?? 0);
  resetDate.setUTCHours(0, 0, 0, 0);
  resetDate.setUTCDate(resetDate.getUTCDate() + 1);
  return resetDate;
}
