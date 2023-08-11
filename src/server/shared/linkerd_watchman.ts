import { shutdownLinkerd } from "@/server/shared/linkerd";
import { handleProcessIssues } from "@/server/shared/process";
import { log } from "@/shared/logging";
import { disableExperimentalWarnings } from "@/shared/node_warnings";
import { hostname } from "os";

async function main() {
  handleProcessIssues();
  disableExperimentalWarnings();

  log.info(
    `Linkerd \uD83D\uDD75\uFE0F starting, PID: ${process.pid} / ${hostname()}`
  );

  // Ignore SIGTERM, we rely on our parent dying to know when to exit.
  process.on("SIGTERM", () => {});

  // Wait for disconnect from parent process.
  process.on("disconnect", () => {
    log.info("Linkerd watchman received disconnect from parent process");
    void shutdownLinkerd();
    process.exit(0);
  });
}

void main();
