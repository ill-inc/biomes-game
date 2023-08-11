import { safeStringify } from "@/shared/json";
import { Timer, TimerNeverSet } from "@/shared/metrics/timer";
import { DefaultMap } from "@/shared/util/collections";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import { AsyncLocalStorage } from "async_hooks";
import chalk from "chalk";
import * as _ from "lodash";
import { isError, omit, pick } from "lodash";
import { render } from "prettyjson";
import { serializeError } from "serialize-error";
import { ZodError } from "zod";

declare global {
  // eslint-disable-next-line no-var
  var LOG_ASYNC_CONTEXT: AsyncLocalStorage<Record<string, unknown>> | undefined;
}
if (!globalThis.LOG_ASYNC_CONTEXT) {
  globalThis.LOG_ASYNC_CONTEXT =
    process.env.IS_SERVER || process.env.MOCHA_TEST
      ? new AsyncLocalStorage<Record<string, unknown>>()
      : undefined;
}

export function hasLogContext() {
  return !!LOG_ASYNC_CONTEXT?.getStore();
}

export function addToLogContext(fields: Record<string, unknown>) {
  const store = LOG_ASYNC_CONTEXT?.getStore();
  if (!store) {
    return;
  }
  Object.assign(store, fields);
}

export function withLogContext<R>(
  {
    path,
    extra,
  }: {
    path?: string;
    extra?: Record<string, unknown>;
  },
  fn: () => R
): R {
  if (hasLogContext()) {
    // Don't introduce another, just keep it.
    return fn();
  }
  ok(LOG_ASYNC_CONTEXT, "Expected log async context to exist");
  return LOG_ASYNC_CONTEXT.run(
    <Record<string, unknown>>{
      pathname: path,
      ...(extra ?? {}),
    },
    fn
  );
}

export function isErrorSeverity(severity: string): boolean {
  return severity === "ERROR" || severity === "ALERT";
}

export type LogSeverity = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "ALERT";

export interface LogMessageCore {
  time: string;
  severity: LogSeverity;
  message: string;
}

export interface LogMessage extends LogMessageCore {
  [K: string]: any;
}

export type Sink = (message: LogMessage) => Promise<void>;
const sinks: Sink[] = [];
let pending: Promise<unknown> = Promise.resolve();

export type AdditionalContext = {
  [K: string]: unknown;
  error?: unknown;
  lifecycle?: boolean;
} & {
  // Make sure that callers don't accidentally override the core LogMessage
  // properties by specifying them as context.
  [K in keyof LogMessageCore]?: never;
};

let insertId = 1; // To provide appropriate ordering.

export type LogInfoHook = (info: Record<string, unknown>) => void;
const hooks: LogInfoHook[] = [];

export function addLogInfoHook(hook: LogInfoHook) {
  hooks.push(hook);
}

export function prepareLogMessage(
  severity: LogSeverity,
  message: string,
  context?: any
): LogMessage {
  const logMessage: LogMessage = {
    time: new Date(Date.now()).toISOString(),
    severity,
    message: String(message),
    ...LOG_ASYNC_CONTEXT?.getStore(),
    ...context,
  };
  if (process.env.IS_SERVER && process.env.NODE_ENV === "production") {
    logMessage["logging.googleapis.com/insertId"] = String(insertId++);
    if (isErrorSeverity(severity)) {
      logMessage["@type"] =
        "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent";
    }
  }
  for (const hook of hooks) {
    hook(logMessage);
  }
  return logMessage;
}

export function processLogMessage(logMessage: LogMessage) {
  const done = Promise.all(sinks.map((sink) => sink(logMessage)));
  pending = pending.then(() => done);
}

function outputLog(severity: LogSeverity, message: string, context?: any) {
  processLogMessage(prepareLogMessage(severity, message, context));
}

let voxeloo: VoxelooModule | undefined;
export function setVoxelooForExceptionReporting(v: VoxelooModule) {
  voxeloo = v;
}

