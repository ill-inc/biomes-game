import { log } from "@/shared/logging";
import { getNowMs } from "@/shared/util/helpers";

export class LightTrace {
  private readonly start: number;
  private lastStampMs: number;
  private buf: string = "";

  constructor() {
    this.start = getNowMs();
    this.lastStampMs = this.start;
  }

  mark(name: string, message?: string) {
    const now = getNowMs();
    const diff = now - this.lastStampMs;
    this.lastStampMs = now;
    this.buf += `${name}:${diff.toFixed(2)}ms `;
    if (message) {
      log.info(message);
    }
  }

  toString(): string {
    const now = getNowMs();
    const diff = now - this.start;
    return `${this.buf.trimEnd()} (total:${diff.toFixed(2)}ms)`;
  }
}
