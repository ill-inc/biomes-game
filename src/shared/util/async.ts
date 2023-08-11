import { ChainableAbortController } from "@/shared/abort";
import { log } from "@/shared/logging";
import { Timer } from "@/shared/metrics/timer";
import { mapIterable, removeValue } from "@/shared/util/collections";
import { Queue } from "@/shared/util/queue";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { isFunction } from "lodash";
import { types } from "util";

export async function sleep(
  ms: number,
  signal?: AbortSignal
): Promise<boolean> {
  if (signal?.aborted) {
    return false;
  }
  if (ms <= 0) {
    return yieldToOthers(signal);
  }
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }
    let hitTimeout = false;
    const done = () => {
      signal?.removeEventListener("abort", done);
      clearTimeout(timeout);
      resolve(hitTimeout);
    };
    signal?.addEventListener("abort", done);

    const timeout = setTimeout(() => {
      hitTimeout = true;
      done();
    }, ms);
  });
}

export type MaybePromise<T> = T | Promise<T> | PromiseLike<T>;

type IfPromise<T, Yes, No> = T extends PromiseLike<infer _U> ? Yes : No;
export function ifPromiseThen<T, R>(
  value: T,
  thenFn: (value: Awaited<T>) => R
): IfPromise<T, Promise<R>, R> {
  if (types.isPromise(value)) {
    return (value as Promise<T>).then((resolved) =>
      thenFn(resolved as Awaited<T>)
    ) as IfPromise<T, Promise<R>, R>;
  } else {
    return thenFn(value as Awaited<T>) as IfPromise<T, Promise<R>, R>;
  }
}

export class ConditionVariable {
  private promise: Promise<void> | undefined;
  private resolveCurrentPromiseFn: (() => void) | undefined;

  private resetPromise() {
    this.promise = new Promise<void>((resolve) => {
      this.resolveCurrentPromiseFn = resolve;
    });
  }

  wait(): Promise<void> {
    if (!this.promise) {
      this.resetPromise();
    }
    return this.promise!;
  }

  signal() {
    if (this.resolveCurrentPromiseFn) {
      this.resolveCurrentPromiseFn();
      this.promise = undefined;
      this.resolveCurrentPromiseFn = undefined;
    }
  }
}

export class SignallingValue<T, TCv extends { signal: () => void }> {
  constructor(private v: T, public readonly cv: TCv) {}

  get value(): T {
    return this.v;
  }

  set value(v: T) {
    this.v = v;
    this.cv.signal();
  }
}

// Like a condition variable, but doesn't auto reset.
export class Latch {
  public signalled: boolean = false;
  private resolveFns: (() => void)[] = [];

  // Wait, optionally with a timeout. Returns true if the latch was signalled.
  wait(ms = Infinity): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (this.signalled) {
        resolve(true);
        return;
      }
      const done = () => {
        resolve(this.signalled);
        removeValue(this.resolveFns, done);
        if (timeout) {
          clearTimeout(timeout);
        }
      };
      this.resolveFns.push(done);
      const timeout = isFinite(ms) ? setTimeout(done, ms) : undefined;
    });
  }

  signal() {
    this.signalled = true;
    this.resolveFns.forEach((fn) => fn());
    this.resolveFns.length = 0;
  }

  reset() {
    this.signalled = false;
    this.resolveFns.length = 0;
  }
}

export class Semaphore {
  private readonly cv = new ConditionVariable();

  constructor(private permits: number = 0) {}

  tryAcquire(): boolean {
    if (this.permits > 0) {
      this.permits -= 1;
      return true;
    }
    return false;
  }

  async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      await this.cv.wait();
    }
  }

  release() {
    this.permits += 1;
    this.cv.signal();
  }
}

export class Delayed<T> {
  public satisfied = false;
  private promise: Promise<T> | undefined;
  private resolveCurrentPromiseFn: ((value: T) => void) | undefined;
  private rejectCurrentPromiseFn: ((value: any) => void) | undefined;

  wait(): Promise<T> {
    if (!this.promise) {
      this.promise = new Promise((resolve, reject) => {
        this.resolveCurrentPromiseFn = resolve;
        this.rejectCurrentPromiseFn = reject;
      });
    }
    return this.promise;
  }

