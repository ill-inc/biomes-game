import { BikkieRuntime } from "@/shared/bikkie/active";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import assert from "assert";

const ID_A = 1 as BiomesId;
const ID_B = 2 as BiomesId;

describe("BikkieRuntime tests", () => {
  it("should register biscuits", () => {
    const biscuits = new Map<BiomesId, Biscuit>([
      [
        ID_A,
        {
          id: ID_A,
          name: "A",
          isHead: true,
        } as Biscuit,
      ],
      [
        ID_B,
        {
          id: ID_B,
          name: "B",
          displayName: "Bee",
        } as Biscuit,
      ],
    ]);

    const runtime = new BikkieRuntime();
    runtime.registerBiscuits(biscuits);

    assert.deepEqual([...runtime.getBiscuits()], [...biscuits.values()]);
    assert.deepEqual(runtime.getBiscuit(ID_A), biscuits.get(ID_A));
    assert.deepEqual(runtime.getBiscuit(ID_B), biscuits.get(ID_B));
    assert.ok(!!runtime.getBiscuit(INVALID_BIOMES_ID));
    assert.deepEqual(runtime.getBiscuit(undefined), undefined);
    assert.deepEqual(
      [...runtime.getBiscuits(bikkie.schema.head)],
      [biscuits.get(ID_A)]
    );
  });

  it("should re-bind attributes", () => {
    const runtime = new BikkieRuntime();
    runtime.registerBiscuits(
      new Map<BiomesId, Biscuit>([
        [
          ID_A,
          {
            id: ID_A,
            name: "A",
            displayName: "Hello World",
          } as Biscuit,
        ],
      ])
    );

    const biscuit = runtime.getBiscuit(ID_A);
    assert.equal(biscuit.displayName, "Hello World");

    runtime.registerBiscuits(
      new Map<BiomesId, Biscuit>([
        [
          ID_A,
          {
            id: ID_A,
            name: "A",
            displayName: "Goodbye World",
          } as Biscuit,
        ],
      ])
    );

    assert.equal(biscuit.displayName, "Goodbye World");
  });
});
