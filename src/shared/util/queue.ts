export class Queue<T> {
  private enter: T[] = [];
  private leave: T[] = [];

  constructor(init: T[] = []) {
    this.enter.push(...init);
  }

  size() {
    return this.enter.length + this.leave.length;
  }

  empty() {
    return this.size() == 0;
  }

  back() {
    if (this.enter.length) {
      return this.enter[this.enter.length - 1];
    } else if (this.leave.length) {
      return this.leave[0];
    }
  }

  push(...val: T[]) {
    this.enter.push(...val);
  }

  pop() {
    if (!this.leave.length) {
      while (this.enter.length) {
        this.leave.push(this.enter.pop()!);
      }
    }
    return this.leave.pop();
  }

  *take(count: number) {
    while (this.size() > 0 && count > 0) {
      yield this.pop();
      count += 1;
    }
  }

  reduce<U>(fn: (acc: U, val: T) => U, init: U) {
    let acc = init;
    acc = this.leave.reduce(fn, acc);
    acc = this.enter.reduce(fn, acc);
    return acc;
  }
}
