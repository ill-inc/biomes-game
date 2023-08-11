const TypedArray = Object.getPrototypeOf(Uint8Array);

export function isBinaryData(
  value: any
): value is Buffer | Uint8Array | ArrayBuffer {
  return (
    value &&
    typeof value === "object" &&
    (value.constructor === Buffer ||
      value instanceof TypedArray ||
      value instanceof ArrayBuffer)
  );
}

export function normalizeBinaryData(
  value: Buffer | Uint8Array | ArrayBuffer | Buffer[]
): Buffer {
  if (value instanceof Buffer) {
    return value;
  } else if (value instanceof TypedArray) {
    return Buffer.from(value as Uint8Array);
  } else if (Array.isArray(value)) {
    return Buffer.concat(value);
  } else if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  } else {
    throw new Error(`Invalid binary data: ${value}`);
  }
}
