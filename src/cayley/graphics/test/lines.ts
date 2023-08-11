import { toLines } from "@/cayley/graphics/rects";
import { fromArray } from "@/cayley/numerics/arrays";
import type { Coord2 } from "@/cayley/numerics/shapes";
import test from "ava";

test("toLines", (t) => {
  const rects = fromArray(
    "F32",
    [2, 2, 2],
    [
      [
        [0, 0],
        [2, 2],
      ],
      [
        [1, 1],
        [3, 3],
      ],
    ]
  );
  const lines = toLines(rects);

  const isLine = (line: number, [x0, y0]: Coord2, [x1, y1]: Coord2) => {
    t.is(lines.get([line, 0, 0]), x0);
    t.is(lines.get([line, 0, 1]), y0);
    t.is(lines.get([line, 1, 0]), x1);
    t.is(lines.get([line, 1, 1]), y1);
  };

  isLine(0, [0, 0], [0, 2]);
  isLine(1, [1, 2], [1, 3]);
  isLine(2, [2, 0], [2, 1]);
  isLine(3, [3, 1], [3, 3]);

  isLine(4, [0, 0], [2, 0]);
  isLine(5, [2, 1], [3, 1]);
  isLine(6, [0, 2], [1, 2]);
  isLine(7, [1, 3], [3, 3]);
});
