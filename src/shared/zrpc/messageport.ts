// Compatability interface to support node and web message ports.
export interface MessagePortLike {
  start(): void;
  on(
    event: "message",
    listener: (message: MessageEvent<unknown>) => void
  ): void;
  off(
    event: "message",
    listener: (message: MessageEvent<unknown>) => void
  ): void;
  close(): void;
  postMessage(data: unknown): void;
}

export function webMessagePort(mp: MessagePort): MessagePortLike {
  return {
    start: () => mp.start(),
    on: (event, listener) =>
      mp.addEventListener(event, listener as EventListener),
    off: (event, listener) =>
      mp.removeEventListener(event, listener as EventListener),
    close: () => mp.close(),
    postMessage: (data) => mp.postMessage(data),
  };
}
