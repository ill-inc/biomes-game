import { isRunningOnKubernetes } from "@/server/shared/k8";
import { log } from "@/shared/logging";
import { Timer } from "@/shared/metrics/timer";
import { sleep } from "@/shared/util/async";
import { asyncBackoffOnAllErrors } from "@/shared/util/retry_helpers";
import { fork } from "child_process";
import path from "path";

const LINKERD_HOST = "http://localhost:4191";

export async function shutdownLinkerd() {
  if (!isRunningOnKubernetes()) {
    return;
  }
  try {
    // See: https://linkerd.io/2.11/tasks/graceful-shutdown/
    await asyncBackoffOnAllErrors(
      async () =>
        fetch(`${LINKERD_HOST}/shutdown`, {
          method: "POST",
        }),
      {
        maxAttempts: 3,
        baseMs: 250,
      }
    );
  } catch (error) {
    log.warn("Failed to send shutdown request to linkerd proxy", { error });
  }
}

export function startLinkerdWatchman() {
  // Fork a process to monitor when our process dies to terminate linkerd
  // gracefully.
  if (!isRunningOnKubernetes()) {
    return;
  }
  const watchman = fork(path.join(__dirname, "linkerd_watchman.ts"), {
    env: {
      ...process.env,
      // Override NODE_OPTIONS to eliminate any extra RAM settings.
      NODE_OPTIONS: "--openssl-legacy-provider",
    },
  });
  watchman.on("exit", (code, signal) => {
    log.warn("Linkerd watchman process exited unexpectedly!", { code, signal });
    process.exit(1);
  });
  // We will not be kept alive by the child.
  watchman.unref();
}

export async function waitForLinkerdReady() {
  if (!isRunningOnKubernetes()) {
    return;
  }
  log.info("Waiting for Linkerd to be ready...");
  const timer = new Timer();
  while (true) {
    let lastError: any = "bad response";
    try {
      const response = await fetch(`${LINKERD_HOST}/ready`);
      if (response.status === 200) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    if (timer.elapsed > 30_000) {
      log.warn("Taking a long time for linkerd to become ready", {
        error: lastError,
      });
    }
    await sleep(1000);
  }
}
