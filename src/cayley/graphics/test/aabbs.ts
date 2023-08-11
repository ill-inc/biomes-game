import { toQuads } from "@/cayley/graphics/aabbs";
import { fromArray } from "@/cayley/numerics/arrays";
import type { Coord2, Coord3 } from "@/cayley/numerics/shapes";
import test from "ava";

test("toQuads", (t) => {
  const aabb = fromArray(
    "F32",
    [1, 2, 3],
    [
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
    ]
  );
  const quads = toQuads(aabb);

  const isPoint = (quad: Coord2, [x, y, z]: Coord3) => {
    t.is(quads.get([...quad, 0]), x);
    t.is(quads.get([...quad, 1]), y);
    t.is(quads.get([...quad, 2]), z);
  };

  // quad 0
  isPoint([0, 0], [1.0, 2.0, 3.0]);
  isPoint([0, 1], [1.0, 2.0, 6.0]);
  isPoint([0, 2], [1.0, 5.0, 6.0]);
  isPoint([0, 3], [1.0, 5.0, 3.0]);

  // quad 1
  isPoint([1, 0], [4.0, 2.0, 6.0]);
  isPoint([1, 1], [4.0, 2.0, 3.0]);
  isPoint([1, 2], [4.0, 5.0, 3.0]);
  isPoint([1, 3], [4.0, 5.0, 6.0]);

  // quad 2
  isPoint([2, 0], [1.0, 2.0, 3.0]);
  isPoint([2, 1], [4.0, 2.0, 3.0]);
  isPoint([2, 2], [4.0, 2.0, 6.0]);
  isPoint([2, 3], [1.0, 2.0, 6.0]);

  // quad 3
  isPoint([3, 0], [4.0, 5.0, 3.0]);
  isPoint([3, 1], [1.0, 5.0, 3.0]);
  isPoint([3, 2], [1.0, 5.0, 6.0]);
  isPoint([3, 3], [4.0, 5.0, 6.0]);

  // quad 4
  isPoint([4, 0], [1.0, 2.0, 3.0]);
  isPoint([4, 1], [1.0, 5.0, 3.0]);
  isPoint([4, 2], [4.0, 5.0, 3.0]);
  isPoint([4, 3], [4.0, 2.0, 3.0]);

  // quad 5
  isPoint([5, 0], [1.0, 5.0, 6.0]);
  isPoint([5, 1], [1.0, 2.0, 6.0]);
  isPoint([5, 2], [4.0, 2.0, 6.0]);
  isPoint([5, 3], [4.0, 5.0, 6.0]);
});
