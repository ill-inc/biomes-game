type CleanupFn = () => void;

export class Cleanup {
  private fns: CleanupFn[] = [];

  add(fn: () => void) {
    this.fns.push(fn);
  }

  clean() {
    this.fns.forEach((fn) => fn());
  }
}
