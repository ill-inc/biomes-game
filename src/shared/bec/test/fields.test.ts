import {
  decodeStruct,
  encodeStruct,
  float64FieldCoder,
  listFieldCoder,
  mapFieldCoder,
  setFieldCoder,
  stringFieldCoder,
  StructDescriptor,
  structFieldCoder,
  tupleFieldCoder,
  uint32FieldCoder,
  WireType,
} from "@/shared/bec/fields";
import type { BiomesId } from "@/shared/ids";
import { generateTestId } from "@/shared/test_helpers";
import assert from "assert";

const TEST_ID = generateTestId();

describe("Proto3 compatability tests", () => {
  const buffer = Buffer.alloc(100);
  type Test1 = { a: number };
  const test1descriptor = new StructDescriptor<Test1>([
    "a",
    { fieldNumber: 1, coder: uint32FieldCoder },
  ]);

  it("Handles a simple message", () => {
    const original: Test1 = { a: 150 };

    assert.equal(encodeStruct(test1descriptor, original, buffer, 0), 3);
    assert.deepEqual(buffer.subarray(0, 3).toString("hex"), "089601");
    assert.deepEqual(decodeStruct(test1descriptor, buffer.subarray(0, 3)), {
      a: 150,
    });
  });
  type Test2 = { b: string };
  const test2descriptor = new StructDescriptor<Test2>([
    "b",
    { fieldNumber: 2, coder: stringFieldCoder },
  ]);

  it("Handles a simple string message", () => {
    const original: Test2 = { b: "testing" };

    assert.equal(encodeStruct(test2descriptor, original, buffer, 0), 9);
    assert.deepEqual(
      buffer.subarray(0, 9).toString("hex"),
      "120774657374696e67"
    );
    assert.deepEqual(decodeStruct(test2descriptor, buffer.subarray(0, 9)), {
      b: "testing",
    });
  });

  type Test3 = { c: Test1 };
  const test3descriptor = new StructDescriptor<Test3>([
    "c",
    { fieldNumber: 3, coder: structFieldCoder(test1descriptor) },
  ]);

  it("Handles a simple embedded message", () => {
    const original: Test3 = { c: { a: 150 } };
    assert.equal(encodeStruct(test3descriptor, original, buffer, 0), 5);
    assert.deepEqual(buffer.subarray(0, 5).toString("hex"), "1a03089601");
    assert.deepEqual(decodeStruct(test3descriptor, buffer.subarray(0, 5)), {
      c: { a: 150 },
    });
  });

  type Test4 = { d: number[] };
  const test4descriptor = new StructDescriptor<Test4>([
    "d",
    {
      fieldNumber: 4,
      coder: listFieldCoder(uint32FieldCoder),
    },
  ]);

  it("Handles a packed repeated field", () => {
    const original: Test4 = { d: [3, 270, 86942] };
    assert.equal(encodeStruct(test4descriptor, original, buffer, 0), 8);
    assert.deepEqual(buffer.subarray(0, 8).toString("hex"), "2206038e029ea705");
    assert.deepEqual(decodeStruct(test4descriptor, buffer.subarray(0, 8)), {
      d: [3, 270, 86942],
    });
  });

  it("Handles an unpacked repeated field", () => {
    buffer.write("2003208e02209ea705", "hex");
    assert.deepEqual(decodeStruct(test4descriptor, buffer.subarray(0, 9)), {
      d: [3, 270, 86942],
    });
  });
});

