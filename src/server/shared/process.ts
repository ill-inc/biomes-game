import { log } from "@/shared/logging";
import SegfaultHandler from "segfault-handler";

export function handleProcessIssues() {
  process.on("uncaughtException", (error: Error, origin: string) => {
    // eslint-disable-next-line no-console
    log.fatal("Unhandled exception", {
      error,
      origin,
    });
    process.exit(1);
  });
  process.on("unhandledRejection", (reason, promise) => {
    log.error("Unhandled promise rejection", {
      reason,
      promise,
      unhandledRejection: true,
    });
  });
  process.on("exit", (code) => {
    // Use console.log as other event handlers will not be executed.
    // eslint-disable-next-line no-console
    console.log(`About to exit with code: ${code}`);
  });

  SegfaultHandler.registerHandler();
}
