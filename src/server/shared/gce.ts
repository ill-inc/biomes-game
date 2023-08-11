import { log } from "@/shared/logging";
import { asyncBackoffOnAllErrorsUntilTruthy } from "@/shared/util/retry_helpers";
import {
  isAvailable as isOnGce,
  resetIsAvailableCache as resetIsOnGceCache,
} from "gcp-metadata";

export async function waitForAuthReady() {
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.DO_NOT_WAIT_FOR_GCE === "1"
  ) {
    return;
  }
  // Check that we're on GCE and wait until so.
  log.info("Waiting for GCE metadata service to be available...");
  await asyncBackoffOnAllErrorsUntilTruthy(
    async () => {
      const onGce = await isOnGce();
      if (!onGce) {
        // The library caches it, disable that.
        resetIsOnGceCache();
      }
      return onGce;
    },
    {
      baseMs: 100,
      maxMs: 5000,
      exponent: 1.2,
    }
  );
}
