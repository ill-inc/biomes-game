import type { ClientContext } from "@/client/game/context";
import type { RendererController } from "@/client/game/renderers/renderer_controller";
import { reportClientError } from "@/client/util/request_helpers";
import type { LogCvalsRequest } from "@/pages/api/cval_logging";
import { BackgroundTaskController } from "@/shared/abort";
import type { LogMessage } from "@/shared/logging";
import { addSink } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { sleep } from "@/shared/util/async";
import {
  AccumulatorContext,
  collectAllWithAccumulation,
  defaultCvalDatabase,
  makeCvalHook,
} from "@/shared/util/cvals";
import { jsonPost } from "@/shared/util/fetch_helpers";

// How often we sample the client's set of cvals and send it to the server.
const TELEMETRY_SAMPLE_PERIOD_SECONDS = 60;

// The maximum number of error logs that we will send to the server for this
// client instance. After a few errors presumably a client will not be
// generating useful new error logging information.
const MAX_SERVER_ERROR_LOGS = 3;

function shouldReportMessage(message: LogMessage): boolean {
  switch (message.severity) {
    case "DEBUG":
    case "INFO":
      return false;
    case "WARNING":
    case "ERROR":
    case "ALERT":
      return true;
  }
}

export class Telemetry {
  private needsToAccumulate = true;
  private cvalAccumulatorContext = new AccumulatorContext();
  private readonly controller = new BackgroundTaskController();
  private errorLogsSent = 0;
  private recentLogMessages: LogMessage[] = [];

  constructor(private readonly rendererController: RendererController) {
    addSink(async (message: LogMessage) => {
      this.recentLogMessages.push(message);
      if (this.recentLogMessages.length > 100) {
        this.recentLogMessages.shift();
      }
      return this.maybeSendErrorToServer(message);
    });

    makeCvalHook({
      path: ["verbose", "log"],
      help: "Recent log messages",
      collect: () => this.recentLogMessages,
      toHumanReadable: (value) => value[value.length - 1]?.message ?? "",
    });
    this.controller.runInBackground("collectAndSend", (signal) =>
      this.periodicallyCollectAndSend(signal)
    );
  }

  private async periodicallyCollectAndSend(signal: AbortSignal) {
    while (await sleep(TELEMETRY_SAMPLE_PERIOD_SECONDS * 1000, signal)) {
      try {
        this.collectAndSend();
      } catch (error) {
        // Ignore errors sending cvals.
      }
    }
  }

  collectAndSend() {
    const cvals = collectAllWithAccumulation(
      defaultCvalDatabase(),
      this.cvalAccumulatorContext,
      performance.now() / 1000
    );
    if (
      document.visibilityState === "hidden" ||
      this.rendererController.renderedFrames === 0
    ) {
      // If the page is currently hidden, don't send in anything since the
      // browser may be throttling CPU/GPU or tweaking setTimeout() resolution
      // and skewing data. Plus it keeps the volume of data down.

      // Make sure we have two consecutive visible collections before sending.
      this.needsToAccumulate = true;
      return;
    }

    if (this.needsToAccumulate) {
      this.needsToAccumulate = false;
      // Skip sending the first collection of data so that accumulated stats
      // are not in a "initialization" state. For example, all rates will
      // be zero in the first collection since at this point there's only
      // one data point to draw from.
      return;
    }

    void jsonPost<void, LogCvalsRequest>("/api/cval_logging", {
      cvals,
      source: "periodic",
    });
  }

  async maybeSendErrorToServer(message: LogMessage): Promise<void> {
    if (
      !shouldReportMessage(message) ||
      this.errorLogsSent >= MAX_SERVER_ERROR_LOGS
    ) {
      return;
    }

    ++this.errorLogsSent;

    const getLogStack = () => {
      const errorStack = new Error().stack;
      if (!errorStack) {
        return;
      }
      // Remove some of the top stack frames since they're all related to
      // logging the error, and not the error itself.
      const errorStackLines = errorStack.split("\n");
      const NUM_LOGGING_STACK_FRAMES = 5;
      return [
        errorStackLines[0],
        ...errorStackLines.slice(1 + NUM_LOGGING_STACK_FRAMES),
      ].join("\n");
    };

    const addStack = (() => {
      if ("stack" in message) {
        return {};
      } else {
        const stack = getLogStack();
        if (!stack) {
          return {};
        }
        return { stack };
      }
    })();

    reportClientError(
      "LoggedError",
      message.message,
      {
        ...message,
        ...addStack,
      },
      message.severity === "WARNING"
    );
  }
}

export async function loadTelemetry(
  loader: RegistryLoader<ClientContext>
): Promise<Telemetry> {
  return new Telemetry(await loader.get("rendererController"));
}
