import { BackgroundTaskController } from "@/shared/abort";
import { callbackToStream } from "@/shared/zrpc/callback_to_stream";

export function merge<T>(
  signal: AbortSignal,
  ...iterables: ((signal: AbortSignal) => AsyncIterable<T>)[]
): AsyncIterable<T> {
  const [cb, stream] = callbackToStream<T>();
  const controller = new BackgroundTaskController().chain(signal);
  for (const iterable of iterables) {
    controller.runInBackground("merge", async (signal) => {
      try {
        for await (const value of iterable(signal)) {
          cb(value);
        }
      } catch (error) {
        cb(undefined, error);
      }
    });
  }
  return stream;
}
