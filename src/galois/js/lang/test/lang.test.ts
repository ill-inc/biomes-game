import { assert, use } from "chai";
import * as chaiSubset from "chai-subset";
import * as l from "..";

use(chaiSubset.default);

describe("Test asset language types", () => {
  it("should support nulls", () => {
    assert.include(l.toNull(null), {
      type: "Null",
      kind: "Null",
      data: 0,
    });
  });

  it("should support strings", () => {
    assert.include(l.toStr("hello"), {
      type: "Str",
      kind: "Str",
      data: "hello",
    });
  });

  it("should support bools", () => {
    assert.include(l.toBool(true), {
      type: "Bool",
      kind: "Bool",
      data: true,
    });
  });

  it("should support numbers", () => {
    assert.include(l.toI32(123123), {
      type: "I32",
      kind: "I32",
      data: 123123,
    });

    assert.include(l.toF64(123.123), {
      type: "F64",
      kind: "F64",
      data: 123.123,
    });

    assert.include(l.toU64("2305843009213693952"), {
      type: "U64",
      kind: "U64",
      data: "2305843009213693952",
    });
  });

  it("should support unions and literals", () => {
    assert.include(l.toDir("x_neg"), {
      kind: "Literal",
      data: "x_neg",
    });
  });
});

describe("Test asset language routines", () => {
  it("should bridge typescript arguments", () => {
    assert.containSubset(l.ImageRGB("some/pretend/file.png"), {
      type: "Texture",
      kind: "ImageRGB_PNGFile",
      deps: [
        {
          kind: "Str",
          type: "PNGFile",
          data: "some/pretend/file.png",
        },
      ],
    });
  });

  it("should support derived node arguments", () => {
    assert.containSubset(l.ImageRGB(l.toPNGFile("some/pretend/file.png")), {
      type: "Texture",
      kind: "ImageRGB_PNGFile",
      deps: [
        {
          kind: "Str",
          type: "PNGFile",
          data: "some/pretend/file.png",
        },
      ],
    });
  });

  it("should support nested routines", () => {
    const sideGrass = l.ImageRGB("textures/grass_side.png");
    const topGrass = l.ImageRGB("textures/grass_top.png");
    const bottomGrass = l.ImageRGB("textures/grass_bottom.png");
    const mrea = l.ImageRGB("textures/shared/default_mrea.png");

    assert.containSubset(
      l.ToBlockSampleTexture(
        l.ToCubeTexture(sideGrass, topGrass, bottomGrass),
        l.ToCubeTexture(mrea, mrea, mrea)
      ),
      {
        type: "BlockSampleTexture",
        kind: "ToBlockSampleTexture_CubeTexture_CubeTexture",
        deps: [
          {
            deps: [
              {
                deps: [
                  {
                    kind: "Str",
                    type: "PNGFile",
                    data: "textures/grass_side.png",
                  },
                ],
                type: "Texture",
                kind: "ImageRGB_PNGFile",
              },
            ],
          },
          {
            deps: [
              {
                deps: [
                  {
                    kind: "Str",
                    type: "PNGFile",
                    data: "textures/grass_top.png",
                  },
                ],
                type: "Texture",
                kind: "ImageRGB_PNGFile",
              },
            ],
          },
          {
            deps: [
              {
                deps: [
                  {
                    kind: "Str",
                    type: "PNGFile",
                    data: "textures/grass_bottom.png",
                  },
                ],
                type: "Texture",
                kind: "ImageRGB_PNGFile",
              },
            ],
          },
          {
            deps: [
              {
                deps: [
                  {
                    kind: "Str",
                    type: "PNGFile",
                    data: "textures/shared/default_mrea.png",
                  },
                ],
                type: "Texture",
                kind: "ImageRGB_PNGFile",
              },
            ],
          },
        ],
      }
    );
  });
});

describe("Test asset language merkel tree hashing", () => {
  it("should consistently hash same trees", () => {
    const mrea = l.ImageRGB("textures/shared/default_mrea.png");
    const node1 = l.ToBlockSampleTexture(
      l.ToCubeTexture(
        l.ImageRGB("textures/grass_side.png"),
        l.ImageRGB("textures/grass_top.png"),
        l.ImageRGB("textures/grass_bottom.png")
      ),
      l.ToCubeTexture(mrea, mrea, mrea)
    );

    const node2 = l.ToBlockSampleTexture(
      l.ToCubeTexture(
        l.ImageRGB("textures/grass_side.png"),
        l.ImageRGB("textures/grass_top.png"),
        l.ImageRGB("textures/grass_bottom.png")
      ),
      l.ToCubeTexture(mrea, mrea, mrea)
    );

    assert.equal(node1.hash, node2.hash);
  });
});

