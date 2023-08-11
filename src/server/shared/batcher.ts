import { Queue } from "@/shared/util/queue";

export type Batcher<T> = IterableIterator<T>;

export class QueueBatcher<T> implements Batcher<T> {
  queue = new Queue<T>();

  constructor(values: T[] = []) {
    this.push(...values);
  }

  get size() {
    return this.queue.size();
  }

  push(...values: T[]) {
    this.queue.push(...values);
  }

  *all() {
    while (!this.queue.empty()) {
      yield this.queue.pop();
    }
  }

  next() {
    const done = this.queue.empty();
    const value = this.queue.pop()!;
    return { value, done };
  }

  [Symbol.iterator]() {
    return this;
  }
}

export class CycleBatcher<T> implements Batcher<T> {
  index = 0;

  constructor(private values: T[] = []) {}

  get size() {
    return this.values.length;
  }

  push(...values: T[]) {
    this.values.push(...values);
  }

  *once() {
    for (const value of this.values) {
      yield value;
    }
  }

  next() {
    if (this.values.length > 0) {
      if (this.index >= this.size) {
        this.index = 0;
      }
      return { done: false, value: this.values[this.index++] };
    } else {
      return { done: true, value: this.values[0] };
    }
  }

  [Symbol.iterator]() {
    return this;
  }
}

export class OnceBatcher<T, K> implements Batcher<T> {
  private readonly batcher = new QueueBatcher<[K, T]>();
  private readonly keys = new Set<K>();
  constructor(private readonly keyFn: (val: T) => K) {}

  get size() {
    return this.batcher.size;
  }

  push(...values: T[]) {
    for (const value of values) {
      const key = this.keyFn(value);
      if (!this.keys.has(key)) {
        this.batcher.push([key, value]);
        this.keys.add(key);
      }
    }
  }

  next() {
    const { done, value } = this.batcher.next();
    if (done) {
      return { done, value: undefined as T };
    } else {
      const [key, val] = value;
      this.keys.delete(key);
      return { done, value: val };
    }
  }

  [Symbol.iterator]() {
    return this;
  }
}
