import type { AdditionalContext } from "@/shared/logging";
import { log } from "@/shared/logging";

export function farmLog(
  message: string,
  level: number = 0,
  context?: AdditionalContext
) {
  CONFIG.farmingVerbosity > level && log.info(message, context);
}
