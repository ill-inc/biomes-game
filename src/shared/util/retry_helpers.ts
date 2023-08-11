import { log } from "@/shared/logging";
import { sleep } from "@/shared/util/async";

export interface BackoffDelayConfig {
  baseMs: number;
  maxMs?: number;
  exponent?: number;
  jitter?: number;
}

export interface BackoffConfig extends BackoffDelayConfig {
  maxAttempts?: number;
  timeoutMs?: number;
  infoString?: string;
  throwOnResultFailure?: boolean; // default: true
}

export function defaultBackoffConfig(): BackoffConfig {
  return {
    baseMs: 1000,
    timeoutMs: 10000,
  };
}

export class BackoffDelay {
  #ms = 0;
  public first = true;

  constructor(
    private readonly config:
      | (() => BackoffDelayConfig)
      | BackoffDelayConfig = defaultBackoffConfig()
  ) {}

  private get currentConfig(): BackoffDelayConfig {
    return typeof this.config === "function" ? this.config() : this.config;
  }

  get ms() {
    const jitter = this.currentConfig.jitter;
    if (jitter) {
      return this.#ms + jitter * Math.random();
    } else {
      return this.#ms;
    }
  }

  incrementDelay() {
    const config = this.currentConfig;
    if (this.first) {
      this.first = false;
      this.#ms = config.baseMs;
      return;
    }
    this.#ms *= config.exponent ?? 1.25;
    if (config.maxMs !== undefined && this.#ms > config.maxMs) {
      this.#ms = config.maxMs;
    }
  }

  reset() {
    this.first = true;
    this.#ms = 0;
  }

  async wait(signal?: AbortSignal): Promise<boolean> {
    if (this.first) {
      this.incrementDelay();
      return !signal?.aborted;
    } else {
      return sleep(this.ms, signal).finally(() => this.incrementDelay());
    }
  }
}

// Not intended for external usage, use one of the clearer functions below.
export async function asyncSuperBackoff<T>(
  func: () => Promise<T>,
  resultOkay: (result: T) => boolean,
  exceptionOkay: (error: any) => boolean,
  config: BackoffConfig = defaultBackoffConfig()
) {
  const endTime = config.timeoutMs
    ? performance.now() + config.timeoutMs
    : undefined;
  const backoffDelay = new BackoffDelay(config);
  let attempts = 0;
  let gotResult = false;
  let lastException: any;
  let lastResult: T; // We want to preserve the null-ish return type that the func returns (i.e. don't return undefined if it returns null)
  do {
    if (!backoffDelay.first) {
      await sleep(backoffDelay.ms);
    }

    try {
      const result = await func();
      if (resultOkay(result)) {
        return result;
      }

      lastResult = result;
      gotResult = true;
    } catch (error: any) {
      if (!exceptionOkay(error)) {
        throw error;
      }

      lastException = error;
    }
    backoffDelay.incrementDelay();
    attempts += 1;
  } while (
    (endTime === undefined || performance.now() < endTime) &&
    attempts < (config.maxAttempts ?? Infinity)
  );

  if (gotResult) {
    return lastResult!;
  }

  if (exceptionOkay(lastException)) {
    log.error(
      `Timed out while retrying. Since endTime: ${
        endTime !== undefined
          ? performance.now() - endTime + config.timeoutMs!
          : undefined
      } / ${config.timeoutMs}, attempts: ${attempts} / ${config.maxAttempts}`
    );
  }

  throw lastException;
}

export async function asyncBackoffOnAllErrors<T>(
  func: () => Promise<T>,
  config?: BackoffConfig
): Promise<T> {
  return asyncSuperBackoff(
    func,
    () => true,
    () => true,
    config
  );
}

export async function asyncBackoffOnAllErrorsUntilTruthy<T>(
  func: () => Promise<T>,
  config?: BackoffConfig
): Promise<T> {
  return asyncSuperBackoff(
    func,
    (result) => !!result,
    () => true,
    config
  );
}

export async function asyncBackoffOnRecoverableError<T>(
  func: () => Promise<T>,
  exceptionOkay: (errorOkay: any) => boolean,
  config?: BackoffConfig
): Promise<T> {
  return asyncSuperBackoff(func, () => true, exceptionOkay, config);
}

export class TimeoutError extends Error {}

export async function asyncBackoffUntil<T>(
  func: () => Promise<T>,
  resultOkay: (result: T) => boolean,
  config?: BackoffConfig
) {
  const ret = await asyncSuperBackoff(func, resultOkay, () => false, config);
  if (!resultOkay(ret) && (config?.throwOnResultFailure ?? true)) {
    if (config?.infoString) {
      throw new TimeoutError(`Timed out while ${config.infoString}`);
    }
    throw new TimeoutError("Timed out during retries");
  }
  return ret;
}

export async function asyncBackoffUntilTruthy<T>(
  func: () => Promise<T>,
  config?: BackoffConfig
): Promise<T> {
  return asyncBackoffUntil(func, (result) => !!result, config);
}

export async function asyncBackoffUntilNonEmpty<T>(
  func: () => Promise<Array<T>>,
  config?: BackoffConfig
): Promise<Array<T>> {
  return asyncBackoffUntil(func, (result) => result.length > 0, config);
}
