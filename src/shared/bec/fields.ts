import {
  decodeSignedVarint32,
  decodeSignedVarint64,
  decodeUnsignedVarint32,
  decodeUnsignedVarint64,
  encodeSignedVarint32,
  encodeSignedVarint64,
  encodeUnsignedVarint32,
  encodeUnsignedVarint64,
} from "@/shared/bec/varint";
import { mapMap } from "@/shared/util/collections";
import type { TupleOf } from "@/shared/util/type_helpers";

export const enum WireType {
  Varint = 0,
  Fixed64 = 1,
  LengthDelimited = 2,
  Fixed32 = 5,
}

export function fieldLength(
  wireType: number,
  buffer: Buffer,
  offset: number
): number {
  switch (wireType) {
    case WireType.Varint:
      // We don't care the value, so permit it to be as large as possible.
      return decodeUnsignedVarint64(buffer, offset)[0];
    case WireType.Fixed64:
      return 8;
    case WireType.LengthDelimited:
      const [lengthSize, length] = decodeUnsignedVarint32(buffer, offset);
      return lengthSize + length;
    case WireType.Fixed32:
      return 4;
    default:
      throw new Error(`Unknown wireType ${wireType}@${offset}`);
  }
}

export function wireTypeEncode(
  wireType: WireType,
  fieldNumber: number,
  buffer: Buffer,
  offset: number
): number {
  return encodeUnsignedVarint32((fieldNumber << 3) | wireType, buffer, offset);
}

export interface FieldCoder<T, IV = T> {
  decode(
    wireType: WireType,
    buffer: Buffer,
    offset: number
  ): [number, IV] | number;
  encode(
    fieldNumber: undefined | number,
    value: T,
    buffer: Buffer,
    offset: number
  ): number;
  combine(values: IV[]): T;
  defaultValue?: () => T;
  wireType: WireType;
}

function makeScalarFieldCoder<T>(
  wireType: WireType,
  defaultValue: (() => T) | undefined,
  decode: (buffer: Buffer, offset: number) => [number, T],
  encode: (value: T, buffer: Buffer, offset: number) => number
): FieldCoder<T> {
  return {
    wireType,
    defaultValue,
    decode: (wireType: WireType, buffer: Buffer, offset: number) => {
      if (wireType !== wireType) {
        return offset;
      }
      return decode(buffer, offset);
    },

    encode: (
      fieldNumber: undefined | number,
      value: T,
      buffer: Buffer,
      offset: number
    ) => {
      if (fieldNumber !== undefined) {
        offset = wireTypeEncode(wireType, fieldNumber, buffer, offset);
      }
      offset = encode(value, buffer, offset);
      return offset;
    },

    combine: (values: T[]) => values[values.length - 1],
  };
}

export const sint32FieldCoder = makeScalarFieldCoder<number>(
  WireType.Varint,
  () => 0,
  decodeSignedVarint32,
  encodeSignedVarint32
);

export const uint32FieldCoder = makeScalarFieldCoder<number>(
  WireType.Varint,
  () => 0,
  decodeUnsignedVarint32,
  encodeUnsignedVarint32
);

export const sint64FieldCoder = makeScalarFieldCoder<bigint>(
  WireType.Varint,
  () => 0n,
  decodeSignedVarint64,
  encodeSignedVarint64
);

export const uint64FieldCoder = makeScalarFieldCoder<bigint>(
  WireType.Varint,
  () => 0n,
  decodeUnsignedVarint64,
  encodeUnsignedVarint64
);

export const boolFieldCoder = makeScalarFieldCoder<boolean>(
  WireType.Varint,
  () => false,
  (buffer, offset) => {
    const [newOffset, value] = decodeUnsignedVarint32(buffer, offset);
    return [newOffset, value !== 0];
  },
  (value, buffer, offset) => {
    buffer[offset++] = value ? 1 : 0;
    return offset;
  }
);

export const float32FieldCoder: FieldCoder<number, number> = {
  wireType: WireType.Fixed32,
  defaultValue: () => 0,
  decode: (wireType: WireType, buffer: Buffer, offset: number) => {
    if (wireType === WireType.Fixed32) {
      return [offset + 4, buffer.readFloatLE(offset)];
    } else if (wireType === WireType.Fixed64) {
      return [offset + 8, buffer.readDoubleLE(offset)];
    } else {
      return offset;
    }
  },

  encode: (
    fieldNumber: undefined | number,
    value: number,
    buffer: Buffer,
    offset: number
  ) => {
    if (fieldNumber !== undefined) {
      offset = wireTypeEncode(WireType.Fixed32, fieldNumber, buffer, offset);
    }
    buffer.writeFloatLE(value, offset);
    return offset + 4;
  },
  combine: (values: number[]) => values[values.length - 1],
};

