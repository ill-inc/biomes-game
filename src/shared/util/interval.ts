export function setIntervalImmediately(callback: () => void, ms?: number) {
  callback();
  return setInterval(callback, ms);
}