describe("Collection tests", () => {
  it("encodes and decodes", () => {
    type Test6 = {
      list: number[];
      map: Map<string, number>;
      set: Set<string>;
      tuple: [number, number];
    };
    const descriptor = new StructDescriptor<Test6>(
      ["list", { fieldNumber: 1, coder: listFieldCoder(uint32FieldCoder) }],
      [
        "map",
        {
          fieldNumber: 2,
          coder: mapFieldCoder(stringFieldCoder, uint32FieldCoder),
        },
      ],
      ["set", { fieldNumber: 3, coder: setFieldCoder(stringFieldCoder) }],
      [
        "tuple",
        {
          fieldNumber: 4,
          coder: tupleFieldCoder(uint32FieldCoder, uint32FieldCoder),
        },
      ]
    );

    const buffer = Buffer.alloc(100);
    const value: Test6 = {
      list: [1, 2, 3, 4],
      map: new Map([
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ]),
      set: new Set(["a", "b", "c"]),
      tuple: [1, 2],
    };

    assert.equal(encodeStruct(descriptor, value, buffer, 0), 40);
    assert.deepEqual(
      buffer.subarray(0, 40).toString("hex"),
      // list
      "0a" + // Field 1, Wire Type 2 ([1, 2, 3, 4])
        "04" + // Length 4
        "01020304" + // 1, 2, 3, 4
        // map
        "12" + // Field 2, Wire Type 2 ([key: a, value: 1])
        "05" + // Length 5
        "0a" + // Field 1, Wire Type 2 (key)
        "0161" + // Length 1, ascii 'a'
        "1001" + // Field 2, Wire Type 0 (value), 1
        "12" + // Field 2, Wire Type 2 ([key: b, value: 2])
        "05" + // Length 5
        "0a" + // Field 1, Wire Type 2 (key)
        "0162" + // Length 1, ascii 'b'
        "1002" + // Field 2, Wire Type 0 (value), 2
        "12" + // Field 2, Wire Type 2 ([key: c, value: 3])
        "05" + // Length 5
        "0a" + // Field 1, Wire Type 2 (key)
        "0163" + // Length 1, ascii 'c'
        "1003" + // Field 2, Wire Type 0 (value), 3
        // set
        "1a" + // Field 3, Wire Type 2
        "0161" + // Length 1, ascii 'a'
        "1a" + // Field 3, Wire Type 2
        "0162" + // Length 1, ascii 'b'
        "1a" + // Field 3, Wire Type 2
        "0163" + // Length 1, ascii 'c'
        // tuple
        "22" + // Field 4, Wire Type 2 ([1, 2])
        "02" + // Length 2
        "0102" // 1, 2
    );
    assert.deepEqual(decodeStruct(descriptor, buffer.subarray(0, 40)), value);
  });

  it("encodes a player-like update", () => {
    type Position = {
      v: [number, number, number];
    };
    const positionDescriptor = new StructDescriptor<Position>([
      "v",
      {
        fieldNumber: 1,
        coder: tupleFieldCoder(
          float64FieldCoder,
          float64FieldCoder,
          float64FieldCoder
        ),
      },
    ]);
    type Orientation = {
      v: [number, number];
    };
    const orientationDescriptor = new StructDescriptor<Orientation>([
      "v",
      {
        fieldNumber: 1,
        coder: tupleFieldCoder(float64FieldCoder, float64FieldCoder),
      },
    ]);
    type Entity = {
      id: BiomesId;
      position: Position;
      orientation: Orientation;
    };
    const entityDescriptor = new StructDescriptor<Entity>(
      ["id", { fieldNumber: 1, coder: float64FieldCoder }],
      [
        "position",
        { fieldNumber: 2, coder: structFieldCoder(positionDescriptor) },
      ],
      [
        "orientation",
        { fieldNumber: 3, coder: structFieldCoder(orientationDescriptor) },
      ]
    );
    const changeCoder = tupleFieldCoder(
      uint32FieldCoder, // Kind.
      uint32FieldCoder, // Tick,
      structFieldCoder(entityDescriptor)
    );

    const value = [
      1,
      5,
      <Entity>{
        id: TEST_ID,
        position: {
          v: [4.123, 5.456, 6.789],
        },
        orientation: {
          v: [7.123, 8.456],
        },
      },
    ] as [number, number, Entity];

    const buffer = Buffer.alloc(100);
    assert.equal(changeCoder.encode(undefined, value, buffer, 0), 61);
    assert.deepEqual(
      changeCoder.decode(WireType.LengthDelimited, buffer.subarray(0, 61), 0),
      [61, value]
    );
  });
});