  reject(error: any) {
    if (this.satisfied) {
      return;
    }
    if (this.rejectCurrentPromiseFn) {
      this.rejectCurrentPromiseFn(error);
    } else {
      this.promise = Promise.reject(error);
    }
    this.satisfied = true;
  }

  resolve(value: T) {
    if (this.satisfied) {
      return;
    }
    if (this.resolveCurrentPromiseFn) {
      this.resolveCurrentPromiseFn(value);
    } else {
      this.promise = Promise.resolve(value);
    }
    this.satisfied = true;
  }

  async resolveWith(fn: () => Promise<T>) {
    try {
      this.resolve(await fn());
    } catch (error) {
      this.reject(error);
    }
  }
}

export class RoundRobinQueue {
  private next = 0;
  private promises: Promise<void>[] = [];

  constructor(n: number) {
    for (let i = 0; i < n; i += 1) {
      this.promises.push(Promise.resolve());
    }
  }

  push(fn: () => void | Promise<void>) {
    this.promises[this.next] = this.promises[this.next].then(fn);
    this.next = (this.next + 1) % this.promises.length;
  }

  async waitAll() {
    await Promise.all(this.promises);
  }
}

type TaskQueue = Set<Task>;
type Priority = number;

interface Task {
  // This is hooked up to a promise resolve function, so when it is called it
  // will unlock the task code for running.
  taskTriggerConditionVariable: ConditionVariable;
  // Determines the task priority, and can change over time (and thus it may
  // need to be re-evaluated).
  priorityFn: () => number;
  // The priority that this task is currently queued with.
  queuedPriority: number;
}

export interface TaskPriorityQueueOptions {
  // Running multiple tasks every setInterval() wakeup helps get rid of
  // idle time. If this is set too high though, it could interfere with the
  // framerate and cause stuttering.
  maxTaskCount: number;
  // How many tasks should be processed for reprioritization every time
  // we wake up.
  maxReprioritizeBatch: number;
}

const DEFAULT_OPTIONS: TaskPriorityQueueOptions = {
  maxTaskCount: 3,
  maxReprioritizeBatch: 10,
};

export class TaskPriorityQueue {
  private taskQueues: Map<Priority, TaskQueue>;
  // Number of tasks queued regardless of priority.
  private queuedTaskCount = 0;
  // Number of tasks currently running, regardless of priority.
  private runningTasksCount = 0;
  // The list of valid priorities, in descending order.
  private readonly descendingPriorities: number[];
  private setIntervalId?: ReturnType<typeof setInterval>;

  // Queue of items for re-evaluating their priority and potentially
  // re-inserting them into a different priority queue.
  private reprioritizeQueue: Set<Task> = new Set();

  private readonly options: TaskPriorityQueueOptions;

  constructor(
    priorityValues: number[],
    options?: Partial<TaskPriorityQueueOptions>
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.taskQueues = new Map<Priority, TaskQueue>(
      priorityValues.map((x) => [x, new Set()])
    );
    this.descendingPriorities = priorityValues.sort((a, b) => b - a);
  }

  async queueTask<T>(
    fn: (yieldTask: () => Promise<void>) => T,
    priorityFn: () => number
  ) {
    await this.queueTaskTrigger(priorityFn).wait();
    // Regardless of whether or not the `fn` parameter is async, wait for it
    // to complete so that we can keep good accounting on when this task is
    // running.
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const result = await fn(() => {
      this.decrementRunningTasksCount();
      return this.queueTaskTrigger(priorityFn).wait();
    });
    this.decrementRunningTasksCount();
    return result;
  }

  numPendingTasks(priority: number) {
    const taskQueueState = this.taskQueues.get(priority);
    ok(taskQueueState);
    return taskQueueState.size;
  }

