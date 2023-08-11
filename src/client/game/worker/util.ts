import type { MessagePortLike } from "@/shared/zrpc/messageport";

export function isInWorker() {
  return (
    typeof WorkerGlobalScope !== "undefined" &&
    self instanceof WorkerGlobalScope
  );
}

export function outWorkerMessagePort(worker: Worker): MessagePortLike {
  return {
    start: () => {},
    on: (event, listener) =>
      worker.addEventListener(event, listener as EventListener),
    off: (event, listener) =>
      worker.removeEventListener(event, listener as EventListener),
    close: () => {},
    postMessage: (data) => worker.postMessage(data),
  };
}

export function inWorkerMessagePort(): MessagePortLike {
  return {
    start: () => {},
    on: (event, listener) =>
      self.addEventListener(event, listener as EventListener),
    off: (event, listener) =>
      self.removeEventListener(event, listener as EventListener),
    close: () => {},
    postMessage: (data) => self.postMessage(data),
  };
}
