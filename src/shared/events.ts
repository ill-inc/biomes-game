import { nextImmediate, safeSetImmediate } from "@/shared/util/async";
import { autoId } from "@/shared/util/auto_id";
import { ok } from "assert";
import { EventEmitter } from "stream";
import type TypedEventEmitter from "typed-emitter";
import type { EventMap } from "typed-emitter";

export type ListenerKey = string & { readonly "": unique symbol };

// Like a TypedEventEmitter, however all listeners are queued using
// safeSetImmediate, also to facilitate an easier clean shutdown it gives
// you a key to use to remove the listener later.
export class AsyncSubscriptionManager<Events extends EventMap> {
  private emitter = new EventEmitter() as TypedEventEmitter<Events>;
  private keys = new Map<ListenerKey, Events[any]>();

  constructor() {
    this.emitter.setMaxListeners(Infinity);
  }

  emit<E extends keyof Events>(
    event: E,
    ...args: Parameters<Events[E]>
  ): boolean {
    return this.emitter.emit(event, ...args);
  }

  on<E extends keyof Events>(event: E, listener: Events[E]): ListenerKey {
    const fn = ((...args: Parameters<typeof listener>): void => {
      safeSetImmediate(() => {
        listener(...args);
      });
    }) as Events[E];
    this.emitter.on(event, fn);
    const key = autoId() as ListenerKey;
    this.keys.set(key, fn);
    return key;
  }

  off<E extends keyof Events>(event: E, key: ListenerKey | undefined): void {
    if (key === undefined) {
      return;
    }
    const fn = this.keys.get(key);
    if (fn === undefined) {
      return;
    }
    this.keys.delete(key);
    this.emitter.off(event, fn);
  }

  async stop(): Promise<void> {
    this.emitter.removeAllListeners();
    await nextImmediate();
  }
}

// Helper function for subscribing to a set of events from an event emitter
// all at once, and remembering the subscriptions so that they can be
// unsubscribed later all at once by calling off().
export class EmitterSubscription<Events extends EventMap> {
  constructor(
    private readonly eventEmitter: Pick<
      TypedEventEmitter<Events>,
      "on" | "off"
    >,
    private readonly functions: Partial<Events>
  ) {
    this.forEachFunction((k, f) => this.eventEmitter.on(k, f));
  }

  off() {
    this.forEachFunction((k, f) => this.eventEmitter.off(k, f));
  }

  forEachFunction(
    withFunction: (k: keyof Events, f: Events[keyof Events]) => void
  ): void {
    for (const key in this.functions) {
      const f = this.functions[key] as Events[keyof Events] | undefined;
      if (f === undefined) {
        continue;
      }
      withFunction(key, f);
    }
  }
}

export class EmitterScope {
  private readonly cleanup = new Map<number, () => void>();
  private nextId = 1;

  constructor(private readonly emitter?: EventEmitter) {}

  on(
    event: string | symbol,
    listener: (...args: any[]) => void,
    emitter?: EventEmitter
  ): () => void {
    emitter ??= this.emitter;
    ok(emitter);
    emitter.on(event, listener);

    const id = this.nextId++;
    this.cleanup.set(id, () => emitter!.off(event, listener));
    return () => {
      this.cleanup.get(id)?.();
      this.cleanup.delete(id);
    };
  }

  onAbort(signal: AbortSignal, listener: () => void): () => void {
    signal.addEventListener("abort", listener);

    const id = this.nextId++;
    this.cleanup.set(id, () => signal.removeEventListener("abort", listener));
    return () => {
      this.cleanup.get(id)?.();
      this.cleanup.delete(id);
    };
  }

  off(): void {
    for (const fn of this.cleanup.values()) {
      fn();
    }
    this.cleanup.clear();
  }
}
