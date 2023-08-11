import { IndexedGeometryBuilder } from "@/cayley/graphics/geometry";
import type { EncodedImageData } from "@/cayley/graphics/textures";
import { toTextureArray } from "@/cayley/graphics/textures";
import { positionRNG, ReservoirSampler, where } from "@/cayley/graphics/utils";
import type { Array3 } from "@/cayley/numerics/arrays";
import { fillArray } from "@/cayley/numerics/arrays";
import type { Coord3 } from "@/cayley/numerics/shapes";
import { add } from "@/shared/math/linear";

interface BlockSample {
  criteria: {
    position: "white" | "black";
  };
  material: {
    color: Record<Dir, EncodedImageData>;
    mrea: Record<Dir, EncodedImageData>;
  };
}

export interface Block {
  samples: BlockSample[];
}

export type BlockIndex = Block[];

type Dir = "x_neg" | "x_pos" | "y_neg" | "y_pos" | "z_neg" | "z_pos";

function sampleToTextureIndex(sample: number, dir: Dir) {
  switch (dir) {
    case "x_neg":
      return 6 * (sample - 1) + 0;
    case "x_pos":
      return 6 * (sample - 1) + 1;
    case "y_neg":
      return 6 * (sample - 1) + 2;
    case "y_pos":
      return 6 * (sample - 1) + 3;
    case "z_neg":
      return 6 * (sample - 1) + 4;
    case "z_pos":
      return 6 * (sample - 1) + 5;
  }
}