  private queueTaskTrigger(priorityFn: () => number): ConditionVariable {
    const taskTriggerConditionVariable = new ConditionVariable();

    // Get the current priority of the task so we know which queue to put it
    // in.
    const priority = priorityFn();
    const queue = this.taskQueues.get(priority);
    ok(queue);

    const task = {
      taskTriggerConditionVariable: taskTriggerConditionVariable,
      priorityFn: priorityFn,
      queuedPriority: priority,
    };

    queue.add(task);
    ++this.queuedTaskCount;

    this.reprioritizeQueue.add(task);
    ok(this.reprioritizeQueue.size === this.queuedTaskCount);

    // If there were no currently running tasks in the task queue until this
    // new one arrived, we were probably not running the task scheduler, so
    // potentially start it now.
    this.maybeEnableOrDisableScheduling();

    return taskTriggerConditionVariable;
  }

  private triggerNextTasks(numTasksToTrigger: number) {
    if (numTasksToTrigger <= 0) {
      return;
    }

    // Find a queue to pull from, starting from highest priority, and according
    // to the remaining task budget.
    const nextQueuePriority = this.descendingPriorities.find((x) => {
      return this.taskQueues.get(x)!.size > 0;
    });
    ok(nextQueuePriority != undefined);

    // Pull out the next task to run.
    const queue = this.taskQueues.get(nextQueuePriority)!;
    const [nextTask] = queue;
    ok(nextTask);
    queue.delete(nextTask);

    const newPriority = nextTask.priorityFn();
    if (newPriority < nextQueuePriority) {
      // The task has a lower priority now than it did before, requeue it
      // with the new priority.
      const newQueue = this.taskQueues.get(newPriority);
      ok(newQueue);
      nextTask.queuedPriority = newPriority;
      newQueue.add(nextTask);
      // And go to find a new task to run instead now.
      // No task execution state has changed, so schedulingNeeded should still be true.
      ok(this.schedulingNeeded());
      this.triggerNextTasks(numTasksToTrigger);
      return;
    }
    this.reprioritizeQueue.delete(nextTask);

    // Release the task for execution. Note that we're not actually executing the task
    // here, we're just signaling that it can execute. The browser's scheduler will then
    // be responsible for actually running the task.
    ++this.runningTasksCount;
    nextTask.taskTriggerConditionVariable.signal();
    --this.queuedTaskCount;

    // Either the increase in the number of running tasks or the decrease in the number
    // of queued tasks may have resulted in active task scheduling no longer being
    // needed, so check to see if it should be disabled or not.
    this.maybeEnableOrDisableScheduling();

    if (this.schedulingNeeded()) {
      this.triggerNextTasks(numTasksToTrigger - 1);
    }
  }

  private decrementRunningTasksCount() {
    --this.runningTasksCount;
    // A reduction in the number of running tasks could result in the scheduler becoming
    // able to schedule more tasks, so potentially re-enable it here.
    this.maybeEnableOrDisableScheduling();
  }

  // Depending on the state of `this.schedulingNeeded()`, start or stop the
  // `setInterval`-based scheduling. We want to avoid busy/redundant wakeups if
  // there is no scheduling work to be done.
  private maybeEnableOrDisableScheduling() {
    if (!this.setIntervalId && this.schedulingNeeded()) {
      this.setIntervalId = setInterval(() => {
        this.reprioritize();
        this.triggerNextTasks(
          this.options.maxTaskCount - this.runningTasksCount
        );
      });
    } else if (this.setIntervalId && !this.schedulingNeeded()) {
      // No tasks to run, time to clear the `setInterval` and sleep.
      clearInterval(this.setIntervalId);
      this.setIntervalId = undefined;
    }
  }

  // Are there active tasks to be run?
  private schedulingNeeded(): boolean {
    return this.queuedTaskCount > 0;
  }

  // Iterate through a few of the pending tasks and check to see if their
  // priorities have changed since they were queued or previously reprioritized.
  private reprioritize() {
    const batchCount = Math.min(
      this.options.maxReprioritizeBatch,
      this.reprioritizeQueue.size
    );
    for (let i = 0; i < batchCount; ++i) {
      const [task] = this.reprioritizeQueue;
      this.reprioritizeQueue.delete(task);

      const newPriority = task.priorityFn();
      if (newPriority != task.queuedPriority) {
        const oldQueue = this.taskQueues.get(task.queuedPriority);
        ok(oldQueue);
        const newQueue = this.taskQueues.get(newPriority);
        ok(newQueue);

        oldQueue.delete(task);
        newQueue.add(task);
        task.queuedPriority = newPriority;
      }
      this.reprioritizeQueue.add(task);
    }
  }
}

