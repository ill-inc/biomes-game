import type { Array3 } from "@/cayley/numerics/arrays";
import type { Coord3 } from "@/cayley/numerics/shapes";

export function floatBitsToInt(f32: number) {
  return new Int32Array(new Float32Array([f32]).buffer)[0];
}

export function intBitsToFloat(i32: number) {
  return new Float32Array(new Int32Array([i32]).buffer)[0];
}

export function where(mask: Array3<"Bool">, fn: (pos: Coord3) => void) {
  for (let z = 0; z < mask.shape[0]; z += 1) {
    for (let y = 0; y < mask.shape[1]; y += 1) {
      for (let x = 0; x < mask.shape[2]; x += 1) {
        if (mask.get([z, y, x])) {
          fn([z, y, x]);
        }
      }
    }
  }
}

export function randomHash(x: number) {
  x >>>= 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

export function positionHash([x, y, z]: Coord3) {
  return randomHash(x + randomHash(y + randomHash(z)));
}

export function positionRNG([x, y, z]: Coord3) {
  return new RNG(positionHash([x, y, z]));
}

export class RNG {
  constructor(private seed = 0) {}

  get() {
    this.seed = randomHash(this.seed);
    return this.seed;
  }

  sample<T>(population: T[]) {
    return population[this.get() % population.length];
  }
}

export class PositionSampler<T> {
  constructor(private samples: T[]) {}

  get(pos: Coord3) {
    return this.samples[positionHash(pos) % this.samples.length];
  }
}

export class ReservoirSampler<T> {
  constructor(private rng: RNG, private values: T[] = []) {}

  push(value: T) {
    this.values.push(value);
  }

  pop() {
    return this.values.splice(this.rng.get() % this.values.length, 1)[0];
  }
}
