import type { Permute, Reflect } from "@/shared/asset_defs/shapes";
import { add, max, min, sub } from "@/shared/math/linear";
import type { Rotation } from "@/shared/math/rotation";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { reduce } from "lodash";

export function rotationToPermuteReflect(
  rotation: Rotation
): [Permute, Reflect] {
  const ROTATION_TO_PERMUTE_REFLECT: [Permute, Reflect][] = [
    [
      [0, 1, 2],
      [0, 0, 0],
    ],
    [
      [2, 1, 0],
      [1, 0, 0],
    ],
    [
      [0, 1, 2],
      [1, 0, 1],
    ],
    [
      [2, 1, 0],
      [0, 0, 1],
    ],
  ];
  return ROTATION_TO_PERMUTE_REFLECT[rotation];
}

export function permuteVector(v: ReadonlyVec3, permute: Permute): ReadonlyVec3 {
  return [v[permute[0]], v[permute[1]], v[permute[2]]];
}

export function transformSize(
  size: ReadonlyVec3,
  permute: Permute
): ReadonlyVec3 {
  return permuteVector(size, permute);
}

export function transformPosition(
  pos: ReadonlyVec3,
  newBoxSize: ReadonlyVec3,
  permute: Permute,
  reflect: Reflect
) {
  const permutedPos = permuteVector(pos, permute);
  const reflectedPos: ReadonlyVec3 = [
    reflect[0] === 0 ? permutedPos[0] : newBoxSize[0] - permutedPos[0] - 1,
    reflect[1] === 0 ? permutedPos[1] : newBoxSize[1] - permutedPos[1] - 1,
    reflect[2] === 0 ? permutedPos[2] : newBoxSize[2] - permutedPos[2] - 1,
  ];
  return reflectedPos;
}

export class VoxelMask {
  constructor(private array: ReadonlyVec3[] = []) {}

  toArray(): ReadonlyVec3[] {
    return this.array;
  }

  normalize(): void {
    const v0 = this.min;
    this.array = this.array.map((v) => sub(v, v0));
  }

  private get min(): ReadonlyVec3 {
    return reduce(this.array, (prev, curr) => min(prev, curr), [
      Infinity,
      Infinity,
      Infinity,
    ] as ReadonlyVec3);
  }

  private get max(): ReadonlyVec3 {
    return reduce(this.array, (prev, curr) => max(prev, curr), [
      -Infinity,
      -Infinity,
      -Infinity,
    ] as ReadonlyVec3);
  }

  get boxSize(): ReadonlyVec3 {
    if (this.array.length === 0) {
      return [0, 0, 0];
    }
    return add(sub(this.max, this.min), [1, 1, 1]);
  }

  transform(permute: Permute, reflect: Reflect): VoxelMask {
    const newBoxSize = transformSize(this.boxSize, permute);
    const newArray = this.array.map((v) =>
      transformPosition(v, newBoxSize, permute, reflect)
    );
    const mask = new VoxelMask(newArray);
    mask.normalize();
    return mask;
  }
}