export function processContextError<C extends AdditionalContext>(
  severity: LogSeverity,
  message: string,
  context: C | undefined
): [string, any] {
  const [newMessage, newContext] = (() => {
    if (context?.error instanceof ZodError) {
      return [message, { ...context, error: serializeError(context.error) }];
    } else if (
      process.env.NODE_ENV !== "production" &&
      typeof context?.error === "number"
    ) {
      // In development, lets assume that all numeric errors are from WASM.
      return [
        message,
        {
          ...context,
          error: voxeloo?.getExceptionMessage(context.error) ?? context.error,
        },
      ];
    } else if (
      context?.error !== undefined &&
      typeof context.error !== "string" &&
      typeof context.error !== "number"
    ) {
      const errorStack = isError(context.error)
        ? (context.error.stack ?? "").replace(/^Error: /, "")
        : "";
      return [
        `${message}. ${errorStack}`,
        {
          ...context,
          error: process.env.IS_SERVER
            ? omit(
                serializeError(context.error),
                "stack",
                "message",
                "generatedMessage",
                "name"
              )
            : {
                ...serializeError(context.error),
                type: typeof context.error,
              },
        },
      ];
    } else if (isErrorSeverity(severity)) {
      return [
        (new Error(message).stack ?? message).replace(/^Error: /, ""),
        context,
      ];
    } else {
      return [message, context];
    }
  })();

  // Don't modify the message on the client, since browser devtools will
  // already natively associate a callstack, and when this is sent from the
  // server in production, it's hard to apply a source-map to a call stack
  // embedded in the message.
  return [process.env.IS_SERVER ? newMessage : message, newContext];
}

class Logger {
  static lastLogTime = new DefaultMap<string, Timer>(
    () => new Timer(TimerNeverSet)
  );

  static maybeThrottle(throttleMs: number, message: string) {
    const lastLogTime = Logger.lastLogTime.get(message);
    if (lastLogTime.elapsed < throttleMs) {
      return true;
    }
    lastLogTime.reset();
    if (Logger.lastLogTime.size > 1000) {
      log.error(
        "Throttled log output is ineffective due to too many messages!"
      );
      Logger.lastLogTime.clear();
    }
    return false;
  }

  static debug<C extends AdditionalContext>(message: string, context?: C) {
    if (
      process.env.NODE_ENV !== "production" ||
      process.env.DEBUG_LOGGING === "1"
    ) {
      // This must live here to minimize stack depth prior to the logger.
      [message, context] = processContextError("DEBUG", message, context);
      outputLog("DEBUG", message, context);
    }
  }

  static errorAndThrow<C extends AdditionalContext>(
    message: string,
    context?: C
  ) {
    // This must live here to minimize stack depth prior to the logger.
    [message, context] = processContextError("ERROR", message, context);
    outputLog("ERROR", message, context);
    throw new Error(message);
  }

  static error<C extends AdditionalContext>(message: string, context?: C) {
    // This must live here to minimize stack depth prior to the logger.
    [message, context] = processContextError("ERROR", message, context);
    outputLog("ERROR", message, context);
  }

  static prodError<C extends AdditionalContext>(message: string, context?: C) {
    if (process.env.NODE_ENV === "production") {
      Logger.error(message, context);
    } else {
      Logger.debug(message, context);
    }
  }

  static throttledError<C extends AdditionalContext>(
    throttleMs: number,
    message: string,
    context?: C
  ) {
    if (Logger.maybeThrottle(throttleMs, message)) {
      return;
    }
    // This must live here to minimize stack depth prior to the logger.
    [message, context] = processContextError("ERROR", message, context);
    outputLog("ERROR", message, context);
  }

  static fatal<C extends AdditionalContext>(message: string, context?: C) {
    // This must live here to minimize stack depth prior to the logger.
    [message, context] = processContextError("ALERT", message, context);
    // Use console.log as it's synchronous and resilient to issues in the Node
    // event loop.
    // eslint-disable-next-line no-console
    console.log(`Fatal Error: ${message} ${render(context)}`);
    outputLog("ALERT", message, context);
    // What's the point of fatal if you don't die?
    if (process.env.IS_SERVER) {
      // Let the log fully flush.
      void pending.then(() => process.exit(1));
    }
  }

