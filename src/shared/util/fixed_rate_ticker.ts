import { createCounter } from "@/shared/metrics/metrics";

const catchUpTicks = createCounter({
  name: "game:loop:catchupTicks",
  help: "Number of ticks that we weren't on time for and had to catch up to account for them.",
});
const droppedTicks = createCounter({
  name: "game:loop:droppedTicks",
  help: "Number of ticks that we weren't on time for and had to catch up to account for them.",
});

// Class that manages the current time and a tick interval, and makes sure that
// the constructor-provided fn function gets called once for each `interval`
// amount of time that passes. This is helpful to convert from an arbitrary
// amount of time that has passed into a fixed number of ticks of the exact
// same duration.
export class FixedRateTicker {
  private curTime = 0;

  constructor(private readonly startTime: number) {
    this.curTime = startTime;
  }

  private timeToTicks(time: number, intervalMs: number) {
    return Math.floor((time - this.startTime) / intervalMs);
  }

  nextTickTime(intervalMs: number): number {
    const nextTick = this.timeToTicks(this.curTime, intervalMs) + 1;
    return intervalMs * nextTick;
  }

  // Advances the clock (`curTime`) up to the specified current time (`now`),
  // and returns the number of ticks that have occurred in between.
  advanceClock(now: number, intervalMs: number, maxTicks?: number) {
    const prevTime = this.curTime;
    this.curTime = now;
    const endTick = this.timeToTicks(this.curTime, intervalMs);
    const startTick = this.timeToTicks(prevTime, intervalMs);

    let diffTicks = endTick - startTick;
    if (diffTicks > 1) {
      catchUpTicks.inc(diffTicks - 1);
    }

    // If we have more ticks to catch up on than the maximum, clamp to the
    // max, effectively dropping those ticks.
    if (maxTicks && diffTicks > maxTicks) {
      droppedTicks.inc(diffTicks - maxTicks);
      diffTicks = maxTicks;
    }

    return diffTicks;
  }
}

// Dresses up the FixedRateTicker with a setTimeout() call so that the fixed
// rate tick will automatically be called on a schedule.
export class FixedLoop {
  private timeout?: ReturnType<typeof setTimeout>;
  private fixedRateTick: FixedRateTicker;
  private intervalMs: () => number;

  constructor(
    intervalMs: number | (() => number),
    private fn: () => void,
    private readonly maxTickCatchup?: number
  ) {
    this.intervalMs =
      typeof intervalMs === "number" ? () => intervalMs : intervalMs;
    this.fixedRateTick = new FixedRateTicker(performance.now());
  }

  advanceToCurrentTick(maxTickCatchup?: number) {
    const intervalMs = this.intervalMs();
    try {
      const numTicks = this.fixedRateTick.advanceClock(
        performance.now(),
        intervalMs,
        maxTickCatchup ?? this.maxTickCatchup
      );
      for (let i = 0; i < numTicks; ++i) {
        this.fn();
      }
    } finally {
      const nextTickTimeMs = this.fixedRateTick.nextTickTime(intervalMs);
      const delayMs = Math.max(0, nextTickTimeMs - performance.now());
      // We round the delay up to the nearest millisecond because, on Chrome
      // at least, the fractional part seems to be ignored and so sometimes
      // setTimeout() gets called early unecessary churn is added to the
      // scheduler.
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.timeout = setTimeout(
        () => this.advanceToCurrentTick(),
        Math.ceil(delayMs)
      );
    }
  }

  start() {
    this.timeout = setTimeout(() => this.advanceToCurrentTick(), 0);
  }

  stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }
}
