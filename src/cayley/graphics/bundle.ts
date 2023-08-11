import type { Bundle } from "@/wasm/cayley";

export class Cursor {
  private numIndex = 0;
  private strIndex = 0;
  private bufIndex = 0;

  constructor(
    private getNumber: (i: number) => number,
    private getString: (i: number) => string,
    private getBuffer: (i: number) => Uint8Array
  ) {}

  popNumber(): number {
    return this.getNumber(this.numIndex++);
  }

  popString(): string {
    return this.getString(this.strIndex++);
  }

  popBuffer(): Uint8Array {
    return this.getBuffer(this.bufIndex++);
  }
}

export function makeCursor(bundle: Bundle) {
  const numbers = bundle.numbers();
  const strings = JSON.parse(bundle.strings());
  return new Cursor(
    (i) => numbers[i],
    (i) => strings[i],
    (i) => bundle.buffers(i)
  );
}
