import type { GardenHose, GardenHoseEventMap } from "@/client/events/api";
import type EventEmitter from "events";
import type TypedEventEmitter from "typed-emitter";
import type { EventMap } from "typed-emitter";

type TargetEventMapListeners<T, EM> = {
  [I in keyof EM]?: (this: T, event: EM[I]) => unknown;
};

export function cleanListener(
  target: Document,
  listeners: TargetEventMapListeners<Document, DocumentEventMap>
): () => void;
export function cleanListener(
  target: Window,
  listeners: TargetEventMapListeners<Window, WindowEventMap>
): () => void;
export function cleanListener(
  target: HTMLElement,
  listeners: TargetEventMapListeners<HTMLElement, HTMLElementEventMap>
): () => void;
export function cleanListener(
  target: any,
  listeners: { [s: string]: unknown }
) {
  for (const [eventName, cb] of Object.entries(listeners)) {
    target.addEventListener(eventName, cb);
  }

  return () => {
    for (const [eventName, cb] of Object.entries(listeners)) {
      target.removeEventListener(eventName, cb);
    }
  };
}

export function cleanEmitterCallback<E extends GardenHoseEventMap>(
  emitter: GardenHose,
  callbacks: {
    [I in keyof E]?: E[I];
  }
): () => void;
export function cleanEmitterCallback<E extends EventMap>(
  emitter: TypedEventEmitter<E>,
  callbacks: {
    [I in keyof E]?: E[I];
  }
): () => void;
export function cleanEmitterCallback<
  E extends {
    on: (eventName: string, cb: (...args: any[]) => unknown) => unknown;
    off: (eventName: string, cb: (...args: any[]) => unknown) => unknown;
  }
>(emitter: E, callbacks: Record<string, (...args: any[]) => unknown>) {
  for (const [eventName, cb] of Object.entries(callbacks)) {
    emitter.on(eventName, cb);
  }
  return () => {
    for (const [eventName, cb] of Object.entries(callbacks)) {
      emitter.off(eventName, cb);
    }
  };
}

export function cleanUntypedEmitterCallback(
  emitter: EventEmitter,
  callbacks: Record<string, (...args: any[]) => unknown>
) {
  for (const [eventName, cb] of Object.entries(callbacks)) {
    emitter.on(eventName, cb);
  }

  return () => {
    for (const [eventName, cb] of Object.entries(callbacks)) {
      emitter.removeListener(eventName, cb);
    }
  };
}

export function composeCleanups(...cleanups: Array<() => unknown>) {
  return () => cleanups.forEach((e) => e());
}
