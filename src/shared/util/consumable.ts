export class Consumable<T> {
  constructor(private value: T | undefined) {}

  consume(): T | undefined {
    const value = this.value;
    this.value = undefined;
    return value;
  }
}
