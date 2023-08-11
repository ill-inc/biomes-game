import { sizeAABB } from "@/shared/math/linear";
import type { ReadonlyAABB, ReadonlyVec3 } from "@/shared/math/types";
import { BufferAttribute, BufferGeometry } from "three";

export class WireframeBoxGeometry extends BufferGeometry {
  parameters: {
    boxes: ReadonlyAABB[];
    thickness: number;
  };

  constructor(boxes: ReadonlyAABB[], thickness = 0.015) {
    super();
    (this.type as any) = "WireframeBoxGeometry";

    this.parameters = {
      boxes: boxes,
      thickness: thickness,
    };

    // prettier-ignore
    const makeCube = (x: number, y: number, z: number, w: number) => [
      0, 0, 0,
      x, 0, 0,
      x, 0, w,
      x, 0, w,
      0, 0, w,
      0, 0, 0,
      x, 0, z-w,
      x, 0, z,
      0, 0, z,
      0, 0, z,
      0, 0, z-w,
      x, 0, z-w,
      w, 0, z-w,
      0, 0, z-w,
      0, 0, w,
      0, 0, w,
      w, 0, w,
      w, 0, z-w,
      x, 0, w,
      x, 0, z-w,
      x-w, 0, z-w,
      x, 0, w,
      x-w, 0, z-w,
      x-w, 0, w,

      x, y, w,
      x, y, 0,
      0, y, 0,
      0, y, 0,
      0, y, w,
      x, y, w,
      0, y, z,
      x, y, z,
      x, y, z-w,
      x, y, z-w,
      0, y, z-w,
      0, y, z,
      0, y, w,
      0, y, z-w,
      w, y, z-w,
      w, y, z-w,
      w, y, w,
      0, y, w,
      x-w, y, z-w,
      x, y, z-w,
      x, y, w,
      x-w, y, w,
      x-w, y, z-w,
      x, y, w,

      0, 0, z,
      x, 0, z,
      x, w, z,
      x, w, z,
      0, w, z,
      0, 0, z,
      x, y-w, z,
      x, y, z,
      0, y, z,
      0, y, z,
      0, y-w, z,
      x, y-w, z,
      w, y-w, z,
      0, y-w, z,
      0, w, z,
      0, w, z,
      w, w, z,
      w, y-w, z,
      x, w, z,
      x, y-w, z,
      x-w, y-w, z,
      x, w, z,
      x-w, y-w, z,
      x-w, w, z,

      x, w, 0,
      x, 0, 0,
      0, 0, 0,
      0, 0, 0,
      0, w, 0,
      x, w, 0,
      0, y, 0,
      x, y, 0,
      x, y-w, 0,
      x, y-w, 0,
      0, y-w, 0,
      0, y, 0,
      0, w, 0,
      0, y-w, 0,
      w, y-w, 0,
      w, y-w, 0,
      w, w, 0,
      0, w, 0,
      x-w, y-w, 0,
      x, y-w, 0,
      x, w, 0,
      x-w, w, 0,
      x-w, y-w, 0,
      x, w, 0,

      x, 0, 0,
      x, y, 0,
      x, y, w,
      x, y, w,
      x, 0, w,
      x, 0, 0,
      x, y, z-w,
      x, y, z,
      x, 0, z,
      x, 0, z,
      x, 0, z-w,
      x, y, z-w,
      x, w, z-w,
      x, 0, z-w,
      x, 0, w,
      x, 0, w,
      x, w, w,
      x, w, z-w,
      x, y, w,
      x, y, z-w,
      x, y-w, z-w,
      x, y, w,
      x, y-w, z-w,
      x, y-w, w,

      0, y, w,
      0, y, 0,
      0, 0, 0,
      0, 0, 0,
      0, 0, w,
      0, y, w,
      0, 0, z,
      0, y, z,
      0, y, z-w,
      0, y, z-w,
      0, 0, z-w,
      0, 0, z,
      0, 0, w,
      0, 0, z-w,
      0, w, z-w,
      0, w, z-w,
      0, w, w,
      0, 0, w,
      0, y-w, z-w,
      0, y, z-w,
      0, y, w,
      0, y-w, w,
      0, y-w, z-w,
      0, y, w,
    ];

    const shift = (arr: number[], pos: ReadonlyVec3) => {
      const ret: number[] = [];
      for (let i: number = 0; i < arr.length; i += 3) {
        ret.push(arr[i] + pos[0]);
        ret.push(arr[i + 1] + pos[1]);
        ret.push(arr[i + 2] + pos[2]);
      }
      return ret;
    };

    const vertices: number[] = [];
    for (const box of boxes) {
      const cube = makeCube(...sizeAABB(box), thickness);
      vertices.push(...shift(cube, box[0]));
    }

    this.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(vertices), 3)
    );
  }
}
