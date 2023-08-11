import EventEmitter from "events";
import type TypedEventEmitter from "typed-emitter";

export type HotResourceEvents = {
  onHotResourceReload: () => unknown;
};

export const hotResourceEmitter =
  new EventEmitter() as TypedEventEmitter<HotResourceEvents>;
hotResourceEmitter.setMaxListeners(10000);
