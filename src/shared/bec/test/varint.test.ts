import {
  decodeSignedVarint32,
  decodeSignedVarint64,
  decodeUnsignedVarint32,
  decodeUnsignedVarint64,
  encodeSignedVarint32,
  encodeSignedVarint64,
  encodeUnsignedVarint32,
  encodeUnsignedVarint64,
  lengthSignedVarint32,
  lengthSignedVarint64,
  lengthUnsignedVarint32,
  lengthUnsignedVarint64,
} from "@/shared/bec/varint";
import assert from "assert";

describe("Test varint", () => {
  it("computes needed length32 correctly", () => {
    assert.equal(lengthUnsignedVarint32(0), 1);
    assert.equal(lengthUnsignedVarint32(0xf), 1);
    assert.equal(lengthUnsignedVarint32(0xfff), 2);
    assert.equal(lengthUnsignedVarint32(0xffff), 3);
    assert.equal(lengthUnsignedVarint32(0xffffff), 4);
    assert.equal(lengthUnsignedVarint32(0xffffffff), 5);
  });

  it("computes needed length64 correctly", () => {
    assert.equal(lengthUnsignedVarint64(0n), 1);
    assert.equal(lengthUnsignedVarint64(0xfn), 1);
    assert.equal(lengthUnsignedVarint64(0xfffn), 2);
    assert.equal(lengthUnsignedVarint64(0xffffn), 3);
    assert.equal(lengthUnsignedVarint64(0xffffffn), 4);
    assert.equal(lengthUnsignedVarint64(0xffffffffn), 5);
    assert.equal(lengthUnsignedVarint64(0xffffffffffn), 6);
    assert.equal(lengthUnsignedVarint64(0xffffffffffffn), 7);
    assert.equal(lengthUnsignedVarint64(0xffffffffffffffn), 8);
    assert.equal(lengthUnsignedVarint64(0xfffffffffffffffn), 9);
    assert.equal(lengthUnsignedVarint64(0xffffffffffffffffn), 10);
  });

  it("encodes unsigned32", () => {
    const encode = (num: number) => {
      const buf = Buffer.alloc(lengthUnsignedVarint32(num));
      encodeUnsignedVarint32(num, buf, 0);
      return [...buf];
    };
    assert.deepEqual(encode(0), [0]);
    assert.deepEqual(encode(10), [10]);
    assert.deepEqual(encode(300), [172, 2]);
  });

  it("decodes unsigned32", () => {
    const decode = (buf: number[]) => {
      return decodeUnsignedVarint32(Buffer.from(buf), 0);
    };
    assert.deepEqual(decode([0]), [1, 0]);
    assert.deepEqual(decode([10]), [1, 10]);
    assert.deepEqual(decode([172, 2]), [2, 300]);
  });

  it("encodes signed32", () => {
    const encode = (num: number) => {
      const buf = Buffer.alloc(lengthSignedVarint32(num));
      encodeSignedVarint32(num, buf, 0);
      return [...buf];
    };
    assert.deepEqual(encode(0), [0]);
    assert.deepEqual(encode(-1), [1]);
    assert.deepEqual(encode(1), [2]);
    assert.deepEqual(encode(10), [20]);
    assert.deepEqual(encode(-10), [19]);
    assert.deepEqual(encode(300), [216, 4]);
    assert.deepEqual(encode(-300), [215, 4]);
  });

  it("decodes signed32", () => {
    const decode = (buf: number[]) => {
      return decodeSignedVarint32(Buffer.from(buf), 0);
    };
    assert.deepEqual(decode([0]), [1, 0]);
    assert.deepEqual(decode([1]), [1, -1]);
    assert.deepEqual(decode([2]), [1, 1]);
    assert.deepEqual(decode([20]), [1, 10]);
    assert.deepEqual(decode([19]), [1, -10]);
    assert.deepEqual(decode([216, 4]), [2, 300]);
    assert.deepEqual(decode([215, 4]), [2, -300]);
  });

  it("encodes unsigned64", () => {
    const encode = (num: bigint) => {
      const buf = Buffer.alloc(lengthUnsignedVarint64(num));
      encodeUnsignedVarint64(num, buf, 0);
      return [...buf];
    };
    assert.deepEqual(encode(0n), [0]);
    assert.deepEqual(encode(10n), [10]);
    assert.deepEqual(encode(300n), [172, 2]);
    assert.deepEqual(encode(0x8080808010n), [144, 128, 130, 132, 136, 16]);
  });

  it("decodes unsigned64", () => {
    const decode = (buf: number[]) => {
      return decodeUnsignedVarint64(Buffer.from(buf), 0);
    };
    assert.deepEqual(decode([0]), [1, 0n]);
    assert.deepEqual(decode([10]), [1, 10n]);
    assert.deepEqual(decode([172, 2]), [2, 300n]);
    assert.deepEqual(decode([144, 128, 130, 132, 136, 16]), [6, 0x8080808010n]);
  });

  it("encodes signed64", () => {
    const encode = (num: bigint) => {
      const buf = Buffer.alloc(lengthSignedVarint64(num));
      encodeSignedVarint64(num, buf, 0);
      return [...buf];
    };
    assert.deepEqual(encode(0n), [0]);
    assert.deepEqual(encode(-1n), [1]);
    assert.deepEqual(encode(1n), [2]);
    assert.deepEqual(encode(10n), [20]);
    assert.deepEqual(encode(-10n), [19]);
    assert.deepEqual(encode(300n), [216, 4]);
    assert.deepEqual(encode(-300n), [215, 4]);
    assert.deepEqual(encode(0x8080808010n), [160, 128, 132, 136, 144, 32]);
    assert.deepEqual(encode(-0x8080808010n), [159, 128, 132, 136, 144, 32]);
  });

  it("decodes signed64", () => {
    const decode = (buf: number[]) => {
      return decodeSignedVarint64(Buffer.from(buf), 0);
    };
    assert.deepEqual(decode([0]), [1, 0n]);
    assert.deepEqual(decode([1]), [1, -1n]);
    assert.deepEqual(decode([2]), [1, 1n]);
    assert.deepEqual(decode([20]), [1, 10n]);
    assert.deepEqual(decode([19]), [1, -10n]);
    assert.deepEqual(decode([216, 4]), [2, 300n]);
    assert.deepEqual(decode([215, 4]), [2, -300n]);
    assert.deepEqual(decode([160, 128, 132, 136, 144, 32]), [6, 0x8080808010n]);
    assert.deepEqual(decode([159, 128, 132, 136, 144, 32]), [
      6,
      -0x8080808010n,
    ]);
  });
});