  static info<C extends AdditionalContext>(message: string, context?: C) {
    // This must live here to minimize stack depth prior to the logger.
    [message, context] = processContextError("INFO", message, context);
    outputLog("INFO", message, context);
  }

  static warn<C extends AdditionalContext>(message: string, context?: C) {
    // This must live here to minimize stack depth prior to the logger.
    [message, context] = processContextError("WARNING", message, context);
    outputLog("WARNING", message, context);
  }
}

export const log = Logger;

const severityToColor: { [K in LogSeverity]: chalk.Chalk } = {
  DEBUG: chalk.gray,
  ERROR: chalk.red,
  ALERT: chalk.red,
  INFO: chalk.cyan,
  WARNING: chalk.yellow,
};

const keysToIgnore = new Set([
  "logging.googleapis.com/trace",
  "logging.googleapis.com/spanId",
  "logging.googleapis.com/trace_sampled",
  "logging.googleapis.com/labels",
  "logging.googleapis.com/insertId",
  "severity",
  "time",
  "message",
  "httpRequest",
  "sessionId",
]);
function prettyFormatMessage(
  message: LogMessage,
  { severity = true, time = true }: { severity?: boolean; time?: boolean } = {}
): string {
  let formattedMessage = "";
  if (time && process.env.LOG_TIME !== "0") {
    formattedMessage += message.time + " ";
  }
  if (severity) {
    const withColor = severityToColor[message.severity] || chalk.cyan;
    formattedMessage += withColor(message.severity) + ": ";
  }
  formattedMessage += message.message;

  // Print context information on the same line, unless it's object-like
  // in which case print it after the line.
  const trailer = [];
  for (const key in message) {
    if (keysToIgnore.has(key)) {
      continue;
    }
    const value = message[key];
    if (typeof value === "string" && message.message.startsWith(value)) {
      // Ignore it, it's a repeat of message contents.
      continue;
    }
    // If value is an object
    if (typeof value === "object") {
      trailer.push(key);
    } else {
      formattedMessage += ` ${key}:${value}`;
    }
  }
  if (trailer.length > 0) {
    const newObj = JSON.parse(safeStringify(pick(message, trailer)));
    formattedMessage += "\n" + String(render(newObj));
  }
  return formattedMessage;
}

function normalFormatMessage(message: LogMessage): string {
  return JSON.stringify(message, (_key, value) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    typeof value === "bigint" ? value.toString() + "n" : value
  );
}

if (process.env.IS_SERVER) {
  const formatter =
    process.env.NODE_ENV !== "production" && process.env.RAW_LOGS !== "1"
      ? prettyFormatMessage
      : normalFormatMessage;
  addSink(
    (message: LogMessage) =>
      new Promise((resolve) => {
        process.stderr.write(formatter(message) + "\n", () => resolve());
      })
  );
} else {
  const browserOptions = { severity: false, time: false };
  addSink(async (message: LogMessage) => {
    switch (message.severity) {
      case "ALERT":
      case "ERROR":
        // eslint-disable-next-line no-console
        console.error(prettyFormatMessage(message, browserOptions));
        break;
      case "WARNING":
        // eslint-disable-next-line no-console
        console.warn(prettyFormatMessage(message, browserOptions));
        break;
      case "DEBUG":
        // eslint-disable-next-line no-console
        console.debug(prettyFormatMessage(message, browserOptions));
        break;
      case "INFO":
        // eslint-disable-next-line no-console
        console.info(prettyFormatMessage(message, browserOptions));
        break;
    }
  });
}

export function addSink(sink: Sink) {
  sinks.push(sink);
}

export function removeSink(sink: Sink) {
  _.remove(sinks, (s) => s === sink);
}
