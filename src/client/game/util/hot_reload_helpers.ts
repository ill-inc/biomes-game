import type EventEmitter from "events";

export function hotHandoffEmitter<T extends EventEmitter>(newV: T, old: T) {
  for (const eventName of old.eventNames()) {
    const listeners = old.listeners(eventName);
    for (const listener of listeners) {
      newV.addListener(eventName, listener as any);
    }
    old.removeAllListeners(eventName);
  }
}