export class PromiseQueue {
  private readonly cv = new ConditionVariable();
  private inflight = 0;
  private waiting = 0;

  constructor(private readonly maxInFlight: number) {}

  async push(p: () => Promise<void>): Promise<void> {
    while (this.inflight >= this.maxInFlight) {
      ++this.waiting;
      await this.cv.wait();
      --this.waiting;
    }
    ++this.inflight;
    return p().finally(() => {
      --this.inflight;
      this.cv.signal();
    });
  }

  numInflight() {
    return this.inflight;
  }

  numWaiting() {
    return this.waiting;
  }
}

// Channel that supports two primary operations:
// - push(value): push a value into the channel
// - pop(): return a batch of values, waiting for at least one
// - close(): close the channel, no more values accepted and unblock pop.
export class BatchingChannel<Value> {
  private readonly cv = new ConditionVariable();
  private buffer?: Value[] = [];

  push(...values: Value[]) {
    if (this.buffer === undefined) {
      return false;
    }
    this.buffer.push(...values);
    this.cv.signal();
    return true;
  }

  async pop(): Promise<Value[]> {
    if (this.buffer === undefined) {
      return [];
    } else if (this.buffer.length === 0) {
      await this.cv.wait();
    }
    if (this.buffer === undefined) {
      return [];
    }
    const batch = this.buffer;
    this.buffer = [];
    return batch;
  }

  close() {
    this.buffer = undefined;
    this.cv.signal();
  }
}

// Similar to `setInterval`, but async, and the timer count is re-evaluated may
// be re-evaluated after each run. The starts of each timer function call should
// be spaced apart according to `intervalMs`, assuming CPU is available.
export class RepeatingAsyncTimer {
  private pendingPromise: Promise<void> = Promise.resolve();
  private timeoutId?: ReturnType<typeof setTimeout>;
  private readonly intervalMs: () => number;

  constructor(
    private fn: (() => Promise<void>) | (() => void),
    intervalMs: number | (() => number)
  ) {
    this.intervalMs =
      typeof intervalMs === "number" ? () => intervalMs : intervalMs;
    const timerFunction = () => {
      const startTime = performance.now();
      this.pendingPromise = this.pendingPromise.then(async () => {
        const result = this.fn();
        if (types.isPromise(result)) {
          await result;
        }
        if (this.timeoutId !== undefined) {
          // Setting timeoutId to undefined is how stop() communicates that it's
          // time to stop the timer. So if we make it here, we're good to keep
          // going.
          const duration = performance.now() - startTime;
          const intervalTimeRemaining = Math.max(
            0,
            this.intervalMs() - duration
          );
          this.timeoutId = setTimeout(timerFunction, intervalTimeRemaining);
        }
      });
    };

    this.timeoutId = setTimeout(timerFunction, this.intervalMs());
  }

  async stop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
    await this.pendingPromise;
  }
}

export class Countdown {
  private readonly cv = new ConditionVariable();
  constructor(private count: number) {
    ok(count > 0);
  }

  decrement(): void {
    ok(this.count > 0, "Countdown already triggered.");
    this.count--;
    if (this.count === 0) {
      this.cv.signal();
    }
  }

  async wait(): Promise<void> {
    if (this.count > 0) {
      await this.cv.wait();
    }
  }
}

// Waits on pushes when the queue is full, and waits on pops when the queue
// is empty. Pops will always return a value, it's the caller's responsibility
// to find a protocol for how to shutdown the queue, for example,
//   T = MyValue | undefined, and popping undefined means it's the last value.
export class WaitQueue<T> {
  private queue = new Queue<T>();
  private notFull = new ConditionVariable();
  private notEmpty = new ConditionVariable();

  constructor(private readonly maxSize: number = Infinity) {}

  async push(x: T): Promise<void> {
    while (this.queue.size() >= this.maxSize) {
      await this.notFull.wait();
    }

    this.queue.push(x);
    this.notEmpty.signal();
  }

  async pop(): Promise<T> {
    while (this.queue.size() <= 0) {
      await this.notEmpty.wait();
    }

    const value = this.queue.pop()!;
    this.notFull.signal();
    return value;
  }
}