describe("Test asset language serialization", () => {
  it("should support program linearization", () => {
    const mrea = l.ImageRGB("textures/shared/default_mrea.png");
    assert.deepStrictEqual(
      l.toProgram(
        l.ToBlockSampleTexture(
          l.ToCubeTexture(
            l.ImageRGB("textures/grass_side.png"),
            l.ImageRGB("textures/grass_top.png"),
            l.ImageRGB("textures/grass_bottom.png")
          ),
          l.ToCubeTexture(mrea, mrea, mrea)
        )
      ),
      [
        {
          node: "literal",
          kind: "Str",
          type: "PNGFile",
          data: "textures/grass_side.png",
        },
        {
          node: "derived",
          kind: "ImageRGB_PNGFile",
          type: "Texture",
          deps: [0],
        },
        {
          node: "literal",
          kind: "Str",
          type: "PNGFile",
          data: "textures/grass_top.png",
        },
        {
          node: "derived",
          kind: "ImageRGB_PNGFile",
          type: "Texture",
          deps: [2],
        },
        {
          node: "literal",
          kind: "Str",
          type: "PNGFile",
          data: "textures/grass_bottom.png",
        },
        {
          node: "derived",
          kind: "ImageRGB_PNGFile",
          type: "Texture",
          deps: [4],
        },
        {
          node: "derived",
          kind: "ToCubeTexture_Texture_Texture_Texture",
          type: "CubeTexture",
          deps: [1, 3, 5],
        },
        {
          node: "literal",
          kind: "Str",
          type: "PNGFile",
          data: "textures/shared/default_mrea.png",
        },
        {
          node: "derived",
          kind: "ImageRGB_PNGFile",
          type: "Texture",
          deps: [7],
        },
        {
          node: "derived",
          kind: "ToCubeTexture_Texture_Texture_Texture",
          type: "CubeTexture",
          deps: [8, 8, 8],
        },
        {
          node: "derived",
          kind: "ToBlockSampleTexture_CubeTexture_CubeTexture",
          type: "BlockSampleTexture",
          deps: [6, 9],
        },
      ]
    );
  });

  it("should be able to distinguish lists", () => {
    assert(!l.isPointList({ a: 1 }));
    assert(l.isPointList([]));
  });

  it("should serialize and deserialize correctly", () => {
    const mrea = l.ImageRGB("textures/shared/default_mrea.png");
    assert.deepStrictEqual(
      JSON.parse(
        l.serialize(
          l.ToBlockSampleTexture(
            l.ToCubeTexture(
              l.ImageRGB("textures/grass_side.png"),
              l.ImageRGB("textures/grass_top.png"),
              l.ImageRGB("textures/grass_bottom.png")
            ),
            l.ToCubeTexture(mrea, mrea, mrea)
          )
        )
      ),
      [
        {
          node: "literal",
          kind: "Str",
          type: "PNGFile",
          data: "textures/grass_side.png",
        },
        {
          node: "derived",
          kind: "ImageRGB_PNGFile",
          type: "Texture",
          deps: [0],
        },
        {
          node: "literal",
          kind: "Str",
          type: "PNGFile",
          data: "textures/grass_top.png",
        },
        {
          node: "derived",
          kind: "ImageRGB_PNGFile",
          type: "Texture",
          deps: [2],
        },
        {
          node: "literal",
          kind: "Str",
          type: "PNGFile",
          data: "textures/grass_bottom.png",
        },
        {
          node: "derived",
          kind: "ImageRGB_PNGFile",
          type: "Texture",
          deps: [4],
        },
        {
          node: "derived",
          kind: "ToCubeTexture_Texture_Texture_Texture",
          type: "CubeTexture",
          deps: [1, 3, 5],
        },
        {
          node: "literal",
          kind: "Str",
          type: "PNGFile",
          data: "textures/shared/default_mrea.png",
        },
        {
          node: "derived",
          kind: "ImageRGB_PNGFile",
          type: "Texture",
          deps: [7],
        },
        {
          node: "derived",
          kind: "ToCubeTexture_Texture_Texture_Texture",
          type: "CubeTexture",
          deps: [8, 8, 8],
        },
        {
          node: "derived",
          kind: "ToBlockSampleTexture_CubeTexture_CubeTexture",
          type: "BlockSampleTexture",
          deps: [6, 9],
        },
      ]
    );
  });

  it("should materialize recursive definitions correctly", () => {
    assert.containSubset(
      JSON.parse(
        l.serialize(
          l.toSkeleton([
            "root",
            [l.toSkeleton(["child_a", []]), ["child_b", []]],
          ])
        )
      ),
      [
        {
          node: "literal",
          kind: "Str",
          data: "root",
        },
        {
          node: "literal",
          kind: "Str",
          data: "child_a",
        },
        {
          deps: [],
          kind: "List",
          node: "derived",
        },
        {
          deps: [1, 2],
          kind: "Tuple",
          node: "derived",
        },
        {
          node: "literal",
          kind: "Str",
          data: "child_b",
        },
        {
          deps: [4, 2],
          kind: "Tuple",
          node: "derived",
        },
        {
          deps: [3, 5],
          kind: "List",
          node: "derived",
        },
        {
          deps: [0, 6],
          kind: "Tuple",
          node: "derived",
        },
      ]
    );
  });
});

