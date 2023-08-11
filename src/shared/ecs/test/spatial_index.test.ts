import { SpatialIndex } from "@/shared/ecs/spatial/spatial_index";
import { SHARD_DIM, shardEncode } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { length } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import assert from "assert";

function makeIdGenerator() {
  let nextBiomesId = 1;
  return () => nextBiomesId++ as BiomesId;
}

function spatialIndexWith(positions: { p: Vec3; s?: Vec3 }[]) {
  const index = new SpatialIndex();
  const idGen = makeIdGenerator();
  for (const position of positions) {
    index.update(
      {
        id: idGen(),
        position: { v: position.p },
        ...(position.s ? { size: { v: position.s } } : {}),
      },
      undefined
    );
  }

  // Add a bunch of dummy points to avoid the SpatialIndex fast-path for when
  // there are a low number of points.
  for (let i = 0; i < 500; ++i) {
    index.update(
      { id: idGen(), position: { v: [20000, 20000, 20000] } },
      undefined
    );
  }

  return index;
}

function assertSetsEqual<T>(a: T[], b: T[]) {
  assert.deepEqual(new Set(a), new Set(b));
}

describe("SpatialIndex", () => {
  it("simple single point", () => {
    const index = spatialIndexWith([{ p: [0, 0, 2] }]);

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 1 })),
      []
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 2 })),
      [1]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 3 })),
      [1]
    );
  });
  it("simple multiple points", () => {
    const index = spatialIndexWith([
      { p: [0, 0, 2] },
      { p: [0, 0, 3] },
      { p: [0, 0, 4] },
    ]);

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 1 })),
      []
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 2 })),
      [1]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 3 })),
      [1, 2]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 4 })),
      [1, 2, 3]
    );
  });

  it("simple multiple points with aabb scan", () => {
    const index = spatialIndexWith([
      { p: [0, 0, 2] },
      { p: [0, 0, 3] },
      { p: [0, 0, 4] },
      { p: [0, 0, -5] },
    ]);

    assertSetsEqual(
      Array.from(
        index.scanAabb([
          [-1, -1, -1],
          [1, 1, 1],
        ])
      ),
      []
    );
    assertSetsEqual(
      Array.from(
        index.scanAabb([
          [-2, -2, -2],
          [2, 2, 2],
        ])
      ),
      []
    );
    assertSetsEqual(
      Array.from(
        index.scanAabb([
          [-3, -3, -3],
          [3, 3, 3],
        ])
      ),
      [1]
    );
    assertSetsEqual(
      Array.from(
        index.scanAabb([
          [-4, -4, -4],
          [4, 4, 4],
        ])
      ),
      [1, 2]
    );
    assertSetsEqual(
      Array.from(
        index.scanAabb([
          [-4, -4, -4],
          [4, 4, 4.0001],
        ])
      ),
      [1, 2, 3]
    );
    assertSetsEqual(
      Array.from(
        index.scanAabb([
          [-5, -5, -5],
          [5, 5, 5],
        ])
      ),
      [1, 2, 3, 4]
    );
  });

  it("cross shard", () => {
    const index = spatialIndexWith([
      { p: [0, 0, 34] },
      { p: [0, 0, 65] },
      { p: [97, 0, 0] },
    ]);

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 33 })),
      []
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 34 })),
      [1]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 65 })),
      [1, 2]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 97 })),
      [1, 2, 3]
    );
  });

  it("diagonal across shard", () => {
    const index = spatialIndexWith([{ p: [33, 33, 33] }]);

    assertSetsEqual(
      Array.from(
        index.scanSphere({
          center: [31, 31, 31],
          radius: length([2, 2, 2]) - 0.1,
        })
      ),
      []
    );
    assertSetsEqual(
      Array.from(
        index.scanSphere({
          center: [31, 31, 31],
          radius: length([2, 2, 2]) + 0.1,
        })
      ),
      [1]
    );
    assertSetsEqual(
      Array.from(
        index.scanSphere({
          center: [34, 34, 34],
          radius: length([1, 1, 1]) + 0.1,
        })
      ),
      [1]
    );
    assertSetsEqual(
      Array.from(
        index.scanSphere({
          center: [34, 34, 34],
          radius: length([1, 1, 1]) - 0.1,
        })
      ),
      []
    );
    assertSetsEqual(
      Array.from(
        index.scanSphere({
          center: [0, 0, 0],
          radius: length([33, 33, 33]) - 0.5,
        })
      ),
      []
    );
    assertSetsEqual(
      Array.from(
        index.scanSphere({
          center: [0, 0, 0],
          radius: length([33, 33, 33]) + 0.5,
        })
      ),
      [1]
    );
  });
  it("diagonal across multiple shards", () => {
    const index = spatialIndexWith([{ p: [65, 65, 65] }]);

    assertSetsEqual(
      Array.from(
        index.scanSphere({
          center: [31, 31, 31],
          radius: length([34, 34, 34]) - 0.1,
        })
      ),
      []
    );
    assertSetsEqual(
      Array.from(
        index.scanSphere({
          center: [31, 31, 31],
          radius: length([34, 34, 34]) + 0.1,
        })
      ),
      [1]
    );
    assertSetsEqual(
      Array.from(
        index.scanSphere({
          center: [66, 66, 66],
          radius: length([1, 1, 1]) + 0.1,
        })
      ),
      [1]
    );
    assertSetsEqual(
      Array.from(
        index.scanSphere({
          center: [66, 66, 66],
          radius: length([1, 1, 1]) - 0.1,
        })
      ),
      []
    );
    assertSetsEqual(
      Array.from(
        index.scanSphere({
          center: [0, 0, 0],
          radius: length([65, 65, 65]) - 0.5,
        })
      ),
      []
    );
    assertSetsEqual(
      Array.from(
        index.scanSphere({
          center: [0, 0, 0],
          radius: length([65, 65, 65]) + 0.5,
        })
      ),
      [1]
    );
  });
  it("can handle aabb entries and query on them", () => {
    const index = spatialIndexWith([
      { p: [0, 0, 2] },
      { p: [0, 0, 3] },
      { p: [0, 0, 4] },
      { p: [0, 0, 5], s: [1, 1, 2] },
    ]);

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 1 })),
      []
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 2 })),
      [1]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 3 })),
      [1, 2]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 4 })),
      [1, 2, 3, 4]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 5 })),
      [1, 2, 3, 4]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 6 })),
      [1, 2, 3, 4]
    );

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 8], radius: 3 })),
      [4]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 8], radius: 2 })),
      [4]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 8], radius: 1 })),
      []
    );

    // Scan entirely within the AABB works.
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 5], radius: 0.1 })),
      [4]
    );
  });
  it("aabb entries update properly", () => {
    const index = spatialIndexWith([{ p: [0, -0.5, 0], s: [1, 1, 1] }]);

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 1 })),
      [1]
    );

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 1], radius: 0.5 })),
      [1]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 1.5], radius: 0.5 })),
      []
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, -1], radius: 0.5 })),
      [1]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, -1.5], radius: 0.5 })),
      []
    );

    index.update(
      {
        id: 1 as BiomesId,
        position: { v: [0, -0.5, 1] },
        size: { v: [1, 1, 1] },
      },
      undefined
    );

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 1 })),
      [1]
    );

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 1], radius: 0.5 })),
      [1]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 1.5], radius: 0.5 })),
      [1]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, -1], radius: 0.5 })),
      []
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, -1.5], radius: 0.5 })),
      []
    );

    // Move it over to the other side now and check that we see the updates.
    index.update(
      {
        id: 1 as BiomesId,
        position: { v: [0, 0.5, -1] },
        size: { v: [1, 1, 1] },
      },
      undefined
    );

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 1 })),
      [1]
    );

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 1], radius: 0.5 })),
      []
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 1.5], radius: 0.5 })),
      []
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, -1], radius: 0.5 })),
      [1]
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, -1.5], radius: 0.5 })),
      [1]
    );

    // And we shouldn't be able to find it anywhere after we delete it.
    index.delete(1 as BiomesId);

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 0], radius: 1 })),
      []
    );

    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 1], radius: 0.5 })),
      []
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, 1.5], radius: 0.5 })),
      []
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, -1], radius: 0.5 })),
      []
    );
    assertSetsEqual(
      Array.from(index.scanSphere({ center: [0, 0, -1.5], radius: 0.5 })),
      []
    );
  });
  it("shard-aligned bounding boxes only occupy one cell", () => {
    const index = spatialIndexWith([
      { p: [16, 0, 16], s: [SHARD_DIM, SHARD_DIM, SHARD_DIM] },
      { p: [48, 32, 48], s: [SHARD_DIM, SHARD_DIM, SHARD_DIM] },
      { p: [-16, -32, -16], s: [SHARD_DIM, SHARD_DIM, SHARD_DIM] },
    ]);

    assertSetsEqual(index.getKeys(1 as BiomesId), [shardEncode(0, 0, 0)]);
    assertSetsEqual(index.getKeys(2 as BiomesId), [shardEncode(1, 1, 1)]);
    assertSetsEqual(index.getKeys(3 as BiomesId), [shardEncode(-1, -1, -1)]);
  });
  it("point queries work", () => {
    const index = spatialIndexWith([
      { p: [0, 16, 0], s: [SHARD_DIM, SHARD_DIM, SHARD_DIM] },
      { p: [0, 17, 0] },
      { p: [0, 0, 0], s: [SHARD_DIM, SHARD_DIM, SHARD_DIM] },
    ]);

    // Test index.scanPoint.
    assertSetsEqual(Array.from(index.scanPoint([0, 16.5, 0])), [1, 3]);
    assertSetsEqual(Array.from(index.scanPoint([0, 17, 0])), [1, 2, 3]);
    assertSetsEqual(Array.from(index.scanPoint([0, 33, 0])), [1]);
    assertSetsEqual(Array.from(index.scanPoint([0, 50, 0])), []);
    assertSetsEqual(Array.from(index.scanPoint([0, 1, 0])), [3]);
  });
});