export function toBlockGeometry(samples: Array3<"U32">) {
  const builder = new IndexedGeometryBuilder();
  const view = samples.view();

  where(
    view
      .ne(0)
      .and(view.slice(":,:,:-1").pad([0, 0, 1], [0, 0, 0]).eq(0))
      .eval(),
    ([z, y, x]) => {
      const offset = builder.vertices.count;
      builder.pushTriangle([offset + 0, offset + 1, offset + 2]);
      builder.pushTriangle([offset + 0, offset + 2, offset + 3]);

      const normal: Coord3 = [-1, 0, 0];
      const texture = sampleToTextureIndex(samples.get([z, y, x]), "x_neg");
      builder.vertices.push(add([x, y, z], [0, 0, 0]), normal, [0, 0], texture);
      builder.vertices.push(add([x, y, z], [0, 0, 1]), normal, [1, 0], texture);
      builder.vertices.push(add([x, y, z], [0, 1, 1]), normal, [1, 1], texture);
      builder.vertices.push(add([x, y, z], [0, 1, 0]), normal, [0, 1], texture);
    }
  );

  where(
    view
      .ne(0)
      .and(view.slice(":,:,1:").pad([0, 0, 0], [0, 0, 1]).eq(0))
      .eval(),
    ([z, y, x]) => {
      const offset = builder.vertices.count;
      builder.pushTriangle([offset + 0, offset + 1, offset + 2]);
      builder.pushTriangle([offset + 0, offset + 2, offset + 3]);

      const normal: Coord3 = [1, 0, 0];
      const texture = sampleToTextureIndex(samples.get([z, y, x]), "x_pos");
      builder.vertices.push(add([x, y, z], [1, 0, 1]), normal, [0, 0], texture);
      builder.vertices.push(add([x, y, z], [1, 0, 0]), normal, [1, 0], texture);
      builder.vertices.push(add([x, y, z], [1, 1, 0]), normal, [1, 1], texture);
      builder.vertices.push(add([x, y, z], [1, 1, 1]), normal, [0, 1], texture);
    }
  );

  where(
    view
      .ne(0)
      .and(view.slice(":,:-1,:").pad([0, 1, 0], [0, 0, 0]).eq(0))
      .eval(),
    ([z, y, x]) => {
      const offset = builder.vertices.count;
      builder.pushTriangle([offset + 0, offset + 1, offset + 2]);
      builder.pushTriangle([offset + 0, offset + 2, offset + 3]);

      const normal: Coord3 = [0, -1, 0];
      const texture = sampleToTextureIndex(samples.get([z, y, x]), "y_neg");
      builder.vertices.push(add([x, y, z], [0, 0, 1]), normal, [0, 0], texture);
      builder.vertices.push(add([x, y, z], [0, 0, 0]), normal, [0, 1], texture);
      builder.vertices.push(add([x, y, z], [1, 0, 0]), normal, [1, 1], texture);
      builder.vertices.push(add([x, y, z], [1, 0, 1]), normal, [1, 0], texture);
    }
  );

  where(
    view
      .ne(0)
      .and(view.slice(":,1:,:").pad([0, 0, 0], [0, 1, 0]).eq(0))
      .eval(),
    ([z, y, x]) => {
      const offset = builder.vertices.count;
      builder.pushTriangle([offset + 0, offset + 1, offset + 2]);
      builder.pushTriangle([offset + 0, offset + 2, offset + 3]);

      const normal: Coord3 = [0, 1, 0];
      const texture = sampleToTextureIndex(samples.get([z, y, x]), "y_pos");
      builder.vertices.push(add([x, y, z], [0, 1, 0]), normal, [0, 0], texture);
      builder.vertices.push(add([x, y, z], [0, 1, 1]), normal, [0, 1], texture);
      builder.vertices.push(add([x, y, z], [1, 1, 1]), normal, [1, 1], texture);
      builder.vertices.push(add([x, y, z], [1, 1, 0]), normal, [1, 0], texture);
    }
  );

  where(
    view
      .ne(0)
      .and(view.slice(":-1,:,:").pad([1, 0, 0], [0, 0, 0]).eq(0))
      .eval(),
    ([z, y, x]) => {
      const offset = builder.vertices.count;
      builder.pushTriangle([offset + 0, offset + 1, offset + 2]);
      builder.pushTriangle([offset + 0, offset + 2, offset + 3]);

      const normal: Coord3 = [0, 0, -1];
      const texture = sampleToTextureIndex(samples.get([z, y, x]), "z_neg");
      builder.vertices.push(add([x, y, z], [1, 0, 0]), normal, [0, 0], texture);
      builder.vertices.push(add([x, y, z], [0, 0, 0]), normal, [1, 0], texture);
      builder.vertices.push(add([x, y, z], [0, 1, 0]), normal, [1, 1], texture);
      builder.vertices.push(add([x, y, z], [1, 1, 0]), normal, [0, 1], texture);
    }
  );

  where(
    view
      .ne(0)
      .and(view.slice("1:,:,:").pad([0, 0, 0], [1, 0, 0]).eq(0))
      .eval(),
    ([z, y, x]) => {
      const offset = builder.vertices.count;
      builder.pushTriangle([offset + 0, offset + 1, offset + 2]);
      builder.pushTriangle([offset + 0, offset + 2, offset + 3]);

      const normal: Coord3 = [0, 0, 1];
      const texture = sampleToTextureIndex(samples.get([z, y, x]), "z_pos");
      builder.vertices.push(add([x, y, z], [0, 0, 1]), normal, [0, 0], texture);
      builder.vertices.push(add([x, y, z], [1, 0, 1]), normal, [1, 0], texture);
      builder.vertices.push(add([x, y, z], [1, 1, 1]), normal, [1, 1], texture);
      builder.vertices.push(add([x, y, z], [0, 1, 1]), normal, [0, 1], texture);
    }
  );

  return builder.build();
}

export function toBlockAtlas(
  index: BlockIndex,
  channel: keyof BlockSample["material"]
) {
  const images = [];
  for (const block of index) {
    for (const sample of block.samples) {
      images.push(sample.material[channel].x_neg);
      images.push(sample.material[channel].x_pos);
      images.push(sample.material[channel].y_neg);
      images.push(sample.material[channel].y_pos);
      images.push(sample.material[channel].z_neg);
      images.push(sample.material[channel].z_pos);
    }
  }
  return toTextureArray(images);
}

export function toBlockSampleTensor(blocks: Array3<"U32">, index: BlockIndex) {
  const ret = fillArray("U32", blocks.shape, 0);

  let offset = 0;
  const view = blocks.view();
  for (const [i, block] of index.entries()) {
    where(view.eq(i + 1).eval(), ([x, y, z]) => {
      const checkerboard = (x + y + z) % 2 ? "white" : "black";
      const sampler = new ReservoirSampler<number>(positionRNG([x, y, z]));
      block.samples.forEach((sample, i) => {
        if (sample.criteria.position === checkerboard) {
          sampler.push(1 + offset + i);
        }
      });
      ret.set([z, y, x], sampler.pop() ?? 0);
    });
    offset += block.samples.length;
  }

  return ret;
}