export const float64FieldCoder: FieldCoder<number, number> = {
  wireType: WireType.Fixed64,
  defaultValue: () => 0,
  decode: (wireType: WireType, buffer: Buffer, offset: number) => {
    if (wireType === WireType.Fixed32) {
      return [offset + 4, buffer.readFloatLE(offset)];
    } else if (wireType === WireType.Fixed64) {
      return [offset + 8, buffer.readDoubleLE(offset)];
    } else {
      return offset;
    }
  },

  encode: (
    fieldNumber: undefined | number,
    value: number,
    buffer: Buffer,
    offset: number
  ) => {
    if (fieldNumber !== undefined) {
      offset = wireTypeEncode(WireType.Fixed64, fieldNumber, buffer, offset);
    }
    buffer.writeDoubleLE(value, offset);
    return offset + 8;
  },
  combine: (values: number[]) => values[values.length - 1],
};

const utf8Encoder = new TextEncoder();

const WORKING_BUFFER_SIZE = 1 << 20; // 1MB.

// Maintain a pool of buffers for temporary encoding/decoding operations (e.g.
// struct serialization or utf8 encoding).
class BufferPool {
  private buffers: Buffer[] = [];

  get(): Buffer {
    if (this.buffers.length > 0) {
      return this.buffers.splice(0, 1)[0];
    }
    return Buffer.alloc(WORKING_BUFFER_SIZE);
  }

  release(buffer: Buffer) {
    this.buffers.push(buffer);
  }
}

const workingBuffers = new BufferPool();

export const stringFieldCoder = makeScalarFieldCoder<string>(
  WireType.LengthDelimited,
  () => "",
  (buffer, offset) => {
    let length = 0;
    [offset, length] = decodeUnsignedVarint32(buffer, offset);
    if (buffer.length < offset + length) {
      throw new RangeError("underflow");
    }
    return [offset + length, buffer.toString("utf8", offset, offset + length)];
  },
  (value, buffer, offset) => {
    const working = workingBuffers.get();
    try {
      const encodeResult = utf8Encoder.encodeInto(value, working);
      if (encodeResult.read !== value.length) {
        throw new RangeError("overflow");
      }
      encodeResult.written ??= 0;
      offset = encodeUnsignedVarint32(encodeResult.written, buffer, offset);
      if (encodeResult.written > 0) {
        if (buffer.length - offset < encodeResult.written) {
          throw new RangeError("overflow");
        }
        buffer.set(working.subarray(0, encodeResult.written), offset);
      }
      return offset + encodeResult.written;
    } finally {
      workingBuffers.release(working);
    }
  }
);

type FieldCoderFor<T> = T extends (infer U)[]
  ? FieldCoder<T, U[]>
  : T extends Set<infer U>
  ? FieldCoder<T, U[]>
  : T extends TupleOf<infer U, infer _N>
  ? FieldCoder<T, U[]>
  : T extends Map<infer K, infer V>
  ? FieldCoder<Map<K, V>, [K, V][]>
  : FieldCoder<T, T>;

type FieldCoderIV<T> = T extends FieldCoder<infer _A, infer IV> ? IV : never;

type CollectedStructFields<S> = {
  [K in keyof S]: FieldCoderIV<FieldCoderFor<S[K]>>[];
};

interface FieldDecoder<S> {
  decode(
    into: CollectedStructFields<S>,
    wireType: WireType,
    buffer: Buffer,
    offset: number
  ): number;
  combine(from: CollectedStructFields<S>, into: S): void;
}

export interface FieldDescriptor<T> {
  fieldNumber: number;
  coder: FieldCoderFor<T>;
  optional?: boolean;
}

function makeFieldDecoder<S, K extends keyof S>(
  key: K,
  descriptor: FieldDescriptor<S[K]>
): FieldDecoder<S> {
  return {
    decode: (
      into: CollectedStructFields<S>,
      wireType: WireType,
      buffer: Buffer,
      offset: number
    ) => {
      const result = descriptor.coder.decode(wireType, buffer, offset);
      if (typeof result === "number") {
        return result;
      }
      let existing = into[key];
      if (existing === undefined) {
        into[key] = existing = [];
      }
      existing.push(result[1] as any);
      return result[0];
    },
    combine: (from: CollectedStructFields<S>, into: S) => {
      const ivs = from[key];
      if (ivs.length > 0) {
        (into[key] as any) = descriptor.coder.combine(ivs as any);
      } else if (!descriptor.optional) {
        // Field is non-optional, fill with default
        if (descriptor.coder.defaultValue === undefined) {
          throw new Error(`Missing field ${String(key)} with no default`);
        }
        into[key] = descriptor.coder.defaultValue() as S[K];
      }
    },
  };
}

