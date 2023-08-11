import { getNowMs } from "@/shared/util/helpers";

export const TimerNeverSet = Symbol.for("TimerNeverSet");

// Simple timer class used to record amount of time elapsed, will be initialized to now.
// If the constructor is initialized to undefined, then elapsed will return Infinity.
export class Timer {
  constructor(private start: number | typeof TimerNeverSet = getNowMs()) {}

  // Return the elapsed time, or an alternative value if nonfinite.
  elapsedOr<R>(value: R) {
    return this.start !== TimerNeverSet ? this.elapsed : value;
  }

  get elapsed() {
    return this.start === TimerNeverSet ? Infinity : getNowMs() - this.start;
  }

  elapsedAndReset() {
    const now = getNowMs();
    const elapsed = this.start === TimerNeverSet ? Infinity : now - this.start;
    this.start = now;
    return elapsed;
  }

  reset(to: number | typeof TimerNeverSet = getNowMs()) {
    this.start = to;
  }
}