// Awaits all promises, but only N at a given time.
export async function asyncAllPooled<T>(
  input: Iterable<T>,
  f: (x: T) => Promise<void>,
  poolSize: number
) {
  // Use the waitQueue as a semaphore.
  const waitQueue = new WaitQueue<void>(poolSize);
  return Promise.all(
    mapIterable(input, async (x) => {
      await waitQueue.push();
      await f(x);
      await waitQueue.pop();
    })
  );
}

// Adds a queue between the production and consumption of a generator. This
// enables the generator to yield at a rate that is decoupled from the rate of
// its consumption, at the cost of the memory required for the queue.
export async function* asyncGeneratorWithQueue<T>(
  parent: AsyncGenerator<T, void, undefined>,
  maxQueueSize: number = Infinity
) {
  const queue = new WaitQueue<{ value: Awaited<T> } | undefined>(maxQueueSize);

  const dequeueTask = (async () => {
    for await (const x of parent) {
      await queue.push({ value: x });
    }
    await queue.push(undefined);
  })();

  while (true) {
    const result = await queue.pop();
    if (result === undefined) {
      break;
    }
    yield result.value;
  }

  await dequeueTask;
}

// Acts like `map`, but only permits up to `poolSize` tasks to be running in
// parallel.
export function mapAsyncPool<T, V>(
  input: T[],
  f: (x: T) => Promise<V>,
  poolSize: number
): Promise<V>[] {
  // Using WaitQueue as a semaphore here.
  const waitQueue = new WaitQueue<void>(poolSize);
  return input.map(async (x) => {
    await waitQueue.push();
    // It's our turn, so safe to run the function now.
    const result = await f(x);
    await waitQueue.pop();
    return result;
  });
}

type ResolveType<T> = T extends Promise<infer R> ? R : T;

export async function awaitSequential<T extends (() => any)[]>(...fns: T) {
  const ret = [];
  for (const fn of fns) {
    ret.push(await fn());
  }
  return ret as { [I in keyof T]: ResolveType<ReturnType<T[I]>> };
}

export class TokenBucket {
  private readonly lastRefillTime = new Timer();
  private tokens = 0;
  private waiting: Promise<unknown> = Promise.resolve();

  constructor(private readonly refillRatePerSecond: number) {}

  private refill() {
    this.tokens = Math.min(
      this.refillRatePerSecond,
      this.tokens +
        this.lastRefillTime.elapsed * (this.refillRatePerSecond / 1000)
    );
    this.lastRefillTime.reset();
  }

  async consume(numTokens: number = 1, signal?: AbortSignal): Promise<boolean> {
    if (numTokens < 1) {
      return true;
    }
    ok(numTokens <= this.refillRatePerSecond);
    this.waiting = this.waiting.then(async () => {
      do {
        this.refill();
        if (this.tokens >= numTokens) {
          this.tokens -= numTokens;
          return;
        }
      } while (
        await sleep(
          (numTokens - this.tokens) * (1000 / this.refillRatePerSecond),
          signal
        )
      );
    });
    await this.waiting;
    return !signal?.aborted;
  }
}

// This is useful when you have a long-running invalidation process, e.g.
// "refresh biscuits", or "generate icons". You call invalidate() whenever
// the process needs future execution - and this ensures that only one
// invalidator is running at a time, and only one is scheduled in future
// at any time.
export class PipelineBatcher<Args> {
  private inflight: Promise<unknown> = Promise.resolve();
  private pending?: Promise<boolean>;
  private args?: Args[];

  constructor(
    private readonly fn: (...args: Args[]) => Promise<void>,
    private readonly autoRetryMs?: number,
    private readonly signal?: AbortSignal
  ) {}

  async invalidate(...args: Args[]): Promise<boolean> {
    if (this.signal?.aborted) {
      return false;
    }
    this.args = args;
    if (this.pending) {
      return this.pending;
    }
    const promise = this.inflight.then(async () => {
      this.pending = undefined;
      try {
        await this.fn(...this.args!);
        return true;
      } catch (error) {
        log.error("Error running pipeline batcher", { error });
        if (this.autoRetryMs) {
          if (await sleep(this.autoRetryMs, this.signal)) {
            fireAndForget(this.invalidate());
          }
        }
        return false;
      }
    });
    this.inflight = this.pending = promise;
    return promise;
  }
}