export class StructDescriptor<S> {
  public readonly fields: Map<keyof S, FieldDescriptor<S[keyof S]>>;
  public readonly byNumber: Map<number, FieldDecoder<S>>;
  constructor(...fields: [keyof S, FieldDescriptor<unknown>][]) {
    this.fields = new Map(fields) as Map<keyof S, FieldDescriptor<S[keyof S]>>;
    this.byNumber = new Map<number, FieldDecoder<S>>(
      fields.map(([key, field]) => [
        field.fieldNumber,
        makeFieldDecoder(key, field as FieldDescriptor<S[keyof S]>),
      ])
    );
  }
}

export function decodeStruct<S>(
  descriptor: StructDescriptor<S>,
  buffer: Buffer
): S {
  const ret: any = {};
  let offset = 0;
  let fieldNumberAndType = 0;
  while (offset < buffer.length) {
    [offset, fieldNumberAndType] = decodeUnsignedVarint32(buffer, offset);
    const fieldNumber = fieldNumberAndType >> 3;
    const wireType = fieldNumberAndType & 7;
    const fieldDescriptor = descriptor.byNumber.get(fieldNumber);
    if (fieldDescriptor !== undefined) {
      const newOffset = fieldDescriptor.decode(ret, wireType, buffer, offset);
      if (newOffset !== offset) {
        offset = newOffset;
        continue;
      }
    }
    // Failed to interpret the field, skip it.
    offset += fieldLength(wireType, buffer, offset);
  }
  if (offset !== buffer.length) {
    throw new RangeError("underflow");
  }
  for (const fieldDecoder of descriptor.byNumber.values()) {
    fieldDecoder.combine(ret, ret);
  }
  return ret as S;
}

export function encodeStruct<S>(
  descriptor: StructDescriptor<S>,
  value: S,
  buffer: Buffer,
  offset: number
): number {
  for (const [key, fieldDescriptor] of descriptor.fields) {
    offset = fieldDescriptor.coder.encode(
      fieldDescriptor.fieldNumber,
      value[key] as any,
      buffer,
      offset
    );
  }
  return offset;
}

export function structFieldCoder<S>(
  descriptor: StructDescriptor<S>,
  defaultValue?: () => S
) {
  return makeScalarFieldCoder<S>(
    WireType.LengthDelimited,
    defaultValue,
    (buffer, offset) => {
      let length = 0;
      [offset, length] = decodeUnsignedVarint32(buffer, offset);
      return [
        offset + length,
        decodeStruct(descriptor, buffer.subarray(offset, offset + length)),
      ];
    },
    (value, buffer, offset) => {
      const working = workingBuffers.get();
      try {
        const used = encodeStruct(descriptor, value, working, 0);
        offset = encodeUnsignedVarint32(used, buffer, offset);
        if (used > 0) {
          if (buffer.length - offset < used) {
            throw new RangeError("overflow");
          }
          buffer.set(working.subarray(0, used), offset);
        }
        return offset + used;
      } finally {
        workingBuffers.release(working);
      }
    }
  );
}

interface ListFieldCoder<T> extends FieldCoder<ReadonlyArray<T>, T[]> {
  encode(
    fieldNumber: number,
    values: Iterable<T>,
    buffer: Buffer,
    offset: number
  ): number;
}

export function listFieldCoder<T>(
  valueCoder: FieldCoder<T>
): ListFieldCoder<T> {
  return {
    wireType: WireType.LengthDelimited,
    defaultValue: () => [],
    decode: (wireType: WireType, buffer: Buffer, offset: number) => {
      if (
        wireType !== WireType.LengthDelimited ||
        valueCoder.wireType === WireType.LengthDelimited
      ) {
        // Unpacked fields.
        const result = valueCoder.decode(wireType, buffer, offset);
        if (typeof result === "number") {
          return result;
        }
        return [result[0], [result[1]]];
      }
      // Packed field, stores many values.
      const startOffset = offset;
      const output = [];
      let length = 0;
      [offset, length] = decodeUnsignedVarint32(buffer, offset);
      const endOffset = offset + length;
      while (offset < endOffset) {
        const result = valueCoder.decode(valueCoder.wireType, buffer, offset);
        if (typeof result === "number") {
          // Invalid packed field contents, abandon all.
          return startOffset;
        }
        offset = result[0];
        output.push(result[1]);
      }
      return [offset, output];
    },

    encode: (
      fieldNumber: number,
      values: T[],
      buffer: Buffer,
      offset: number
    ) => {
      if (valueCoder.wireType === WireType.LengthDelimited) {
        // Unpacked fields.
        for (const value of values) {
          offset = valueCoder.encode(fieldNumber, value, buffer, offset);
        }
        return offset;
      }
      // Packed field, stores many values.
      offset = wireTypeEncode(
        WireType.LengthDelimited,
        fieldNumber,
        buffer,
        offset
      );
      let used = 0;
      const working = workingBuffers.get();
      try {
        for (const value of values) {
          used = valueCoder.encode(undefined, value, working, used);
        }
        offset = encodeUnsignedVarint32(used, buffer, offset);
        if (used > 0) {
          if (buffer.length - offset < used) {
            throw new RangeError("overflow");
          }
          buffer.set(working.subarray(0, used), offset);
        }
        return offset + used;
      } finally {
        workingBuffers.release(working);
      }
    },

    combine: (values: T[][]) => values.flat(),
  };
}

