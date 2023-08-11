import { log } from "@/shared/logging";
import { ConditionVariable } from "@/shared/util/async";
import { removeValue } from "@/shared/util/collections";
import { setMaxListeners } from "events";

export class UnboundedAbortController extends AbortController {
  constructor() {
    super();
    if (process.env.IS_SERVER) {
      // NodeJS default for an event target warns at 10,
      // we commonly run into this warning for server code
      // so eliminate it.
      // Use a big number so memory leaks may appear.
      setMaxListeners(10_000, this.signal);
    }
  }

  get aborted() {
    return this.signal.aborted;
  }
}

function toSignal(
  controller: AbortController | AbortSignal | undefined
): AbortSignal | undefined {
  if (controller instanceof AbortController) {
    return controller.signal;
  }
  return controller;
}

// When any of the listed signals (or controllers) are aborted, abort this controller.
export function chain<T extends AbortController>(
  controller: T,
  ...whenAny: (AbortSignal | AbortController | undefined)[]
): T {
  if (whenAny.some((x) => toSignal(x)?.aborted)) {
    controller.abort();
    return controller;
  }
  const abort = () => controller.abort();
  controller.signal.addEventListener(
    "abort",
    () =>
      whenAny.forEach((x) => toSignal(x)?.removeEventListener("abort", abort)),
    { once: true }
  );
  whenAny.forEach((x) =>
    toSignal(x)?.addEventListener("abort", abort, { once: true })
  );
  return controller;
}

export class ChainableAbortController extends UnboundedAbortController {
  chain(child?: AbortSignal) {
    return chain(new ChainableAbortController(), this, child);
  }
}

// Used to create a linked child-signal, is useful when using third party code that might
// be leaky on signal handlers.
export function forkSignal(signal: AbortSignal): AbortSignal {
  return new ChainableAbortController().chain(signal).signal;
}

export class BackgroundTaskController extends ChainableAbortController {
  private readonly tasks: (readonly [string, Promise<unknown>])[] = [];

  get size() {
    return this.tasks.length;
  }

  get taskNames() {
    return Array.from(this.tasks, ([name]) => name);
  }

  chain(child?: AbortSignal) {
    return chain(new BackgroundTaskController(), this, child);
  }

  runInBackground(
    name: string,
    taskFn: (signal: AbortSignal) => Promise<unknown> | undefined,
    taskSignal?: AbortSignal
  ): void {
    if (this.aborted || !taskFn) {
      return;
    }
    const originalCallLocation = new Error();
    const controller = this.chain(taskSignal);
    const running = taskFn(controller.signal);
    if (!running) {
      return;
    }
    const task = [name, running] as const;
    this.tasks.push(task);
    running
      .catch((error) =>
        log.error(`Uncaught exception thrown from background task ${name}:`, {
          error,
          originalStack: originalCallLocation.stack, // Defer computation of this.
        })
      )
      .finally(() => {
        removeValue(this.tasks, task);
        controller.abort();
      });
  }

  async *runGenerator<R>(
    name: string,
    starter: (signal: AbortSignal) => Promise<AsyncIterable<R>>,
    stopper?: () => Promise<void>,
    generatorSignal?: AbortSignal
  ): AsyncIterable<R> {
    const controller = this.chain(generatorSignal);
    const done = new ConditionVariable();
    void this.runInBackground(name, () => done.wait());
    try {
      for await (const value of await starter(controller.signal)) {
        yield value;
      }
      await stopper?.();
    } catch (error) {
      log.error(`${name} generator threw an error:`, { error });
      throw error;
    } finally {
      done.signal();
      controller.abort();
    }
  }

  async wait() {
    await Promise.all(this.tasks.slice().map(([, task]) => task));
  }

  async abortAndWait() {
    this.abort();
    await this.wait();
  }
}

export async function waitForAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return;
  }
  return new Promise((resolve) => {
    const done = () => {
      signal.removeEventListener("abort", done);
      resolve();
    };
    signal.addEventListener("abort", done);
  });
}