export class PromiseTimeoutError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export async function resolveAsyncObject<K extends {}>(
  object: K
): Promise<{
  [k in keyof K]: Awaited<K[k]>;
}> {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(object).map(async ([key, value]) => [key, await value])
    )
  );
}

export type AwaitedKeys<K extends {}, Keys> = Keys extends [
  infer Key,
  ...infer Rest
]
  ? Key extends keyof K
    ? [Awaited<K[Key]>, ...AwaitedKeys<K, Rest>]
    : never
  : [];

export async function resolveAsyncObjectKeys<
  K extends {},
  Keys extends (keyof K)[]
>(object: K, ...keys: Keys): Promise<AwaitedKeys<K, Keys>> {
  return (await Promise.all(keys.map((key) => object[key]))) as AwaitedKeys<
    K,
    Keys
  >;
}

export async function allSettledPartition<K>(
  promises: Promise<K>[]
): Promise<[successes: K[], errors: any[]]> {
  const settledResults = await Promise.allSettled(promises);
  const successes: K[] = [];
  const errors: any[] = [];
  for (const result of settledResults) {
    switch (result.status) {
      case "fulfilled":
        successes.push(result.value);
        break;
      case "rejected":
        errors.push(result.reason);
        break;

      default:
        assertNever(result);
    }
  }
  return [successes, errors];
}

export async function withTimeout<R>(
  fn: (signal: AbortSignal) => Promise<R>,
  ms: number,
  signal?: AbortSignal
): Promise<R | undefined> {
  const controller = new ChainableAbortController().chain(signal);
  let result: R | undefined;
  await Promise.race([
    (async () => (result = await fn(controller.signal)))(),
    sleep(ms, controller.signal),
  ]).finally(() => controller.abort());
  return result;
}

export function safeSetImmediate(cb: () => void) {
  if (process.env.IS_SERVER) {
    setImmediate(cb);
  } else {
    setTimeout(cb, 0);
  }
}

// Yields so we aren't staring an event loop
export async function yieldToOthers(signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) {
    return false;
  }
  return new Promise((resolve) => {
    safeSetImmediate(() => resolve(!signal?.aborted));
  });
}

// Yields every n ms during a for loop so we aren't starving the event loop
export async function* asyncYieldForEach<T>(
  iterable: Iterable<T>,
  budgetMs: number
) {
  let lastYield = performance.now();
  for (const v of iterable) {
    if (performance.now() - lastYield > budgetMs) {
      await yieldToOthers();
      lastYield = performance.now();
    }
    yield v;
  }
}

export function fireAndForget<T>(promise: Promise<T>, errorString?: any) {
  promise.catch((error) => {
    errorString ??= "Error during fire and forget";
    log.error(errorString, { error });
  });
}

export function nextImmediate() {
  return new Promise<void>((resolve) => {
    safeSetImmediate(() => {
      resolve();
    });
  });
}

export function isPromise<T, S>(
  obj: PromiseLike<T> | S
): obj is PromiseLike<T> {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof (obj as any).then === "function"
  );
}

export async function pollUntil<K>(
  fn: () => K | Promise<K>,
  opts: {
    timeoutText?: string;
    pollInterval?: number;
    timeout?: number;
  } = {}
): Promise<K> {
  const start = performance.now();
  while (true) {
    await sleep(opts.pollInterval ?? 100);
    const ret = await fn();
    if (ret) {
      return ret;
    }

    if (performance.now() - start > (opts.timeout ?? 3000)) {
      throw new Error(
        opts.timeoutText ?? "Timed out waiting for fn to return true"
      );
    }
  }
}

export class WorkQueue {
  private work: Promise<unknown>[] = [];

  constructor(private readonly size = 100) {}

  async add(work: Promise<unknown> | (() => Promise<unknown>)) {
    if (isFunction(work)) {
      work = work();
    }
    this.work.push(work);
    if (this.work.length > this.size) {
      await this.flush();
    }
  }

  async flush() {
    const work = this.work;
    this.work = [];
    await Promise.all(work);
  }
}
