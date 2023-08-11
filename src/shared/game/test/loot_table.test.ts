import type { BiomesId } from "@/shared/ids";
import assert from "assert";
import type { LootTableEntry } from "@/shared/game/item_specs";
import { countOf, createBag, rollLootTable } from "@/shared/game/items";
import type { GameStatePredicatedValues } from "@/shared/loot_tables/builder";
import { constructGameStatePredicated } from "@/shared/loot_tables/builder";
import type {
  GameStatePredicated,
  GameStateContext,
} from "@/shared/loot_tables/indexing";

import { sampleGameStatePredicated } from "@/shared/loot_tables/indexing";

describe("Loot Tables", () => {
  const rangePredArr: GameStatePredicated<string> = {
    kind: "range",
    entries: [
      {
        predicates: [],
        values: ["always"],
      },
      {
        predicates: [
          {
            kind: "muck",
            min: 0.3,
          },
        ],
        values: ["muck>0.3"],
      },
      {
        predicates: [
          {
            kind: "muck",
            min: 0.3,
            max: 0.4,
          },
        ],
        values: ["muck>0.3, muck<0.4"],
      },
      {
        predicates: [
          {
            kind: "timeOfDay",
            max: 0.3,
          },
        ],
        values: ["timeOfDay<0.3"],
      },
      {
        predicates: [
          { kind: "muck", min: 0.2 },
          {
            kind: "timeOfDay",
            max: 0.3,
          },
        ],
        values: ["muck>0.2, timeOfDay<0.3"],
      },
      {
        predicates: [
          { kind: "muck", min: 0.2 },
          { kind: "timeOfDay", min: 0.3 },
        ],
        values: ["muck>0.2, timeOfDay>0.3"],
      },
    ],
  };

  it("correctly filters range predicates", () => {
    assert.deepEqual(
      sampleGameStatePredicated(rangePredArr, {
        muck: 0.5,
        timeOfDay: 0.5,
      }),
      ["always", "muck>0.3", "muck>0.2, timeOfDay>0.3"],
      "Full context, filter within range"
    );
    assert.deepEqual(
      sampleGameStatePredicated(rangePredArr, {
        muck: 0.2,
      }),
      [
        "always",
        "timeOfDay<0.3",
        "muck>0.2, timeOfDay<0.3",
        "muck>0.2, timeOfDay>0.3",
      ],
      "Partial undefined context should partially filter"
    );
    assert.deepEqual(
      sampleGameStatePredicated(rangePredArr, {}),
      [
        "always",
        "muck>0.3",
        "muck>0.3, muck<0.4",
        "timeOfDay<0.3",
        "muck>0.2, timeOfDay<0.3",
        "muck>0.2, timeOfDay>0.3",
      ],
      "Empty context should not filter"
    );
  });

  it("correctly filters discrete predicates", () => {
    const discreteL1: GameStatePredicated<string> = {
      kind: "discrete",
      predicate: "block",
      map: new Map([
        [0, ["block=0"]],
        [1, ["block=1"]],
        [2, ["block=2"]],
      ]),
      invertedMap: new Map([[0, ["block!=0"]]]),
    };
    assert.deepEqual(
      sampleGameStatePredicated(discreteL1, {
        block: <BiomesId>0,
      }),
      ["block=0"],
      "Single discrete predicate"
    );
    assert.deepEqual(
      sampleGameStatePredicated(discreteL1, {
        block: <BiomesId>1,
      }),
      ["block=1", "block!=0"],
      "Single discrete predicate"
    );
    assert.deepEqual(
      sampleGameStatePredicated(discreteL1, {
        block: <BiomesId>1337,
      }),
      ["block!=0"],
      "Single discrete predicate, null case"
    );
    const discreteL2: GameStatePredicated<string> = {
      kind: "discrete",
      predicate: "block",
      map: new Map([
        [
          0,
          {
            kind: "discrete",
            predicate: "seedBlock",
            map: new Map([
              [false, ["block=0, seedBlock=false"]],
              [true, ["block=0, seedBlock=true"]],
            ]),
          },
        ],
        [
          1,
          {
            kind: "discrete",
            predicate: "seedBlock",
            map: new Map([[false, ["block=1, seedBlock=false"]]]),
          },
        ],
      ]),
    };
    assert.deepEqual(
      sampleGameStatePredicated(discreteL2, {
        block: <BiomesId>1,
        seedBlock: false,
      }),
      ["block=1, seedBlock=false"],
      "Nested discrete predicate"
    );
    assert.deepEqual(
      sampleGameStatePredicated(discreteL2, {
        block: <BiomesId>0,
        seedBlock: true,
      }),
      ["block=0, seedBlock=true"],
      "Nested discrete predicate"
    );
    assert.deepEqual(
      sampleGameStatePredicated(discreteL2, {
        block: <BiomesId>0,
      }),
      ["block=0, seedBlock=false", "block=0, seedBlock=true"],
      "Nested discrete predicate, missing partial context"
    );
    assert.deepEqual(
      sampleGameStatePredicated(discreteL2, {
        block: <BiomesId>1337,
      }),
      [],
      "Nested discrete predicate, null case"
    );
    assert.deepEqual(
      sampleGameStatePredicated(discreteL2, {
        block: <BiomesId>1,
        seedBlock: true,
      }),
      [],
      "Nested discrete predicate, null case"
    );
  });

  it("filters mixed discrete + range predicates", () => {
    const singleComplex: GameStatePredicated<string> = {
      kind: "discrete",
      predicate: "block",
      map: new Map<BiomesId, GameStatePredicated<string>>([
        [<BiomesId>0, ["block=0"]],
        [<BiomesId>1, rangePredArr],
        [<BiomesId>2, ["block=2"]],
      ]),
    };

    const nestedComplex: GameStatePredicated<string> = {
      kind: "discrete",
      predicate: "seedBlock",
      map: new Map<boolean, GameStatePredicated<string>>([
        [false, singleComplex],
        [true, ["seedBlock=true"]],
      ]),
    };

    assert.deepEqual(
      sampleGameStatePredicated(nestedComplex, {
        block: <BiomesId>1,
        muck: 0.5,
        timeOfDay: 0.5,
        seedBlock: false,
      }),
      ["always", "muck>0.3", "muck>0.2, timeOfDay>0.3"],
      "Recurses from nested discrete into range"
    );
    assert.deepEqual(
      sampleGameStatePredicated(nestedComplex, {
        block: <BiomesId>0,
        muck: 0.5,
        timeOfDay: 0.5,
        seedBlock: false,
      }),
      ["block=0"],
      "Recurses from nested discrete into discrete"
    );
    assert.deepEqual(
      sampleGameStatePredicated(nestedComplex, {
        muck: 0.5,
        timeOfDay: 0.5,
        seedBlock: false,
      }),
      ["block=0", "always", "muck>0.3", "muck>0.2, timeOfDay>0.3", "block=2"],
      "Recurses from nested discrete into discrete with range in an undefined context"
    );
    assert.deepEqual(
      sampleGameStatePredicated(nestedComplex, {
        block: <BiomesId>1,
        muck: 0.5,
        timeOfDay: 0.5,
        seedBlock: true,
      }),
      ["seedBlock=true"],
      "Stops at one level of nested discrete"
    );
    assert.deepEqual(
      sampleGameStatePredicated(nestedComplex, {}),
      [
        "block=0",
        "always",
        "muck>0.3",
        "muck>0.3, muck<0.4",
        "timeOfDay<0.3",
        "muck>0.2, timeOfDay<0.3",
        "muck>0.2, timeOfDay>0.3",
        "block=2",
        "seedBlock=true",
      ],
      "Null case: returns entire tree"
    );
  });

  it("correctly constructs predicate trees", () => {
    const tree = constructGameStatePredicated<string>([
      {
        predicates: [
          {
            kind: "block",
            value: <BiomesId>0,
          },
          {
            kind: "muck",
            min: 0.5,
          },
        ],
        value: "block=0, muck>0.5",
      },
      {
        predicates: [
          {
            kind: "block",
            value: <BiomesId>1,
          },
          {
            kind: "muck",
            min: 0.5,
          },
        ],
        values: ["block=1, muck>0.5"],
      },
      {
        predicates: [
          {
            kind: "block",
            value: <BiomesId>0,
          },
          {
            kind: "muck",
            min: 0.5,
            max: 0.6,
          },
        ],
        values: ["block=0, muck>0.5, muck<0.6"],
      },
      {
        predicates: [],
        values: ["always"],
      },
      {
        predicates: [
          {
            kind: "muck",
            min: 0.5,
            max: 0.6,
          },
        ],
        values: ["muck>0.5, muck<0.6"],
      },
      {
        predicates: [
          {
            kind: "block",
            value: <BiomesId>100,
          },
        ],
        values: ["block=100"],
      },
      {
        predicates: [
          {
            kind: "block",
            value: <BiomesId>0,
          },
          {
            kind: "toolDestroyerClass",
            value: 2,
          },
          {
            kind: "muck",
            min: 0.5,
          },
        ],
        values: ["block=0, toolDestroyerClass=2, muck>0.5"],
      },
      {
        predicates: [
          {
            kind: "block",
            value: <BiomesId>0,
          },
          {
            kind: "toolDestroyerClass",
            value: 3,
          },
        ],
        values: ["block=0, toolDestroyerClass=3"],
      },
    ]);
    assert.deepEqual(
      sampleGameStatePredicated(tree, {
        block: <BiomesId>0,
        toolDestroyerClass: 1,
        muck: 0.5,
      }),
      [
        "block=0, muck>0.5",
        "block=0, muck>0.5, muck<0.6",
        "always",
        "muck>0.5, muck<0.6",
      ]
    );
    assert.deepEqual(
      sampleGameStatePredicated(tree, {
        block: <BiomesId>0,
        toolDestroyerClass: 3,
        muck: 0.4,
      }),
      ["block=0, toolDestroyerClass=3", "always"]
    );
    assert.deepEqual(
      sampleGameStatePredicated(tree, { block: <BiomesId>1, muck: 0.5 }),
      ["block=1, muck>0.5", "always", "muck>0.5, muck<0.6"]
    );
    assert.deepEqual(
      sampleGameStatePredicated(tree, { block: <BiomesId>1, muck: 0.4 }),
      ["always"]
    );
    assert.deepEqual(
      sampleGameStatePredicated(tree, { block: <BiomesId>100, muck: 0.5 }),
      ["block=100", "always", "muck>0.5, muck<0.6"]
    );
    //console.log(printGameStatePredicated(tree));
  });

  it("rolls discrete and ranged with the same predicate", () => {
    const lootTableEntries: GameStatePredicatedValues<string>[] = [
      {
        predicates: [
          {
            kind: "block",
            value: <BiomesId>0,
          },
          {
            kind: "muck",
            value: 0,
          },
        ],
        value: "muck=0",
      },
      {
        predicates: [
          {
            kind: "block",
            value: <BiomesId>0,
          },
          {
            kind: "muck",
            min: 0,
            max: 0.5,
          },
        ],
        value: "muck>0, muck<0.5",
      },
      {
        predicates: [
          {
            kind: "block",
            value: <BiomesId>0,
          },
          {
            kind: "muck",
            min: 0.5,
            max: 1,
          },
        ],
        value: "muck>0.5, muck<1",
      },
    ];
    const lootTable = constructGameStatePredicated(lootTableEntries);
    assert.deepEqual(
      sampleGameStatePredicated(lootTable, { block: <BiomesId>0, muck: 0 }),
      ["muck=0", "muck>0, muck<0.5"]
    );
    assert.deepEqual(
      sampleGameStatePredicated(lootTable, { block: <BiomesId>0, muck: 0.25 }),
      ["muck>0, muck<0.5"]
    );
    assert.deepEqual(
      sampleGameStatePredicated(lootTable, { block: <BiomesId>0, muck: 0.5 }),
      ["muck>0, muck<0.5", "muck>0.5, muck<1"]
    );
  });

  it("rolls slotted loot tables", () => {
    const lootTableEntries: GameStatePredicatedValues<LootTableEntry>[] = [
      {
        predicates: [
          {
            kind: "block",
            value: <BiomesId>0,
          },
          {
            kind: "muck",
            min: 0.5,
          },
        ],
        value: {
          value: [
            [<BiomesId>0, 1],
            [<BiomesId>1, 1],
          ],
          probability: 0.4,
        },
      },
      {
        predicates: [
          {
            kind: "block",
            value: <BiomesId>1,
          },
          {
            kind: "muck",
            min: 0.5,
          },
        ],
        value: {
          value: [
            [<BiomesId>2, 2],
            [<BiomesId>3, 2],
          ],
          probability: 0.5,
        },
      },
      {
        predicates: [
          {
            kind: "block",
            value: <BiomesId>0,
          },
          {
            kind: "muck",
            min: 0.7,
          },
        ],
        value: {
          value: [
            [<BiomesId>4, 3],
            [<BiomesId>5, 3],
          ],
          probability: 0.5,
        },
      },
      {
        predicates: [
          {
            kind: "muck",
            min: 0.8,
          },
        ],
        value: {
          value: [[<BiomesId>100, 100]],
          probability: 1,
          slot: "seedBlock",
        },
      },
    ];
    const lootTable = constructGameStatePredicated(lootTableEntries);

    // Roll against single matched predicate
    const ctx1: GameStateContext = {
      block: <BiomesId>0,
      muck: 0.6,
    };
    assert.deepEqual(
      sampleGameStatePredicated(lootTable, ctx1),
      [
        {
          value: [
            [<BiomesId>0, 1],
            [<BiomesId>1, 1],
          ],
          probability: 0.4,
        },
      ],
      "Sample single value"
    );
    assert.deepEqual(
      rollLootTable(lootTable, ctx1),
      createBag(),
      "Should roll empty"
    );

    // Roll against two matched predicates
    const ctx2: GameStateContext = {
      block: <BiomesId>0,
      muck: 0.7,
    };
    assert.deepEqual(
      sampleGameStatePredicated(lootTable, ctx2),
      [
        {
          value: [
            [<BiomesId>0, 1],
            [<BiomesId>1, 1],
          ],
          probability: 0.4,
        },
        {
          value: [
            [<BiomesId>4, 3],
            [<BiomesId>5, 3],
          ],
          probability: 0.5,
        },
      ],
      "Sample two values with different predicates"
    );
    assert.deepEqual(
      rollLootTable(lootTable, ctx2),
      createBag(
        countOf(<BiomesId>4, BigInt(3)),
        countOf(<BiomesId>5, BigInt(3))
      ),
      "Should roll to second item"
    );

    // Roll against 3 matched predicates, one independent
    const ctx3: GameStateContext = {
      block: <BiomesId>0,
      muck: 0.9,
    };
    assert.deepEqual(
      sampleGameStatePredicated(lootTable, ctx3),
      [
        {
          value: [
            [<BiomesId>0, 1],
            [<BiomesId>1, 1],
          ],
          probability: 0.4,
        },
        {
          value: [
            [<BiomesId>4, 3],
            [<BiomesId>5, 3],
          ],
          probability: 0.5,
        },
        {
          value: [[<BiomesId>100, 100]],
          probability: 1,
          slot: "seedBlock",
        },
      ],
      "Sample 3 values with different predicates"
    );
    assert.deepEqual(
      rollLootTable(lootTable, ctx3),
      createBag(
        countOf(<BiomesId>100, BigInt(100)),
        countOf(<BiomesId>4, BigInt(3)),
        countOf(<BiomesId>5, BigInt(3))
      ),
      "Should roll to second item and independently add third item"
    );
  });

  it("executes derived predicates", () => {
    const derivedTree = constructGameStatePredicated([
      {
        predicates: [{ kind: "inMuck" }, { kind: "block", value: <BiomesId>0 }],
        value: "inMuck",
      },
      {
        predicates: [
          {
            kind: "position",
            bounds: [
              [-100, 0, 100],
              [-90, 10, 90],
            ],
          },
        ],
        value: "position",
      },
      {
        predicates: [{ kind: "muck", min: 0, max: 1 }],
        value: "muck>0, muck<1",
      },
    ]);

    assert.deepEqual(
      sampleGameStatePredicated(derivedTree, {
        block: <BiomesId>0,
        muck: 11,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
      }),
      ["inMuck"],
      "Should match inMuck"
    );
    assert.deepEqual(
      sampleGameStatePredicated(derivedTree, {
        block: <BiomesId>0,
        muck: 0,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
      }),
      ["muck>0, muck<1"],
      "Should only match muck range"
    );
    assert.deepEqual(
      sampleGameStatePredicated(derivedTree, {
        block: <BiomesId>0,
        muck: 0,
        positionX: -95,
        positionY: 5,
        positionZ: 95,
      }),
      ["position", "muck>0, muck<1"],
      "Should match position and muck range"
    );
  });
});
