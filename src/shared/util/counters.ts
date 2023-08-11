export class Averager {
  private x: number;
  private s: number;

  constructor(base = 0, smoothing = 0.0) {
    this.x = base;
    this.s = 1.0 - smoothing;
  }

  push(value: number) {
    // Accumulate the exponential moving average.
    this.x += this.s * (value - this.x);
    return this;
  }

  get() {
    return this.x;
  }
}

export class Differencer {
  private diff: Averager;
  private prev: number;

  constructor(base = 0, smoothing = 0.0) {
    this.diff = new Averager(0, smoothing);
    this.prev = base;
  }

  push(value: number) {
    this.diff.push(value - this.prev);
    this.prev = value;
    return this;
  }

  get() {
    return this.diff.get();
  }
}

export class TimeseriesWithRate {
  private rate?: number;
  private latestValue?: number;
  private latestValueTime?: number;

  constructor(private rateWindow: number) {}

  push(value: number, time: number) {
    if (!this.latestValue || !this.latestValueTime) {
      this.latestValue = value;
      this.latestValueTime = time;
      return;
    }

    const dt = time - this.latestValueTime;
    const dv = value - this.latestValue;
    this.latestValueTime = time;
    this.latestValue = value;

    const newRate = dv / dt;
    if (!this.rate) {
      this.rate = newRate;
    } else {
      const alpha = Math.min(dt / this.rateWindow, 1);
      this.rate = this.rate * (1 - alpha) + alpha * newRate;
    }
  }

  getRate() {
    return this.rate ?? 0;
  }
  getLatestValue() {
    return this.latestValue;
  }
}
export class AggregateStats {
  avg: number;
  smoothedAvg: Averager;
  sum: number;
  sampleCount: number;
  min: number;
  max: number;
  latest: number;

  constructor(
    initialData: number,
    // The weight to use in the exponential moving average.
    movingAverageNewSampleWeight = 0.05
  ) {
    this.avg = this.min = this.max = this.latest = this.sum = initialData;
    this.smoothedAvg = new Averager(
      initialData,
      1 - movingAverageNewSampleWeight
    );
    this.sampleCount = 1;
  }
  push(x: number) {
    this.sampleCount = this.sampleCount + 1;
    this.sum += x;
    this.avg = this.sum / this.sampleCount;

    this.min = Math.min(this.min, x);
    this.max = Math.max(this.max, x);

    this.latest = x;

    // Accumulate the exponential moving average.
    this.smoothedAvg.push(x);
  }
}
