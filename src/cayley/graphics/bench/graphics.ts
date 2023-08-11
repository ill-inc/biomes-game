import { runSuite } from "@/cayley/bench/common";
import { toBlockGeometry } from "@/cayley/graphics/blocks";
import { fillArray } from "@/cayley/numerics/arrays";

// Contains a pyramid of voxels.
const BLOCK_TENSOR = (() => {
  const mask = fillArray("U32", [32, 32, 32], 0);
  for (let i = 0; i < 16; i += 1) {
    mask.assign(`${i}:${-(i + 1)},${i},${i}:${-(i + 1)}`, 1);
  }
  return mask;
})();

runSuite("blocks", {
  toBlockGeometry: () => {
    toBlockGeometry(BLOCK_TENSOR);
  },
});