describe("Test asset language parsing", () => {
  it("test access routine", () => {
    const mrea = l.ImageRGB("textures/shared/default_mrea.png");
    const colorCube = l.ToCubeTexture(
      l.ImageRGB("textures/grass_side.png"),
      l.ImageRGB("textures/grass_top.png"),
      l.ImageRGB("textures/grass_bottom.png")
    );
    const mreaCube = l.ToCubeTexture(mrea, mrea, mrea);
    const material = l.ToBlockSampleTexture(colorCube, mreaCube);

    const nodes: l.Asset[] = [];
    l.access(material, (node) => nodes.push(node));

    assert.strictEqual(nodes.length, 11);
    assert.deepStrictEqual(nodes[0], l.toPNGFile("textures/grass_side.png"));
    assert.deepStrictEqual(nodes[1], l.ImageRGB("textures/grass_side.png"));
    assert.deepStrictEqual(nodes[2], l.toPNGFile("textures/grass_top.png"));
    assert.deepStrictEqual(nodes[3], l.ImageRGB("textures/grass_top.png"));
    assert.deepStrictEqual(nodes[4], l.toPNGFile("textures/grass_bottom.png"));
    assert.deepStrictEqual(nodes[5], l.ImageRGB("textures/grass_bottom.png"));
    assert.deepStrictEqual(nodes[6], colorCube);
    assert.deepStrictEqual(
      nodes[7],
      l.toPNGFile("textures/shared/default_mrea.png")
    );
    assert.deepStrictEqual(
      nodes[8],
      l.ImageRGB("textures/shared/default_mrea.png")
    );
    assert.deepStrictEqual(nodes[9], mreaCube);
    assert.deepStrictEqual(nodes[10], material);
  });

  it("test access by type routine", () => {
    const mrea = l.ImageRGB("textures/shared/default_mrea.png");
    const material = l.ToBlockSampleTexture(
      l.ToCubeTexture(
        l.ImageRGB("textures/grass_side.png"),
        l.ImageRGB("textures/grass_top.png"),
        l.ImageRGB("textures/grass_bottom.png")
      ),
      l.ToCubeTexture(mrea, mrea, mrea)
    );

    const nodes: l.Asset[] = [];
    l.accessByType(material, "Texture", (node) => nodes.push(node));

    assert.strictEqual(nodes.length, 4);
    assert.deepStrictEqual(nodes[0], l.ImageRGB("textures/grass_side.png"));
    assert.deepStrictEqual(nodes[1], l.ImageRGB("textures/grass_top.png"));
    assert.deepStrictEqual(nodes[2], l.ImageRGB("textures/grass_bottom.png"));
    assert.deepStrictEqual(
      nodes[3],
      l.ImageRGB("textures/shared/default_mrea.png")
    );
  });

  it("test modify routine", () => {
    const mrea = l.ImageRGB("textures/shared/default_mrea.png");
    const colorCube = l.ToCubeTexture(
      l.ImageRGB("textures/grass_side.png"),
      l.ImageRGB("textures/grass_top.png"),
      l.ImageRGB("textures/grass_bottom.png")
    );
    const mreaCube = l.ToCubeTexture(mrea, mrea, mrea);
    const nodes = l.toArray(
      l.modify(l.ToBlockSampleTexture(colorCube, mreaCube), (node) => {
        if (l.isPNGFile(node)) {
          return l.toPNGFile(
            `foo${(node as any).data.substring("textures".length)}`
          );
        }
      })
    );

    assert.strictEqual(nodes.length, 11);
    assert.deepStrictEqual(nodes[0], l.toPNGFile("foo/grass_side.png"));
    assert.deepStrictEqual(nodes[1], l.ImageRGB("foo/grass_side.png"));
    assert.deepStrictEqual(nodes[2], l.toPNGFile("foo/grass_top.png"));
    assert.deepStrictEqual(nodes[3], l.ImageRGB("foo/grass_top.png"));
    assert.deepStrictEqual(nodes[4], l.toPNGFile("foo/grass_bottom.png"));
    assert.deepStrictEqual(nodes[5], l.ImageRGB("foo/grass_bottom.png"));
    assert.deepStrictEqual(
      nodes[6],
      l.ToCubeTexture(
        l.ImageRGB("foo/grass_side.png"),
        l.ImageRGB("foo/grass_top.png"),
        l.ImageRGB("foo/grass_bottom.png")
      )
    );
    assert.deepStrictEqual(
      nodes[7],
      l.toPNGFile("foo/shared/default_mrea.png")
    );
    const fooMrea = l.ImageRGB("foo/shared/default_mrea.png");
    assert.deepStrictEqual(nodes[8], l.ImageRGB("foo/shared/default_mrea.png"));
    assert.deepStrictEqual(
      nodes[9],
      l.ToCubeTexture(fooMrea, fooMrea, fooMrea)
    );
    assert.deepStrictEqual(
      nodes[10],
      l.ToBlockSampleTexture(
        l.ToCubeTexture(
          l.ImageRGB("foo/grass_side.png"),
          l.ImageRGB("foo/grass_top.png"),
          l.ImageRGB("foo/grass_bottom.png")
        ),
        l.ToCubeTexture(fooMrea, fooMrea, fooMrea)
      )
    );
  });

  it("test modifyByType routine", () => {
    const mrea = l.ImageRGB("textures/shared/default_mrea.png");
    const nodes = l.toArray(
      l.modifyByType(
        l.ToBlockSampleTexture(
          l.ToCubeTexture(
            l.ImageRGB("textures/grass_side.png"),
            l.ImageRGB("textures/grass_top.png"),
            l.ImageRGB("textures/grass_bottom.png")
          ),
          l.ToCubeTexture(mrea, mrea, mrea)
        ),
        "PNGFile",
        (node) => {
          return l.toPNGFile(
            `foo${(node as any).data.substring("textures".length)}`
          );
        }
      )
    );

    assert.strictEqual(nodes.length, 11);
    assert.deepStrictEqual(nodes[0], l.toPNGFile("foo/grass_side.png"));
    assert.deepStrictEqual(nodes[1], l.ImageRGB("foo/grass_side.png"));
    assert.deepStrictEqual(nodes[2], l.toPNGFile("foo/grass_top.png"));
    assert.deepStrictEqual(nodes[3], l.ImageRGB("foo/grass_top.png"));
    assert.deepStrictEqual(nodes[4], l.toPNGFile("foo/grass_bottom.png"));
    assert.deepStrictEqual(nodes[5], l.ImageRGB("foo/grass_bottom.png"));
    assert.deepStrictEqual(
      nodes[6],
      l.ToCubeTexture(
        l.ImageRGB("foo/grass_side.png"),
        l.ImageRGB("foo/grass_top.png"),
        l.ImageRGB("foo/grass_bottom.png")
      )
    );
    assert.deepStrictEqual(
      nodes[7],
      l.toPNGFile("foo/shared/default_mrea.png")
    );
    assert.deepStrictEqual(nodes[8], l.ImageRGB("foo/shared/default_mrea.png"));
    const fooMrea = l.ImageRGB("foo/shared/default_mrea.png");
    assert.deepStrictEqual(
      nodes[9],
      l.ToCubeTexture(fooMrea, fooMrea, fooMrea)
    );
    assert.deepStrictEqual(
      nodes[10],
      l.ToBlockSampleTexture(
        l.ToCubeTexture(
          l.ImageRGB("foo/grass_side.png"),
          l.ImageRGB("foo/grass_top.png"),
          l.ImageRGB("foo/grass_bottom.png")
        ),
        l.ToCubeTexture(fooMrea, fooMrea, fooMrea)
      )
    );
  });
});

describe("Test deserializing a program back to a node", () => {
  it("test fromProgram routine", () => {
    const mrea = l.ImageRGB("textures/shared/default_mrea.png");
    assert.deepStrictEqual(
      l.fromProgram(
        l.toProgram(
          l.ToBlockSampleTexture(
            l.ToCubeTexture(
              l.ImageRGB("textures/grass_side.png"),
              l.ImageRGB("textures/grass_top.png"),
              l.ImageRGB("textures/grass_bottom.png")
            ),
            l.ToCubeTexture(mrea, mrea, mrea)
          )
        )
      ),
      l.ToBlockSampleTexture(
        l.ToCubeTexture(
          l.ImageRGB("textures/grass_side.png"),
          l.ImageRGB("textures/grass_top.png"),
          l.ImageRGB("textures/grass_bottom.png")
        ),
        l.ToCubeTexture(mrea, mrea, mrea)
      )
    );
  });
});
