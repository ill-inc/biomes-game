// Varint encoding and decoding, compatible with proto3.
// This is similar to the npm packages varint / big-varint, but much more restrictive
// to the range of integers supports so as to strictly support only int32/64.

const N1 = 2 ** 7;
const N2 = 2 ** 14;
const N3 = 2 ** 21;
const N4 = 2 ** 28;

const MSB = 0x80;
const REST32 = 0x7f;
const MAX_UINT32 = 2 ** 32 - 1;
const MAX_SINT32 = 2 ** 31 - 1;
const MIN_SINT32 = -(2 ** 31);

export function lengthUnsignedVarint32(num: number) {
  if (num < 0 || num > MAX_UINT32) {
    throw new RangeError("unsigned varint32 out of range");
  }
  return num < N1 ? 1 : num < N2 ? 2 : num < N3 ? 3 : num < N4 ? 4 : 5;
}

export function encodeUnsignedVarint32(
  num: number,
  buf: Buffer,
  offset: number
) {
  while (REST32 < num) {
    if (buf.length <= offset) {
      throw new RangeError("overflow");
    }
    buf[offset++] = (num & REST32) | MSB;
    num >>= 7;
  }
  buf[offset++] = num;
  return offset;
}

export function lengthSignedVarint32(num: number) {
  if (num < MIN_SINT32 || num > MAX_SINT32) {
    throw new RangeError("signed varint32 out of range");
  }
  return lengthUnsignedVarint32(num >= 0 ? num * 2 : num * -2 - 1);
}

export function encodeSignedVarint32(num: number, buf: Buffer, offset: number) {
  return encodeUnsignedVarint32(num >= 0 ? num * 2 : num * -2 - 1, buf, offset);
}

export function decodeUnsignedVarint32(
  buf: Buffer,
  offset: number
): [number, number] {
  let num = 0;
  let shift = 0;
  let b;
  do {
    if (shift > 31) {
      throw new RangeError("varint32 out of range");
    }
    if (buf.length <= offset) {
      throw new RangeError("underflow");
    }
    b = buf[offset++];
    num |= (b & REST32) << shift;
    shift += 7;
  } while (b >= MSB);
  return [offset, num];
}

export function decodeSignedVarint32(
  buf: Buffer,
  offset: number
): [number, number] {
  const [size, num] = decodeUnsignedVarint32(buf, offset);
  return [size, num & 1 ? (num + 1) / -2 : num / 2];
}

const N5 = 2n ** 35n;
const N6 = 2n ** 42n;
const N7 = 2n ** 49n;
const N8 = 2n ** 56n;
const N9 = 2n ** 63n;
const REST64 = 0x7fn;
const MAX_UINT64 = 2n ** 64n - 1n;
const MAX_SINT64 = 2n ** 63n - 1n;
const MIN_SINT64 = -(2n ** 64n);

export function lengthUnsignedVarint64(num: bigint) {
  if (num < 0 || num > MAX_UINT64) {
    throw new RangeError("unsigned varint64 out of range");
  }
  return num < N1
    ? 1
    : num < N2
    ? 2
    : num < N3
    ? 3
    : num < N4
    ? 4
    : num < N5
    ? 5
    : num < N6
    ? 6
    : num < N7
    ? 7
    : num < N8
    ? 8
    : num < N9
    ? 9
    : 10;
}

export function encodeUnsignedVarint64(
  num: bigint,
  buf: Buffer,
  offset: number
) {
  while (REST64 < num) {
    if (buf.length <= offset) {
      throw new RangeError("overflow");
    }
    buf[offset++] = Number(num & REST64) | MSB;
    num >>= 7n;
  }
  buf[offset++] = Number(num);
  return offset;
}

export function lengthSignedVarint64(num: bigint) {
  if (num < MIN_SINT64 || num > MAX_SINT64) {
    throw new RangeError("signed varint64 out of range");
  }
  return lengthUnsignedVarint64(num >= 0n ? num * 2n : num * -2n - 1n);
}

export function encodeSignedVarint64(num: bigint, buf: Buffer, offset: number) {
  return encodeUnsignedVarint64(
    num >= 0n ? num * 2n : num * -2n - 1n,
    buf,
    offset
  );
}

export function decodeUnsignedVarint64(
  buf: Buffer,
  offset: number
): [number, bigint] {
  let num = 0n;
  let shift = 0n;
  let b;
  do {
    if (shift > 63) {
      throw new RangeError("varint64 out of range");
    }
    if (buf.length <= offset) {
      throw new RangeError("underflow");
    }
    b = buf[offset++];
    num |= BigInt(b & REST32) << shift;
    shift += 7n;
  } while (b >= MSB);
  return [offset, num];
}

export function decodeSignedVarint64(
  buf: Buffer,
  offset: number
): [number, bigint] {
  const [size, num] = decodeUnsignedVarint64(buf, offset);
  return [size, num & 1n ? (num + 1n) / -2n : num / 2n];
}
