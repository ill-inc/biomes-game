import { Delayed, sleep } from "@/shared/util/async";

// TODO: Figure out how to make these routines use a simulation time instead of system time.
function now() {
  return performance.now();
}

// A simpler throttle for single events.
export class EventThrottle {
  lastEventMs: number = -Infinity;

  constructor(private delayMs: number) {}

  setDelay(delayMs: number) {
    this.delayMs = delayMs;
  }

  test() {
    return now() > this.lastEventMs + this.delayMs;
  }

  testAndSet() {
    if (this.test()) {
      this.lastEventMs = now();
      return true;
    } else {
      return false;
    }
  }

  reset() {
    this.lastEventMs = now();
  }
}

// A tick-based throttler.
export class TickThrottle {
  constructor(private balance: number) {}

  reset(balance: number) {
    this.balance = balance;
  }

  tick(resetTo: number) {
    this.balance -= 1;
    if (this.balance <= 0) {
      this.balance = resetTo;
      return true;
    }
    return false;
  }
}

// A convenience class for performing key-based throttling.
export class TimeWindow<K> {
  keys = new Map<K, number>();

  constructor(public windowSizeMs: number) {}

  private purge() {
    const cutoff = now() - this.windowSizeMs;
    for (const [key, time] of this.keys) {
      if (time < cutoff) {
        this.keys.delete(key);
      }
    }
  }

  resize(windowSizeMs: number) {
    this.windowSizeMs = windowSizeMs;
    this.purge();
  }

  empty() {
    this.purge();
    return this.keys.size === 0;
  }

  use(key: K) {
    this.purge();
    this.keys.set(key, now());
  }

  waitTime(key: K) {
    const time = this.keys.get(key);
    if (time) {
      return Math.max(0, this.windowSizeMs - (now() - time));
    }
  }

  shouldThrottle(key: K) {
    if (this.windowSizeMs <= 0) {
      return false;
    }
    this.purge();
    return this.keys.has(key);
  }

  throttleOrUse(key: K) {
    if (this.shouldThrottle(key)) {
      return true;
    }
    this.use(key);
    return false;
  }
}

// Key based throttler
export class AsyncThrottle<K> {
  private readonly delay: number;
  private readonly running = new Map<K, Promise<unknown>>();

  constructor(ratePerSecond: number) {
    this.delay = 1000 / ratePerSecond;
  }

  gate<R>(key: K, fn: () => Promise<R>): Promise<R> {
    const result = new Delayed<R>();
    const safeFn = async () => {
      try {
        result.resolve(await fn());
      } catch (error) {
        result.reject(error);
      }
    };

    const current = this.running.get(key);
    // If there is a task in flight, wait for it to complete before starting the next one.
    const waitFor = (current ? current.then(() => safeFn()) : safeFn())
      // After we're complete, wait the appropriate delay.
      .then(() => sleep(this.delay))
      // After the delay, remove ourselves from the running list if we were the
      // task there, it is possible another task has been chained off us in the
      // interim in which case 'running.get' will have been updated.
      .finally(() => {
        if (this.running.get(key) === waitFor) {
          this.running.delete(key);
        }
      });
    this.running.set(key, waitFor);
    return result.wait();
  }
}

// A convenience class for throttling based on prior state.
export class StateThrottle<T, Args extends unknown[]> {
  constructor(
    private init: T,
    private fn: (prior: T, ...args: [...Args]) => { allow: boolean; state: T }
  ) {}

  test(...args: [...Args]) {
    const { allow, state } = this.fn(this.init, ...args);
    this.init = state;
    return allow;
  }
}
