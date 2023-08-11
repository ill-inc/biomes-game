import {
  prepare,
  zrpcWebDeserialize,
  zrpcWebSerialize,
} from "@/shared/zrpc/serde";
import assert from "assert";
import { z } from "zod";

describe("Tests prepare method", () => {
  const A = {
    prepareForZrpc: () => "A",
  };

  const B = {
    prepareForZrpc: () => "B",
  };

  it("prepare should work for primitives", () => {
    assert.deepEqual(prepare(123), 123);
    assert.deepEqual(prepare(true), true);
    assert.deepEqual(prepare("hello"), "hello");
  });

  it("prepare should work for arrays", () => {
    assert.deepEqual(prepare([1, [2, [3, 4], 5], 6]), [1, [2, [3, 4], 5], 6]);
  });

  it("prepare should work for prepareForZrpc types", () => {
    assert.deepEqual(prepare(A), "A");
  });

  it("prepare should work for complex objects", () => {
    const result = prepare({
      a: A,
      z: [A, A, B, 3, { b: B, c: 3 }],
    });

    assert.deepEqual(result, {
      a: "A",
      z: ["A", "A", "B", 3, { b: "B", c: 3 }],
    });
  });

  it("serialize should support maps", () => {
    const map = new Map();
    map.set("a", 1);
    map.set("b", 5);

    assert.deepEqual(zrpcWebDeserialize(zrpcWebSerialize(map), z.any()), map);
  });

  it("can support nested prepare", () => {
    const C = {
      prepareForZrpc: () => A,
    };

    assert.deepEqual(prepare({ c: C }), { c: "A" });
  });
});
