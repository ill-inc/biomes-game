import { add, add2, sub, sub2 } from "@/shared/math/linear";
import type { ReadonlyVec2, ReadonlyVec3 } from "@/shared/math/types";
import { DefaultMap } from "@/shared/util/collections";
import { ok } from "assert";

export class Sparse2<T> {
  impl = new Map<number, T>();

  constructor(
    readonly shape: ReadonlyVec2,
    readonly origin: ReadonlyVec2 = [0, 0]
  ) {
    ok(shape[0] * shape[1] < Number.MAX_SAFE_INTEGER);
  }

  private key(pos: ReadonlyVec2) {
    const [x, y] = sub2(pos, this.origin);
    ok(x >= 0);
    ok(y >= 0);
    ok(x < this.shape[0]);
    ok(y < this.shape[1]);
    return x + y * this.shape[0];
  }

  private pos(key: number) {
    const x = key % this.shape[0];
    key = (key - x) / this.shape[0];
    const y = key % this.shape[1];
    key = (key - y) / this.shape[1];
    return add2([x, y], this.origin);
  }

  get size() {
    return this.impl.size;
  }

  has(pos: ReadonlyVec2) {
    return this.impl.has(this.key(pos));
  }

  get(pos: ReadonlyVec2) {
    return this.impl.get(this.key(pos));
  }

  set(pos: ReadonlyVec2, val: T) {
    return this.impl.set(this.key(pos), val);
  }

  del(pos: ReadonlyVec2) {
    this.impl.delete(this.key(pos));
  }

  clear() {
    this.impl.clear();
  }

  *[Symbol.iterator]() {
    for (const [key, val] of this.impl) {
      yield [this.pos(key), val] as const;
    }
  }
}

export class Sparse3<T> {
  private readonly impl = new Map<number, T>();

  constructor(
    readonly shape: ReadonlyVec3,
    readonly origin: ReadonlyVec3 = [0, 0, 0]
  ) {
    ok(shape[0] * shape[1] * shape[2] < Number.MAX_SAFE_INTEGER);
  }

  private key(pos: ReadonlyVec3) {
    const [x, y, z] = sub(pos, this.origin);
    ok(x >= 0);
    ok(y >= 0);
    ok(z >= 0);
    ok(x < this.shape[0]);
    ok(y < this.shape[1]);
    ok(z < this.shape[2]);
    return x + (y + z * this.shape[1]) * this.shape[0];
  }

  private pos(key: number) {
    const x = key % this.shape[0];
    key = (key - x) / this.shape[0];
    const y = key % this.shape[1];
    key = (key - y) / this.shape[1];
    const z = key % this.shape[2];
    key = (key - z) / this.shape[2];
    return add([x, y, z], this.origin);
  }

  get size() {
    return this.impl.size;
  }

  fill(value: T) {
    const dim = this.shape[0] * this.shape[1] * this.shape[2];
    for (let i = 0; i < dim; i++) {
      this.impl.set(i, value);
    }
  }

  has(pos: ReadonlyVec3) {
    return this.impl.has(this.key(pos));
  }

  get(pos: ReadonlyVec3) {
    return this.impl.get(this.key(pos));
  }

  set(pos: ReadonlyVec3, val: T) {
    return this.impl.set(this.key(pos), val);
  }

  del(pos: ReadonlyVec3) {
    this.impl.delete(this.key(pos));
  }

  clear() {
    this.impl.clear();
  }

  clone() {
    const ret = new Sparse3(this.shape, this.origin);
    for (const [pos, val] of this) {
      ret.set(pos, val);
    }
    return ret;
  }

  *[Symbol.iterator]() {
    for (const [key, val] of this.impl) {
      yield [this.pos(key), val] as const;
    }
  }
}

export class SparseSet3 {
  impl: Sparse3<boolean>;
  constructor(shape: ReadonlyVec3, origin: ReadonlyVec3 = [0, 0, 0]) {
    this.impl = new Sparse3(shape, origin);
  }

  get size() {
    return this.impl.size;
  }

  has(pos: ReadonlyVec3) {
    return this.impl.has(pos);
  }

  set(pos: ReadonlyVec3) {
    this.impl.set(pos, true);
  }

  del(pos: ReadonlyVec3) {
    this.impl.del(pos);
  }

  *[Symbol.iterator]() {
    for (const [key, _val] of this.impl) {
      yield key;
    }
  }
}

export class SparseBimap3<T> {
  forward: Sparse3<T>;
  reverse = new DefaultMap<T, SparseSet3>(
    () => new SparseSet3(this.shape, this.origin)
  );

  constructor(
    readonly shape: ReadonlyVec3,
    readonly origin: ReadonlyVec3 = [0, 0, 0]
  ) {
    this.forward = new Sparse3(shape, origin);
  }

  get size() {
    return this.forward.size;
  }

  hasForward(pos: ReadonlyVec3) {
    return this.forward.has(pos);
  }

  getForward(pos: ReadonlyVec3) {
    return this.forward.get(pos);
  }

  set(pos: ReadonlyVec3, val: T) {
    this.delForward(pos);
    this.forward.set(pos, val);
    this.reverse.get(val).set(pos);
  }

  delForward(pos: ReadonlyVec3) {
    const val = this.forward.get(pos);
    this.forward.del(pos);
    if (val) {
      this.reverse.get(val).del(pos);
      if (this.reverse.get(val).size === 0) {
        this.reverse.delete(val);
      }
    }
  }

  clear() {
    this.forward.clear();
    this.reverse.clear();
  }

  *[Symbol.iterator]() {
    yield* this.forward;
  }

  getReverse(val: T) {
    return this.reverse.get(val);
  }

  delReverse(val: T) {
    for (const pos of this.reverse.get(val)) {
      this.forward.del(pos);
    }
    this.reverse.delete(val);
  }

  *entriesReverse() {
    for (const [val, rev] of this.reverse) {
      yield [val, [...rev]] as const;
    }
  }

  keysReverse() {
    return this.reverse.keys();
  }
}
