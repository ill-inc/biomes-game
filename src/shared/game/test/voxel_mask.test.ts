import { rotationToPermuteReflect, VoxelMask } from "@/shared/game/voxel_mask";
import { sub } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import assert from "assert";

function normalizeOrder(array: ReadonlyVec3[]): ReadonlyVec3[] {
  return array.sort((a, b) => {
    const diff = sub(a, b);
    return diff[0] !== 0 ? diff[0] : diff[1] !== 0 ? diff[1] : diff[2];
  });
}

function stringToArray(strings: string[]): ReadonlyVec3[] {
  const ret: ReadonlyVec3[] = [];
  strings.forEach((str, i) => {
    str.split("").forEach((chr, j) => {
      if (chr !== " ") {
        ret.push([j, 0, strings.length - i - 1]);
      }
    });
  });
  return normalizeOrder(ret);
}

describe("VoxelMask", () => {
  it(`size and normalize`, () => {
    const array: ReadonlyVec3[] = [
      [1, 1, 1],
      [1, 2, 1],
    ];
    const mask = new VoxelMask(array);
    assert.deepEqual(mask.boxSize, [1, 2, 1]);
    mask.normalize();
    assert.deepEqual(mask.toArray(), [
      [0, 0, 0],
      [0, 1, 0],
    ]);
  });

  it(`transform`, () => {
    const array = stringToArray([
      "X ", //
      "X ", //
      "XX", //
    ]);
    const mask = new VoxelMask(array);
    const reflected = mask.transform([0, 1, 2], [1, 0, 0]);
    assert.deepEqual(
      normalizeOrder(reflected.toArray()),
      stringToArray([
        " X", //
        " X", //
        "XX", //
      ])
    );
    const rotated1 = mask.transform(...rotationToPermuteReflect(1));
    assert.deepEqual(
      normalizeOrder(rotated1.toArray()),
      stringToArray([
        "  X", //
        "XXX", //
      ])
    );
    const rotated2 = rotated1.transform(...rotationToPermuteReflect(1));
    assert.deepEqual(
      normalizeOrder(rotated2.toArray()),
      stringToArray([
        "XX", //
        " X", //
        " X", //
      ])
    );
    const rotated3 = rotated2.transform(...rotationToPermuteReflect(1));
    assert.deepEqual(
      normalizeOrder(rotated3.toArray()),
      stringToArray([
        "XXX", //
        "X  ", //
      ])
    );
  });
});
