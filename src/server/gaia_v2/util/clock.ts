// TODO: Add controls to accelerate during local testing.
export class Clock {
  now() {
    return Date.now();
  }

  ready(timeMs: number) {
    return this.timeUntil(timeMs) <= 0;
  }

  timeUntil(timeMs: number) {
    return timeMs - this.now();
  }

  delayedTime(delayMs: number, fuzz = 0.1) {
    return this.now() + delayMs + fuzz * Math.random() * delayMs;
  }
}

export function minTimeUntil(clock: Clock, times: Iterable<number>) {
  let minDelayMs = Infinity;
  for (const time of times) {
    minDelayMs = Math.min(minDelayMs, clock.timeUntil(time));
  }
  return minDelayMs;
}

export async function registerClock() {
  return new Clock();
}
