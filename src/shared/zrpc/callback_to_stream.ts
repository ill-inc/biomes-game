import { ConditionVariable } from "@/shared/util/async";

export class StreamEof {
  constructor(public readonly error?: any) {}
}

export function callbackToStream<Value>(
  signal?: AbortSignal
): [
  (value?: Value | StreamEof, error?: any) => void,
  AsyncGenerator<Value, void, undefined>
] {
  const cv = new ConditionVariable();
  const buffer: (Value | StreamEof)[] = [];
  let stopped = false;

  const onAbort = () => {
    buffer.push(new StreamEof());
    stopped = true;
    cv.signal();
  };
  signal?.addEventListener("abort", onAbort);

  return [
    function callback(value?: Value | StreamEof, error?: any) {
      if (stopped) {
        return;
      }
      if (error !== undefined) {
        buffer.push(new StreamEof(error));
      } else {
        buffer.push(value!);
      }
      cv.signal();
    },
    (async function* stream() {
      try {
        if (stopped && buffer.length === 0) {
          return;
        }
        while (true) {
          if (buffer.length === 0) {
            await cv.wait();
          }
          for (const value of buffer) {
            if (value instanceof StreamEof) {
              if (value.error !== undefined) {
                throw value.error;
              }
              return;
            } else {
              yield value;
            }
          }
          buffer.length = 0;
        }
      } finally {
        stopped = true;
        signal?.removeEventListener("abort", onAbort);
      }
    })(),
  ];
}
