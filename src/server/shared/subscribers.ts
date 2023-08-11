import { safeSetImmediate } from "@/shared/util/async";
import { ok } from "assert";
import { v4 as uuid } from "uuid";

export interface Subscription {
  readonly id: string;
  close(): void;
}

export type SubscriberFn<Args extends any[]> = (...args: Args) => void;

function makeDefer<Args extends any[]>(
  fn: (...args: Args) => void
): (...args: Args) => void {
  return (...args) => {
    safeSetImmediate(() => fn(...args));
  };
}

export class SubscriberTable<Args extends any[]> {
  private map = new Map<string, SubscriberFn<Args>>();

  create(id: string, fn: SubscriberFn<Args>): Subscription {
    ok(!this.map.has(id), `Attempt to register duplicate subscriber ${id}.`);
    this.map.set(id, fn);
    return {
      id,
      close: () => this.map.delete(id),
    };
  }

  // Like create, but use safeSetImmediate to not let slow-running subscriber
  // block notify.
  createAsync(id: string, fn: SubscriberFn<Args>): Subscription {
    return this.create(id, makeDefer(fn));
  }

  subscribe(prefix: string, fn: SubscriberFn<Args>): Subscription {
    return this.create(`${prefix}:${uuid()}`, fn);
  }

  // Like subscribe, but use safeSetImmediate to not let slow-running subscriber
  // block notify.
  subscribeAsync(prefix: string, fn: SubscriberFn<Args>): Subscription {
    return this.subscribe(prefix, makeDefer(fn));
  }

  delete(id: string) {
    this.map.delete(id);
  }

  clear() {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  get ids(): Array<string> {
    return Array.from(this.map.keys());
  }

  adopt(other: SubscriberTable<Args>) {
    other.map.forEach((fn, id) => this.create(id, fn));
  }

  notify(...args: Args) {
    // Use safeSetImmediate to not let a slow-running subscriber block notify.
    this.map.forEach((subscriber) => subscriber(...args));
  }
}