export function mapFieldCoder<K, V>(
  keyCoder: FieldCoder<K>,
  valueCoder: FieldCoder<V>
): FieldCoder<Map<K, V>, [K, V][]> {
  type MapEntry = { key: K; value: V };
  const entryCoder = structFieldCoder<MapEntry>(
    new StructDescriptor<MapEntry>(
      ["key", { fieldNumber: 1, coder: keyCoder }],
      ["value", { fieldNumber: 2, coder: valueCoder }]
    ),
    () => {
      throw new Error("Should not be generating default values for maps!");
    }
  );
  const listCoder = listFieldCoder(entryCoder);
  return {
    wireType: entryCoder.wireType,
    defaultValue: () => new Map(),

    decode: (wireType: WireType, buffer: Buffer, offset: number) => {
      const result = listCoder.decode(wireType, buffer, offset);
      if (typeof result === "number") {
        return result;
      }
      return [result[0], result[1].map(({ key, value }) => [key, value])];
    },

    encode: (
      fieldNumber: number,
      values: Map<K, V>,
      buffer: Buffer,
      offset: number
    ) => {
      return listCoder.encode(
        fieldNumber,
        mapMap(values, (value, key) => ({ key, value })),
        buffer,
        offset
      );
    },

    combine: (values: [K, V][][]) =>
      values.reduce((acc, values) => {
        for (const [key, value] of values) {
          acc.set(key, value);
        }
        return acc;
      }, new Map()),
  };
}

export function setFieldCoder<T>(
  valueCoder: FieldCoder<T>
): FieldCoder<ReadonlySet<T>, T[]> {
  return {
    ...listFieldCoder(valueCoder),
    combine: (values: T[][]) => new Set(values.flat()),
    defaultValue: () => new Set(),
  };
}

export type FieldCoderType<T> = T extends FieldCoder<infer U> ? U : never;

export type FieldCoderTypes<T> = T extends [infer First, ...infer Rest]
  ? [FieldCoderType<First>, ...FieldCoderTypes<Rest>]
  : [];

export function tupleFieldCoder<FieldCoders extends FieldCoder<any>[]>(
  ...valueCoders: FieldCoders
): FieldCoder<FieldCoderTypes<FieldCoders>> {
  type Tuple = FieldCoderTypes<FieldCoders>;

  // There is a default value if all the value coders have a default value.
  const defaultValue = valueCoders.every((v) => v.defaultValue !== undefined)
    ? () => valueCoders.map((v) => v.defaultValue!()) as Tuple
    : undefined;

  return {
    wireType: WireType.LengthDelimited,
    defaultValue,
    decode: (wireType: WireType, buffer: Buffer, offset: number) => {
      if (wireType !== WireType.LengthDelimited) {
        return offset;
      }
      const startOffset = offset;
      const output = [];
      let length = 0;
      [offset, length] = decodeUnsignedVarint32(buffer, offset);
      const endOffset = offset + length;
      for (const valueCoder of valueCoders) {
        if (offset >= endOffset) {
          // Not enough data for all the fields.
          return startOffset;
        }
        const result = valueCoder.decode(valueCoder.wireType, buffer, offset);
        if (typeof result === "number") {
          // Invalid field contents, abandon all.
          return startOffset;
        }
        offset = result[0];
        output.push(result[1]);
      }
      return [offset, output] as [number, Tuple];
    },
    encode: (
      fieldNumber: number,
      values: Tuple,
      buffer: Buffer,
      offset: number
    ) => {
      // Packed field, stores many values.
      if (fieldNumber !== undefined) {
        offset = wireTypeEncode(
          WireType.LengthDelimited,
          fieldNumber,
          buffer,
          offset
        );
      }
      let used = 0;
      const working = workingBuffers.get();
      try {
        for (let i = 0; i < valueCoders.length; i++) {
          used = valueCoders[i].encode(undefined, values[i], working, used);
        }
        offset = encodeUnsignedVarint32(used, buffer, offset);
        if (used > 0) {
          if (buffer.length - offset < used) {
            throw new RangeError("overflow");
          }
          buffer.set(working.subarray(0, used), offset);
        }
        return offset + used;
      } finally {
        workingBuffers.release(working);
      }
    },
    combine: (values: Tuple[]) => values[values.length - 1],
  };
}
